import Joi from "joi";
import iothub from "azure-iothub";
import iotcommon from "azure-iot-common";

import requestMiddleware from "../middleware/request.mjs";
import {
  getSerialNumber,
  getCertificate,
  getThumbprint,
  isValidExpiration,
} from "../helpers/crypto.mjs";
import { baseTopic } from "../vars.mjs";

const postInteropSchema = Joi.object().keys({
  action: Joi.string().valid("status", "provision", "message").required(),
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
  }

  res.send(resp);
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

  for (const item of certs) {
    let certBuf;
    let cert;
    let serialNumber;
    let thumbprint;

    try {
      certBuf = Buffer.from(item.cert, "base64");
      cert = await getCertificate(certBuf);
    } catch (err) {
      resp.push({
        ref: item.ref,
        status: "ERROR",
        message: "Cannot decode certitifcate",
      });
      continue;
    }

    try {
      serialNumber = await getSerialNumber(cert);
    } catch (err) {
      console.log("errserial:", err);
      resp.push({
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
        resp.push({
          ref: item.ref,
          status: "ERROR",
          message: "Certificate notBefore or notAfter is out of range",
        });
        continue;
      }
    } catch (err) {
      console.log("errexpiration:", err);
      resp.push({
        ref: item.ref,
        status: "ERROR",
        message: "Certificate expiration cannot be decoded",
      });
      continue;
    }

    // try{
    //   const getDevInfo = util.promisify(registry.get);
    //   const a = await getDevInfo(serialNumber);
    //   console.log('e1', a);
    // }
    // catch(err)
    // {
    //   console.log('e2', err);
    // }

    try {
      thumbprint = await getThumbprint(cert);
      await registry.create({
        deviceId: serialNumber,
        status: "enabled",
        authentication: {
          x509Thumbprint: {
            primaryThumbprint: thumbprint,
            secondaryThumbprint: thumbprint,
          },
        },
      });

      resp.push({
        ref: item.ref,
        status: "SUCCESS",
        endpoint: endpoint,
        topic: baseTopic,
        policyApplied: policy,
      });
    } catch (err) {
      if (err instanceof iotcommon.errors.DeviceAlreadyExistsError) {
        resp.push({
          ref: item.ref,
          status: "SUCCESS",
          endpoint: endpoint,
          topic: baseTopic,
          policyApplied: policy,
        });
      } else {
        resp.push({
          ref: item.ref,
          status: "ERROR",
          message: "Failed creating and registering thing",
        });
      }
      continue;
    }
  }

  return resp;
}

export default requestMiddleware(post, {
  validation: { body: postInteropSchema },
});
