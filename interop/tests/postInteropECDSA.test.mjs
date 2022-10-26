import httpStatus from "http-status";
import request from "supertest";
import { jest } from "@jest/globals";
import iothub from "azure-iothub";
import HttpRequestMock from "http-request-mock";
import fs from "fs";

import { app } from "../src/app.mjs";
import { genToken } from "./helpers/genToken.mjs";
import { publicKeyURL } from "../src/vars.mjs";

const mocker = HttpRequestMock.setup();

jest.mock("azure-iothub");

const testCert =
  "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUN4akNDQWt1Z0F3SUJBZ0lFRmZ5T29UQUtCZ2dxaGtqT1BRUURBekJ5TVFzd0NRWURWUVFHRXdKRVJURWgKTUI4R0ExVUVDZ3dZU1c1bWFXNWxiMjRnVkdWamFHNXZiRzluYVdWeklFRkhNUk13RVFZRFZRUUxEQXBQVUZSSgpSMEVvVkUwcE1Tc3dLUVlEVlFRRERDSkpibVpwYm1WdmJpQlBVRlJKUjBFb1ZFMHBJRlJ5ZFhOMElFMGdRMEVnCk16QTJNQjRYRFRJeU1EY3dOREV4TWpVME1Gb1hEVFF5TURjd05ERXhNalUwTUZvd0RURUxNQWtHQTFVRUF3d0MKSWlJd1dUQVRCZ2NxaGtqT1BRSUJCZ2dxaGtqT1BRTUJCd05DQUFRMGNKY2JrSXRrSHRMVGluNDRrWFFycENmKwpJSEhPdmtRUHVEMm41UjRmNTRqR1RmNXBiWlJLZWIzOENnYklxcktpTWdBYWcyNGhiOEsvVkF4elFtVXFvNElCCk1qQ0NBUzR3WUFZSUt3WUJCUVVIQVFFRVZEQlNNRkFHQ0NzR0FRVUZCekFDaGtSb2RIUndjem92TDNCcmFTNXAKYm1acGJtVnZiaTVqYjIwdlQzQjBhV2RoVkhKMWMzUkZZMk5EUVRNd05pOVBjSFJwWjJGVWNuVnpkRVZqWTBOQgpNekEyTG1OeWREQWRCZ05WSFE0RUZnUVVXYTl0bXhReDlsOGQrWFU2UHpqZmZ2OEVEUmN3RGdZRFZSMFBBUUgvCkJBUURBZ0NBTUF3R0ExVWRFd0VCL3dRQ01BQXdWUVlEVlIwZkJFNHdUREJLb0VpZ1JvWkVhSFIwY0hNNkx5OXcKYTJrdWFXNW1hVzVsYjI0dVkyOXRMMDl3ZEdsbllWUnlkWE4wUldOalEwRXpNRFl2VDNCMGFXZGhWSEoxYzNSRgpZMk5EUVRNd05pNWpjbXd3RlFZRFZSMGdCQTR3RERBS0JnZ3FnaFFBUkFFVUFUQWZCZ05WSFNNRUdEQVdnQlN6ClM2QUFmbDI5RFZKMGZsMXM0OXQ0UU1BRlpqQUtCZ2dxaGtqT1BRUURBd05wQURCbUFqRUErT1VVZDlBUzE3WVEKYVBKU2xseTRzMldmblBTQ2tVMk1ySWlhU0ovdHcySUp6a2d5VFp1cDhxT29LK1dzTWtrN0FqRUFnRTllNUMvNAoxalNEOWw1YkFlZ2d2bDZ1NWNnYXRWTzhIM08xaGl1ODRwVXc3T1lucUJUQjZ3SU42SENsbzQ0TgotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==";

