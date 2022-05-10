import httpStatus from "http-status";

import ApiError from "../errors/ApiError.mjs";

const getMessageFromJoiError = (error) => {
  if (!error.details && error.message) {
    return error.message;
  }
  return error.details.map((details) => details.message).join(", ");
};

const requestMiddleware = (handler, options) => async (req, res, next) => {
  if (options?.validation?.body) {
    const { error } = options.validation.body.validate(req.body);
    if (error) {
      return next(
        new ApiError(httpStatus.BAD_REQUEST, getMessageFromJoiError(error))
      );
    }
  }

  try {
    await handler(req, res, next);
    next();
  } catch (err) {
    next(err);
  }
};

export default requestMiddleware;
