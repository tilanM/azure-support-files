import httpStatus from "http-status";
import request from "supertest";

import { app } from "../src/app.mjs";
import { genToken, genExpiredToken } from "./helpers/genToken.mjs";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Check auth is functional", () => {
  describe("GET /auth basic tests", () => {
    test(`should return ${httpStatus.UNAUTHORIZED} without an authorization header`, async () => {
      const res = await request(app).get("/auth").send();

      expect(res.statusCode).toEqual(httpStatus.UNAUTHORIZED);
      expect(res.body).toEqual({ error: "Missing Authorization Header" });
    });
    test(`should return ${httpStatus.UNAUTHORIZED} with an invalid token`, async () => {
      const res = await request(app)
        .get("/auth")
        .set("Authorization", "garbage")
        .send();

      expect(res.statusCode).toEqual(httpStatus.UNAUTHORIZED);
      expect(res.body).toEqual({ error: "Token invalid" });
    });
    test(`should return ${httpStatus.UNAUTHORIZED} with a 2 part non-Bearer token`, async () => {
      const res = await request(app)
        .get("/auth")
        .set("Authorization", "garbage test")
        .send();

      expect(res.statusCode).toEqual(httpStatus.UNAUTHORIZED);
      expect(res.body).toEqual({
        error: "Authorization Header must contain Bearer Token",
      });
    });
    test(`should return ${httpStatus.UNAUTHORIZED} with an expired token`, async () => {
      const token = await genExpiredToken();

      await delay(10);

      const res = await request(app)
        .get("/auth")
        .set("Authorization", token)
        .send();

      expect(res.statusCode).toEqual(httpStatus.UNAUTHORIZED);
    });
    test(`should return ${httpStatus.OK} with a valid test token`, async () => {
      const token = await genToken();

      const res = await request(app)
        .get("/auth")
        .set("Authorization", token)
        .send();

      expect(res.statusCode).toEqual(httpStatus.OK);
    });
  });
});
