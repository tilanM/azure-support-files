import ApiError from "../errors/ApiError.mjs";
import { createTokenVerifier } from "../helpers/crypto.mjs";
import { audience } from "../vars.mjs";

async function authMiddleware(req, _, next) {
  if (!req.headers || !req.headers.authorization) {
    return next(new ApiError(401, "Missing Authorization Header"));
  }

  const parts = req.headers.authorization.split(" ");

  if (parts.length != 2) {
    return next(new ApiError(401, "Token invalid"));
  }

  const scheme = parts[0];
  const credentials = parts[1];

  if (!/^Bearer$/i.test(scheme)) {
    return next(
      new ApiError(401, "Authorization Header must contain Bearer Token")
    );
  }

  let verify;

  try {
    verify = await createTokenVerifier();
  } catch (err) {
    return next(new ApiError(401, "Error creating token verifier"));
  }

  if (!audience) {
    return next(new ApiError(401, "Audience not configured"));
  }

  try {
    verify(credentials);
  } catch (err) {
    return next(new ApiError(401, "Cannot verify and decode token"));
  }

  next();
}

export { authMiddleware };
