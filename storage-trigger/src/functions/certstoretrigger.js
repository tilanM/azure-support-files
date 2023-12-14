const { app } = require('@azure/functions');
const iothub = require('azure-iothub');
const { X509Certificate } = require('crypto');
const { BlobServiceClient } = require('@azure/storage-blob');

const CERT_CONTAINER = 'cert-store';
const LOG_CONTAINER = 'cert-logs';

const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.AzureWebJobsStorage
);
const logContainerClient = blobServiceClient.getContainerClient(LOG_CONTAINER);

app.storageBlob('certstoretrigger', {
  path: `${CERT_CONTAINER}/{name}`,
  connection: 'AzureWebJobsStorage',
  handler: processCertBlob,
});

async function processCertBlob(blob, context) {
  let logFileClient;
  let existingLog;
  try {
    const certBuf = blob.toString('utf-8');
    const { thumbprint, serialNumber, expireAt } =
      getCertificateDetails(certBuf);

    const logRef = `${thumbprint}.json`;
    logFileClient = logContainerClient.getBlockBlobClient(logRef);
    existingLog = await getExistingLog(logFileClient);

    if (!certBuf.startsWith('-----BEGIN CERTIFICATE-----')) {
      context.log('Not a valid cert.');
      await updateLog(logFileClient, {
        ...existingLog,
        status: 'failed',
        failed_at: new Date(),
        failed_reason: 'cert is not valid.',
      });
      return;
    }

    if (isExpired(expireAt)) {
      context.log('Cert has expired.');
      await updateLog(logFileClient, {
        ...existingLog,
        status: 'failed',
        failed_at: new Date(),
        failed_reason: 'cert has expired.',
      });
      return;
    }

    const registry = iothub.Registry.fromConnectionString(process.env.IOT_CONN);
    await registry.create({
      deviceId: serialNumber,
      status: 'enabled',
      authentication: {
        x509Thumbprint: {
          primaryThumbprint: thumbprint,
          secondaryThumbprint: thumbprint,
        },
      },
    });

    await updateLog(logFileClient, {
      ...existingLog,
      status: 'success',
      completed_at: new Date(),
    });
  } catch (error) {
    context.log(`Storage trigger error - ${error}`);
    await updateLog(logFileClient, {
      ...existingLog,
      status: 'failed',
      failed_at: new Date(),
      failed_reason: error,
    });
  }
}

function getCertificateDetails(certificate) {
  const cert = new X509Certificate(certificate);
  return {
    thumbprint: cert.fingerprint256.replace(/:/g, '').toUpperCase(),
    serialNumber: cert.serialNumber,
    expireAt: cert.validTo,
  };
}

function isExpired(expiryDate) {
  const expireTimestamp = new Date(expiryDate).getTime();
  const now = new Date().getTime();

  return now > expireTimestamp;
}

async function streamToString(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', (data) => {
      chunks.push(data.toString());
    });
    readableStream.on('end', () => {
      resolve(chunks.join(''));
    });
    readableStream.on('error', reject);
  });
}

async function getExistingLog(logFileClient) {
  const existingLog = await logFileClient.download();
  const logJson = await streamToString(existingLog.readableStreamBody);
  return JSON.parse(logJson);
}

async function updateLog(logFileClient, logData) {
  const newLog = JSON.stringify(logData);
  await logFileClient.upload(newLog, newLog.length);
}
