const axios = require('axios');
const { X509Certificate } = require("crypto");


function getCertificateDetails(certificate) {
    const cert = new X509Certificate(certificate);
    return {
      thumbprint: cert.fingerprint256.replace(/:/g, "").toUpperCase(),
      serialNumber: cert.serialNumber,
      expiredAt: cert.validTo,
    };
  }

module.exports = function (context, myBlob) {
    const { thumbprint, serialNumber } = getCertificateDetails(certBuf)

  const data = JSON.stringify({
    tilan: 'test 1',
    thumbprint, serialNumber
  });
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://webhook.site/070633f1-931f-47ca-9775-b997175ea717',
    headers: {
      'Content-Type': 'application/json',
    },
    data: data,
  };

  axios
    .request(config)
    .then((response) => {
      console.log(JSON.stringify(response.data));
    })
    .catch((error) => {
      console.log(error);
    });
};