describe("Check interop ECDSA routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocker.reset();
    mocker.mock({
      url: publicKeyURL,
      method: "GET",
      body: fs.readFileSync("./tests/cert/test-public.key"),
    });
  });
  describe("POST /interop provision tests", () => {
    test(`should return ${httpStatus.BAD_REQUEST} for input without reference`, async () => {
      const token = await genToken();
      const body = {
        action: "provision",
        certs: [
          {
            cert: testCert,
          },
        ],
      };

      const res = await request(app)
        .post("/interop")
        .set("Authorization", token)
        .send(body);

      expect(res.statusCode).toEqual(httpStatus.BAD_REQUEST);
    });

    test(`should return ${httpStatus.OK} with provision action`, async () => {
      iothub.Registry.fromConnectionString = jest
        .fn()
        .mockImplementation(() => ({
          addDevices: jest.fn().mockResolvedValue({errors:[]}),
        }));
      iothub.ConnectionString.parse = jest
        .fn()
        .mockReturnValue({ HostName: "local-mocked" });

      const token = await genToken();
      const body = {
        action: "provision",
        certs: [
          {
            ref: "a",
            cert: testCert,
          },
        ],
      };

      const res = await request(app)
        .post("/interop")
        .set("Authorization", token)
        .send(body);

      expect(res.statusCode).toEqual(httpStatus.OK);
      expect(res.body).toEqual([
        {
          ref: "a",
          status: "SUCCESS",
          endpoint: "local-mocked",
          topic: "iqs",
          policyApplied: true,
        },
      ]);
    });

    test(`should return ${httpStatus.OK} with provision action with iothub.ConnectionString.parse error`, async () => {
      iothub.Registry.fromConnectionString = jest
        .fn()
        .mockImplementation(() => ({
          addDevices: jest.fn().mockResolvedValue({errors:[]}),
        }));
      iothub.ConnectionString.parse = jest.fn().mockImplementation(() => {
        throw new Error("test");
      });

      const token = await genToken();
      const body = {
        action: "provision",
        certs: [
          {
            ref: "a",
            cert: testCert,
          },
        ],
      };

      const res = await request(app)
        .post("/interop")
        .set("Authorization", token)
        .send(body);

      expect(res.statusCode).toEqual(httpStatus.OK);
      expect(res.body).toEqual([
        {
          ref: "a",
          status: "SUCCESS",
          endpoint: null,
          topic: "iqs",
          policyApplied: true,
        },
      ]);
    });

    test(`should return ${httpStatus.OK} with provision action with iothub.Registry.create error`, async () => {
      iothub.Registry.fromConnectionString = jest
        .fn()
        .mockImplementation(() => ({
          addDevices: jest.fn().mockImplementation(() => {
            throw new Error("test");
          }),
        }));
      iothub.ConnectionString.parse = jest
        .fn()
        .mockReturnValue({ HostName: "local-mocked" });

      const token = await genToken();
      const body = {
        action: "provision",
        certs: [
          {
            ref: "a",
            cert: testCert,
          },
        ],
      };

      const res = await request(app)
        .post("/interop")
        .set("Authorization", token)
        .send(body);

      expect(res.statusCode).toEqual(httpStatus.OK);
      expect(res.body).toEqual([
        {
          ref: "a",
          status: "ERROR",
          message: "Failed creating and registering thing",
        },
      ]);
    });

    test(`should return ${httpStatus.OK} test 2 certs, one good and one bad`, async () => {
      iothub.Registry.fromConnectionString = jest
        .fn()
        .mockImplementation(() => ({
          addDevices: jest.fn().mockResolvedValue({errors:[]}),
        }));
      iothub.ConnectionString.parse = jest
        .fn()
        .mockReturnValue({ HostName: "local-mocked" });

      const token = await genToken();
      const body = {
        action: "provision",
        certs: [
          {
            ref: "a",
            cert: testCert,
          },
          {
            ref: "b",
            cert: "dGVzdGluZw==",
          },
        ],
      };

      const res = await request(app)
        .post("/interop")
        .set("Authorization", token)
        .send(body);

      expect(res.statusCode).toEqual(httpStatus.OK);
      expect(res.body).toEqual([
        {
          ref: "b",
          status: "ERROR",
          message: "Cannot decode certitifcate",
        },
        {
          ref: "a",
          status: "SUCCESS",
          endpoint: "local-mocked",
          topic: "iqs",
          policyApplied: true,
        },
      ]);
    });
  });
});
