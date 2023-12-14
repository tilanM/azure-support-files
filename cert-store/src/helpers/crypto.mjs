/**
 * @file Helper class for handling cryptography related logics
 * @author Cirrent Cloud Team
 */

import { got } from "got";
import { createVerifier } from "fast-jwt";
import { caching, memoryStore } from "cache-manager";
import { X509, zulutodate, KJUR } from "jsrsasign";
import Joi from "joi";
import { audience, verifyCacheKey, publicKeyURL } from "../vars.mjs";

let cache;

/**
 * Create token verifier function
 * @returns {function} token verify function
 */
async function createTokenVerifier() {
  if (!cache) {
    cache = await caching(
      memoryStore({
        max: 10,
        ttl: 600 /* seconds */,
      })
    );
  }

  let cacheRes = await cache.get(verifyCacheKey);
  if (cacheRes) return cacheRes;

  let publicKey;

  const dl = await got(publicKeyURL);

  if (dl.rawBody) {
    publicKey = dl.rawBody;
  }

  if (publicKey && audience) {
    const verify = createVerifier({
      key: publicKey,
      allowedAud: audience,
    });
    await cache.set(verifyCacheKey, verify);

    return verify;
  } else {
    throw new Error("Cannot create verifier");
  }
}

const serialNumberSchema = Joi.string().required();

async function getSerialNumber(certificate) {
  const serialNumber = certificate.getSerialNumberHex();

  await serialNumberSchema.validateAsync(serialNumber);
  return serialNumber;
}

async function isValidExpiration(certificate) {
  let isValid = false;

  const notBefore = zulutodate(certificate.getNotBefore());
  const notAfter = zulutodate(certificate.getNotAfter());
  const cDate = new Date();

  if (cDate >= notBefore && cDate <= notAfter) isValid = true;

  return isValid;
}

async function getCertificate(certBuf) {
  const certString = certBuf.toString("ascii");
  let x509 = new X509();
  x509.readCertPEM(certString);

  return x509;
}

async function getThumbprint(certificate) {
  return KJUR.crypto.Util.hashHex(certificate.hex, "sha256").toUpperCase();
}

export {
  createTokenVerifier,
  getSerialNumber,
  getCertificate,
  isValidExpiration,
  getThumbprint,
};
