import httpStatus from "http-status";
import request from "supertest";
import HttpRequestMock from "http-request-mock";
import fs from "fs";

import { app } from "../src/app.mjs";
import { genToken } from "./helpers/genToken.mjs";

import { publicKeyURL } from "../src/vars.mjs";

const mocker = HttpRequestMock.setup();

describe("Check interop routes", () => {
  beforeEach(() => {
    mocker.reset();
    mocker.mock({
      url: publicKeyURL,
      method: "GET",
      body: fs.readFileSync("./tests/cert/test-public.key"),
    });
  });
  describe("POST /interop basic tests", () => {
    test(`should return ${httpStatus.BAD_REQUEST} without a body`, async () => {
      const token = await genToken();
      const res = await request(app)
        .post("/interop")
        .set("Authorization", token)
        .send();

      expect(res.statusCode).toEqual(httpStatus.BAD_REQUEST);
    });

    test(`should return ${httpStatus.BAD_REQUEST} with an invalid action`, async () => {
      const token = await genToken();
      const body = {
        action: "testme",
      };

      await request(app)
        .post("/interop")
        .set("Authorization", token)
        .send(body)
        .expect(httpStatus.BAD_REQUEST);
    });
  });
  describe("POST /interop provision tests", () => {
    test(`should return ${httpStatus.BAD_REQUEST} with provision action with invalid (non-base64) cert`, async () => {
      const token = await genToken();
      const body = {
        action: "provision",
        certs: [
          {
            ref: "a",
            cert: "acbdefghijklmnopqrstuvwxyz1234",
          },
        ],
      };

      const res = await request(app)
        .post("/interop")
        .set("Authorization", token)
        .send(body);

      expect(res.statusCode).toEqual(httpStatus.BAD_REQUEST);
    });

    test(`should return ${httpStatus.OK} with status action`, async () => {
      const token = await genToken();
      const body = {
        action: "status",
      };

      const res = await request(app)
        .post("/interop")
        .set("Authorization", token)
        .send(body);

      expect(res.statusCode).toEqual(httpStatus.OK);
      expect(res.body).toEqual({
        message: "Not yet implemented.",
        action: "status",
      });
    });

    test(`should return ${httpStatus.OK} with message action`, async () => {
      const token = await genToken();
      const body = {
        action: "message",
      };

      const res = await request(app)
        .post("/interop")
        .set("Authorization", token)
        .send(body);

      expect(res.statusCode).toEqual(httpStatus.OK);
      expect(res.body).toEqual({
        message: "Not yet implemented.",
        action: "message",
      });
    });
  });
});
