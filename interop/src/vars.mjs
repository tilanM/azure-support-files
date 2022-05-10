const verifyCacheKey = "verifier";

const isLocal = process.env.IS_LOCAL && process.env.IS_LOCAL == 1;

const publicKeyURL =
  "https://cirrent-quickstarts.s3.us-west-2.amazonaws.com/interop-public.key";

const audience = process.env.AUDIENCE;

const iotPolicy = process.env.IOT_POLICY;

const baseTopic = process.env.DEFAULT_TOPIC || "iqs";

const thingNamePrefix = process.env.THING_PREFIX || "Infineon_";

export {
  verifyCacheKey,
  isLocal,
  publicKeyURL,
  audience,
  iotPolicy,
  baseTopic,
  thingNamePrefix,
};
