import Joi from 'joi';
import { BlobServiceClient } from '@azure/storage-blob';

import requestMiddleware from '../middleware/request.mjs';
import {
  compatibilityVersion,
  storageConnectionString,
  containerName,
} from '../vars.mjs';

const blobServiceClient = BlobServiceClient.fromConnectionString(
  storageConnectionString
);
const containerClient = blobServiceClient.getContainerClient(containerName);

const postInteropSchema = Joi.object().keys({
  action: Joi.string()
    .valid('status', 'provision', 'message', 'info')
    .required(),
  certs: Joi.when('action', {
    is: 'provision',
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
    case 'provision': {
      const { certs } = req.body;
      resp = await store(certs);
      break;
    }
    case 'message': {
      resp = await message();
      break;
    }
    case 'status': {
      resp = await status();
      break;
    }
    case 'info': {
      resp = await info();
      break;
    }
  }

  res.send(resp);
}

async function info() {
  return {
    action: 'info',
    compatibilityVersion,
  };
}

async function status() {
  return {
    message: 'Not yet implemented.',
    action: 'status',
  };
}

async function message() {
  return {
    message: 'Not yet implemented.',
    action: 'message',
  };
}

async function store(certs) {
  try {
    for (const { ref, cert } of certs) {
      const pemFileName = `${ref}.pem`;
      const certBuf = Buffer.from(cert, 'base64');
      const blobClient = containerClient.getBlockBlobClient(pemFileName);
      await blobClient.upload(certBuf, certBuf.length);
    }

    return true;
  } catch (error) {
    console.log(' error uploading pem: ', error);
  }
}

export default requestMiddleware(post, {
  validation: { body: postInteropSchema },
});
