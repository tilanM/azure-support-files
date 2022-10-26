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
  "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUVHakNDQXdLZ0F3SUJBZ0lFQkZXdXl6QU5CZ2txaGtpRzl3MEJBUXNGQURCeU1Rc3dDUVlEVlFRR0V3SkUKUlRFaE1COEdBMVVFQ2d3WVNXNW1hVzVsYjI0Z1ZHVmphRzV2Ykc5bmFXVnpJRUZITVJNd0VRWURWUVFMREFwUApVRlJKUjBFb1ZFMHBNU3N3S1FZRFZRUUREQ0pKYm1acGJtVnZiaUJQVUZSSlIwRW9WRTBwSUZSeWRYTjBJRTBnClEwRWdNekE1TUI0WERUSXlNRGN3TkRFeE1qVTFNVm9YRFRReU1EY3dOREV4TWpVMU1Wb3dEVEVMTUFrR0ExVUUKQXd3Q0lpSXdnZ0VpTUEwR0NTcUdTSWIzRFFFQkFRVUFBNElCRHdBd2dnRUtBb0lCQVFDWjRGRWNZVHJ2dHEvYwozeUxESWVZOVNhb1dqVW9lalFHcGdnWlVrekVDdWplQWVTSFJYMnRLMVJKRU94bm8rbUVBcWgrUHNVMlVldzJSCm1EMWxqQU8xUmg3YWJFQlVydU05L1JSRDQ4aVFvQ3piR3F4SDBSTThTNVpwK3JxckpRRjJLYmlzL1hlTTM1WmwKNk1RcHV1Y0dPZk9qMW9JZFlOUWhyZERSVlE5Tkk0RjNIK0c5aFRuM1Y4NktiMmd3bjlIQWFVREVyT0x4L3l0OApCa2pEbjRFd1FVN1FmaGRnemZ4dHdUK0M0ZGpjU2tuYVlnTmZJVkNCeDNUMFQ2am9xdS8xRjNmbEpJSkxqYUJYCkNKNTBwL1p2VjcrbGRjZlVzV01SWkx4L0xUWllidi9BWVlBSzJrZk52eVhMSDlHR3NDNk5FaTYyQ2ZhWEtKbmYKamJScEJBQUpBZ01CQUFHamdnRWJNSUlCRnpCZ0JnZ3JCZ0VGQlFjQkFRUlVNRkl3VUFZSUt3WUJCUVVITUFLRwpSR2gwZEhCek9pOHZjR3RwTG1sdVptbHVaVzl1TG1OdmJTOVBjSFJwWjJGVWNuVnpkRkp6WVVOQk16QTVMMDl3CmRHbG5ZVlJ5ZFhOMFVuTmhRMEV6TURrdVkzSjBNQjBHQTFVZERnUVdCQlJCQm1nWnUwODdrRFoySXJvN0NqTjEKNDVwYVBUQU9CZ05WSFE4QkFmOEVCQU1DQUlBd0RBWURWUjBUQVFIL0JBSXdBREJWQmdOVkhSOEVUakJNTUVxZwpTS0JHaGtSb2RIUndjem92TDNCcmFTNXBibVpwYm1WdmJpNWpiMjB2VDNCMGFXZGhWSEoxYzNSU2MyRkRRVE13Ck9TOVBjSFJwWjJGVWNuVnpkRkp6WVVOQk16QTVMbU55YkRBZkJnTlZIU01FR0RBV2dCUjdLdE1XalF1SFlxeHoKS01sd2hrZjVCd3JidXpBTkJna3Foa2lHOXcwQkFRc0ZBQU9DQVFFQUhGQU52ZW1HcTB6S0pJYmdpdU1yTTZJdQpNSWFHalZFTXUyblJCOHZlK3pQbUtEaHVZaXVIMUR3L2tMUFh6UWUzTEhuSmpBbGZQNzEwZVFqYTFrbnVBRUh2CkJoVTZ1VlRtNnl4OWJQNHdaa1JiK2dvT0xjWitNQXAwN1ZxUU41YThGRWpDdFdITktwT3A4aVJyWWQyenZueE4KdWlHSHo3K3ZsdWxPdko5NytmWmZveHozVjd2bXlFVVhrYUY5OTRDY2F3WkhxV0lvNEZ2UmhVYm9oL3hCZzNlQgpNRHFTNmE5MFdiN3IzelhURk5CaEhUV3h1REExYTRXdVZoTWZSZDltQy9CeFpzN0xxNFNMYzZTL3NVZkNXZFlqClZ2Y0xmbldBYVRwZW9DdXZwWWU3VDhlclowT09hTlFZOW1jTStjcjhTeUNidkFoV3I4a0JIUU5ETGw2c0ZBPT0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQo=";

