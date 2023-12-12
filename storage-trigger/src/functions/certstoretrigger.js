const { app } = require('@azure/functions');
const iothub = require('azure-iothub');

app.storageBlob('certstoretrigger', {
  path: 'cert-store/{name}',
  connection: 'AzureWebJobsStorage',
  handler: processCertBlob,
});

async function processCertBlob(blob, context) {
  const ref = context.triggerMetadata.name.replace('.pem', '');

  try {
    const certBuf = blob.toString('utf-8');
    const { thumbprint, serialNumber } = getCertificateDetails(certBuf);

    const registry = iothub.Registry.fromConnectionString(process.env.IOT_CONN);
    await registry.create({
      deviceId: serialNumber,
      status: 'enabled',
      authentication: {
        x509Thumbprint: { primaryThumbprint: thumbprint, secondaryThumbprint: thumbprint },
      },
    });

  } catch (error) {
    context.log(`Storage trigger error - ${error}`)
  }
}

function getCertificateDetails(certificate) {
  const cert = new X509Certificate(certificate);
  return {
    thumbprint: cert.fingerprint256.replace(/:/g, '').toUpperCase(),
    serialNumber: cert.serialNumber,
    expiredAt: cert.validTo,
  };
}
