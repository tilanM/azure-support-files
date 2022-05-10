import fs from "fs";

import { createSigner } from "fast-jwt";

const privateKey = fs.readFileSync("./tests/cert/test-private.key");
const aud = process.env.AUDIENCE;

const sign = createSigner({
  key: privateKey,
  aud,
  expiresIn: 900000,
});

const signExpired = createSigner({
  key: privateKey,
  aud,
  expiresIn: 1,
});

async function genToken() {
  const token = await sign({});
  return "Bearer ".concat(token);
}

async function genExpiredToken() {
  const token = await signExpired({});
  return "Bearer ".concat(token);
}

export { genToken, genExpiredToken };