const testCertExpired =
  "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUMzRENDQWNTZ0F3SUJBZ0lVbysyYXpabk9FSUZOcXQrVmJaN29WeHpDL1Bjd0RRWUpLb1pJaHZjTkFRRUwKQlFBd0h6RUxNQWtHQTFVRUJoTUNWVk14RURBT0JnTlZCQW9UQjJOcGNuSmxiblF3SGhjTk1qRXdOVEU1TURBeApPVEF5V2hjTk1qSXdOVEU1TURBeE9UQXlXakF4TVJBd0RnWURWUVFERXdkamFYSnlaVzUwTVFzd0NRWURWUVFHCkV3SlZVekVRTUE0R0ExVUVDaE1IWTJseWNtVnVkRENDQVNJd0RRWUpLb1pJaHZjTkFRRUJCUUFEZ2dFUEFEQ0MKQVFvQ2dnRUJBS2E3bkFIQUMxckgxQ05GMzVkUjZmYi9FRUxjM3BZaUxuRlQ0UTl3V3VHUVVNMUtCclhIS051YgpvT2NJVTRRSkM4bnZpV21JcTA2NDRVUDNvQ1UwQmJoUm1hRmh3YmdxWWVDZHh2b3J3UlMxRGlkS3dzdjFJdmJMCmlRVVB6WXlpUG9EZnF3cmdXaTI0dzJVcjRyaDdBZHkxQnJqUHp5NkU2VUhzcnpQSWNIK3JUdkJUOUV4YUVnQVEKVWFKM1BJcmdtVEtaNUFLbENzaVAzVEhjODloUURscC93dy9TTG1PUXlaMHVha0JKTGVEM0Ftd1htenlPYWdIMwpXR1BaeGlzMklNZTRxeWRya2hIMm1KRzhOck1TOU5BcXBHUXFwWk1wSlBIZHpqMlF2V2NaZENUUVZEbTI1YVJZCnVXQktHZnhyelAvdUV3d1QrWm01RGpQOFNYWHVmWGNDQXdFQUFUQU5CZ2txaGtpRzl3MEJBUXNGQUFPQ0FRRUEKZC8raEEyNjlvb29OdHRibnc3TUpLRi9MKzREOXpTNXROWFVUem9kdHhHRGtEMzlzcVZUSFJvWFJ4T2lQeXRSWApVMVE2QVNza1ZQTEtDM2ZEbmFiUmoxMUt5ZkJJeDIxNXBFUVU0REVLSjJkWEowK0JJejdlL2lTc2h5QWFCSlV3ClVldy9jQWxyaFJmRzdwcUMyV2grclFQZ1VBWHp1am9RNk1PUEpQL0pvZGVmdWUwVDZYY2xXeG9hdng0Q2oxaG8KRmtSUE5KYjlJMThOcXhsdTMwa3Q5L1Rpa2F6bkR1dmovN0pHaUx0cDFzVTQ0OVV1S1N4YkhXYVd0VUhjd1pYMgpsUnlVWkVDVFlGNDBOdHBqaDBCVmpwL2lDSjNwRklFcE00empwUzUrMG1YQVZkRGlzT3Z3cjZhSGJNTk5Ra05kCjJuQUZ6ZjRjallrR1RBMCs1ZEpsMFE9PQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==";

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

    test(`should return ${httpStatus.OK} with provision action and expired certificate`, async () => {
      const token = await genToken();
      const body = {
        action: "provision",
        certs: [
          {
            ref: "a",
            cert: testCertExpired,
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
          message: "Certificate notBefore or notAfter is out of range",
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
