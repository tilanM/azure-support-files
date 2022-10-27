import Joi from "joi";
import iothub from "azure-iothub";

import requestMiddleware from "../middleware/request.mjs";
import {
  getSerialNumber,
  getCertificate,
  getThumbprint,
  isValidExpiration,
} from "../helpers/crypto.mjs";
import { baseTopic, compatibilityVersion } from "../vars.mjs";

// https://learn.microsoft.com/en-us/azure/iot-hub/troubleshoot-error-codes#409001
const codeAlreadyExists = 409001;

const postInteropSchema = Joi.object().keys({
  action: Joi.string().valid("status", "provision", "message", "info").required(),
  certs: Joi.when("action", {
    is: "provision",
    then: Joi.array().items(
      Joi.object().keys({
        ref: Joi.string().required(),
        cert: Joi.string().base64().required(),
      })
    ),
  }),
});

async function post(req, res, next) {
  const { action } = req.body;
  let resp;

  switch (action) {
    case "provision": {
      const { certs } = req.body;

      resp = await provision(certs);
      break;
    }
    case "message": {
      resp = await message();
      break;
    }
    case "status": {
      resp = await status();
      break;
    }
    case "info": {
      resp = await info();
      break;
    }
  }

  res.send(resp);
}

async function info(){
  return {
    action:"info",
    compatibilityVersion
  }
}

async function status() {
  return {
    message: "Not yet implemented.",
    action: "status",
  };
}

async function message() {
  return {
    message: "Not yet implemented.",
    action: "message",
  };
}

async function provision(certs) {
  const registry = iothub.Registry.fromConnectionString(process.env.IOT_CONN);

  let resp = [];
  let endpoint;

  try {
    endpoint = iothub.ConnectionString.parse(process.env.IOT_CONN).HostName;
  } catch (err) {
    endpoint = null;
  }

  const policy = true;

  let deviceDetails = [];
  let deviceRefMap = new Map();
  let resMap = new Map();

  for (const item of certs) {
    let certBuf;
    let cert;
    let serialNumber;
    let thumbprint;

    try {
      certBuf = Buffer.from(item.cert, "base64");
      cert = await getCertificate(certBuf);
    } catch (err) {
      resMap.set(item.ref, {
        ref: item.ref,
        status: "ERROR",
        message: "Cannot decode certitifcate",
      });
      continue;
    }

    try {
      serialNumber = await getSerialNumber(cert);
    } catch (err) {
      resMap.set(item.ref, {
        ref: item.ref,
        status: "ERROR",
        message:
          "Certificate serial cannot be decoded or is incorrect (only alphanumeric/hyphen/underscore)",
      });
      continue;
    }

    try {
      const isValid = await isValidExpiration(cert);

      if (!isValid) {
        resMap.set(item.ref, {
          ref: item.ref,
          status: "ERROR",
          message: "Certificate notBefore or notAfter is out of range",
        });
        continue;
      }
    } catch (err) {
      resMap.set(item.ref, {
        ref: item.ref,
        status: "ERROR",
        message: "Certificate expiration cannot be decoded",
      });
      continue;
    }

    try {
      thumbprint = await getThumbprint(cert);

      deviceRefMap.set(serialNumber, item.ref);
      deviceDetails.push({
        deviceId: serialNumber,
        status: "enabled",
        authentication: {
          x509Thumbprint: {
            primaryThumbprint: thumbprint,
            secondaryThumbprint: thumbprint,
          },
        },
      });
    } catch (err) {
      resMap.set(item.ref, {
        ref: item.ref,
        status: "ERROR",
        message: "Cannot get thumbprint",
      });

      continue;
    }
  }

  while (deviceDetails.length > 0) {
    let batch = deviceDetails.splice(0, 100);
    let resAdd;
    try {
      resAdd = await registry.addDevices(batch);
    } catch (err) {
      let body;
      try {
        body = JSON.parse(err?.responseBody);
      } catch (err) {
        body = null;
      }
      resAdd = body;
    }

    if (resAdd) {
      if (resAdd?.errors?.length > 0) {
        for (const row of resAdd.errors) {
          if (row.errorCode == codeAlreadyExists) continue;
          const ref = deviceRefMap.get(row.deviceId);
          resMap.set(ref, {
            ref: ref,
            status: "ERROR",
            message: "Failed creating and registering thing",
          });
        }
      }

      for (const row of batch) {
        const ref = deviceRefMap.get(row.deviceId);
        if (!resMap.has(ref)) {
          resMap.set(ref, {
            ref: ref,
            status: "SUCCESS",
            endpoint: endpoint,
            topic: baseTopic,
            policyApplied: policy,
          });
        }
      }
    } else {
      for (const row of batch) {
        const ref = deviceRefMap.get(row.deviceId);
        resMap.set(ref, {
          ref: ref,
          status: "ERROR",
          message: "Failed creating and registering thing",
        });
      }
    }
  }

  if (resMap.size > 0) resp = Array.from(resMap.values());

  return resp;
}

export default requestMiddleware(post, {
  validation: { body: postInteropSchema },
});
