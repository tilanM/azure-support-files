import httpStatus from "http-status";
import request from "supertest";

import { app } from "../src/app.mjs";

describe("Check default routes", () => {
  describe("GET /", () => {
    test(`should return ${httpStatus.OK}`, async () => {
      await request(app).get("/").send().expect(httpStatus.OK);
    });
  });
  describe("GET /doesntexist", () => {
    test(`should return ${httpStatus.NOT_FOUND}`, async () => {
      await request(app)
        .get("/doesnotexist")
        .send()
        .expect(httpStatus.NOT_FOUND);
    });
  });
});
