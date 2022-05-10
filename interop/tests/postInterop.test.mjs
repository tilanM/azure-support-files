import httpStatus from "http-status";
import request from "supertest";
import { mockClient } from "aws-sdk-client-mock";
import {
  IoTClient,
  RegisterCertificateWithoutCACommand,
  CreateThingCommand,
  AttachThingPrincipalCommand,
  DescribeEndpointCommand,
  AttachPolicyCommand,
  GetPolicyCommand,
} from "@aws-sdk/client-iot";

import { app } from "../src/app.mjs";
import { genToken } from "./helpers/genToken.mjs";
import { getSerialNumber, getCertificate } from "../src/helpers/crypto.mjs";

import { thingNamePrefix } from "../src/vars.mjs";
const IoTClientMock = mockClient(IoTClient);

const testCert =
  "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUU0VENDQThtZ0F3SUJBZ0lFQ3FPMG9qQU5CZ2txaGtpRzl3MEJBUXNGQURCN01Rc3dDUVlEVlFRR0V3SkUKUlRFaE1COEdBMVVFQ2d3WVNXNW1hVzVsYjI0Z1ZHVmphRzV2Ykc5bmFXVnpJRUZITVJNd0VRWURWUVFMREFwUApVRlJKUjBFb1ZFMHBNVFF3TWdZRFZRUUREQ3RKYm1acGJtVnZiaUJQVUZSSlIwRW9WRTBwSUZSUVRTQXlMakFnClVsTkJJRlJsYzNRZ1EwRWdNVEF3TUNBWERURTRNRGN4TXpFMU1UY3hORm9ZRHprNU9Ua3hNak14TWpNMU9UVTUKV2pCTE1Va3dSd1lEVlFRRkUwQXlPV0UxTWpnNU56QmhNV0ZoWlRNNE9HVmxOR1poT0RrMU1ERm1NVFV5TjJFeApaV1poTURoaU1qa3lPRFEyT1RKa01tSTJZalUyTVdZek1UUXpZV1l5TUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGCkFBT0NBUThBTUlJQkNnS0NBUUVBdUZyVVdJM0plMTdGNHY0cm1UdDJPbWswOGhIS1JXMEhxTTRJMXZUMnlQZk0KSjdHTnJWNzhQZDVVNUFMNmplV05raXVJYWlQY1BYNkFwQUFVSFgvNThFVzcrOWhKczlYS0QzMk4xN3dkUWVWbgp5WlZWbmhvQ1N4K1g1b01uMzR4U1hnR01CSWNjQVBQWmJ0MHhmc1BFelhFaHNWLzhXSnFKSUsycEVPVDR3YWFkClhLbElvWG1keGtxMUN6ajdTVXRxTEdnMnZIblk5NldDVTlFQ0pHUWpyK2tYaExsQUtKQnRkRkVVY2FRRjlUNEUKeDNUclh3cS9qeWo4U2kyTU9ENkpaOHIxc1BpSmJNYkcwckFxNWk0Z1RKTnNzeEpROE1rbXlvMFZIVWlydXBBTQp1bWpqcUNVKytiNEZSaDlIVkt4MUh1a0hxL1MwR3FNTS9tdmNQa3hjR3dJREFRQUJvNElCbVRDQ0FaVXdXd1lJCkt3WUJCUVVIQVFFRVR6Qk5NRXNHQ0NzR0FRVUZCekFDaGo5b2RIUndPaTh2Y0d0cExtbHVabWx1Wlc5dUxtTnYKYlM5UGNIUnBaMkZTYzJGVWMzUkRRVEV3TUM5UGNIUnBaMkZTYzJGVWMzUkRRVEV3TUM1amNuUXdEZ1lEVlIwUApBUUgvQkFRREFnVWdNRmdHQTFVZEVRRUIvd1JPTUV5a1NqQklNUll3RkFZRlo0RUZBZ0VNQzJsa09qUTVORFkxCk9EQXdNUm93R0FZRlo0RUZBZ0lNRDFOTVFpQTVOamN3SUZSUVRUSXVNREVTTUJBR0JXZUJCUUlEREFkcFpEb3cKTnpVMU1Bd0dBMVVkRXdFQi93UUNNQUF3VUFZRFZSMGZCRWt3UnpCRm9FT2dRWVkvYUhSMGNEb3ZMM0JyYVM1cApibVpwYm1WdmJpNWpiMjB2VDNCMGFXZGhVbk5oVkhOMFEwRXhNREF2VDNCMGFXZGhVbk5oVkhOMFEwRXhNREF1ClkzSnNNQlVHQTFVZElBUU9NQXd3Q2dZSUtvSVVBRVFCRkFFd0h3WURWUjBqQkJnd0ZvQVVxNHF4Y0Q3cnRNaFQKVmFtMS80R0NpT3hBQzlNd0VBWURWUjBsQkFrd0J3WUZaNEVGQ0FFd0lnWURWUjBKQkJzd0dUQVhCZ1ZuZ1FVQwpFREVPTUF3TUF6SXVNQUlCQUFJQ0FJb3dEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBQW12SlFYS2k1d09idFBtCkNLTHRUaFluSFVMQnhnTjQ0aTNwRWJ2dzNWVldjOTZUYmtNRjBXVk9RYk5BYXpUNTN3REdTeVpqRjQ3b2JubmoKRHZxZktrVGt2dkM2UTRHYUkyVFpPWlBYUGwzL2VKTHlkV3gycnpGTGV5MXdhcy85bENGTW5rakxOTDhuOG5GaAo3NjhnTUJFeDNlb0V6bi9DdUVoYWhSWnVqS2ZyVlBIYUtONDUxWXNJZENmL29qWE5QblBENkpPOEVDMnhXU0pRCllaaFo3UGF0R2d2Qjllc0Nodjg3Qkh0a0ZFbzRURGNWTTU1Q3Rmc1JJL29VOXNoZjBPdzhDdWlDT0YyK29QamUKMzhIRlQ5K3RPdWdNMHV0cTZTWWd3NGVJUHVJTVNuaS9yREdHYkVkbS9CaFMvQm1DazVLR1JSbElnSXVXRDkraApvdFA2cTBvPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0t";

beforeEach(() => {
  IoTClientMock.reset();
});

describe("Check interop routes", () => {
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
    let thingName;

    beforeEach(async () => {
      let cert = await getCertificate(Buffer.from(testCert, "base64"));
      let testSerialNum = await getSerialNumber(cert);
      thingName = `${thingNamePrefix}${testSerialNum}`;
    });

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
      const certificateId = "1234";

      IoTClientMock.on(RegisterCertificateWithoutCACommand).resolves({
        certificateArn: "path::to::cert",
        certificateId,
      });
      IoTClientMock.on(CreateThingCommand).resolves({
        thingName,
      });
      IoTClientMock.on(AttachThingPrincipalCommand).resolves({});
      IoTClientMock.on(DescribeEndpointCommand).resolves({
        endpointAddress: "local-mocked",
      });
      IoTClientMock.on(AttachPolicyCommand).resolves({
        $metadata: "test",
      });
      IoTClientMock.on(GetPolicyCommand).resolves({
        policyArn: "testArn",
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
          endpoint: "local-mocked",
          topic: "iqs",
          policyApplied: true,
        },
      ]);

      const createThingCalls = IoTClientMock.commandCalls(CreateThingCommand);

      expect(createThingCalls).toHaveLength(1);
      expect(createThingCalls[0].args[0].input.thingName).toEqual(thingName);
    });

    test(`should return ${httpStatus.OK} with provision action with GetPolicyCommand error`, async () => {
      IoTClientMock.on(RegisterCertificateWithoutCACommand).resolves({
        certificateArn: "path::to::cert",
        certificateId: "1234",
      });
      IoTClientMock.on(CreateThingCommand).resolves({
        thingName,
      });
      IoTClientMock.on(AttachThingPrincipalCommand).resolves({});
      IoTClientMock.on(DescribeEndpointCommand).resolves({
        endpointAddress: "local-mocked",
      });
      IoTClientMock.on(AttachPolicyCommand).resolves({
        $metadata: "test",
      });
      IoTClientMock.on(GetPolicyCommand).rejects();

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
          policyApplied: false,
        },
      ]);
    });

    test(`should return ${httpStatus.OK} with provision action with no policy`, async () => {
      IoTClientMock.on(RegisterCertificateWithoutCACommand).resolves({
        certificateArn: "path::to::cert",
        certificateId: "1234",
      });
      IoTClientMock.on(CreateThingCommand).resolves({
        thingName,
      });
      IoTClientMock.on(AttachThingPrincipalCommand).resolves({});
      IoTClientMock.on(DescribeEndpointCommand).resolves({
        endpointAddress: "local-mocked",
      });
      IoTClientMock.on(AttachPolicyCommand).resolves({
        $metadata: "test",
      });
      IoTClientMock.on(GetPolicyCommand).resolves({});

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
          policyApplied: false,
        },
      ]);
    });

    test(`should return ${httpStatus.OK} with provision action with DescribeEndpointCommand error`, async () => {
      IoTClientMock.on(RegisterCertificateWithoutCACommand).resolves({
        certificateArn: "path::to::cert",
        certificateId: "1234",
      });
      IoTClientMock.on(CreateThingCommand).resolves({
        thingName,
      });
      IoTClientMock.on(AttachThingPrincipalCommand).resolves({});
      IoTClientMock.on(DescribeEndpointCommand).rejects();
      IoTClientMock.on(AttachPolicyCommand).resolves({
        $metadata: "test",
      });
      IoTClientMock.on(GetPolicyCommand).resolves({
        policyArn: "testArn",
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

    test(`should return ${httpStatus.OK} with provision action where certificate already exists`, async () => {
      IoTClientMock.on(RegisterCertificateWithoutCACommand).rejects({
        name: "ResourceAlreadyExistsException",
        certificateArn: "path::to::cert",
        certificateId: "1234",
      });
      IoTClientMock.on(CreateThingCommand).resolves({
        thingName,
      });
      IoTClientMock.on(AttachThingPrincipalCommand).resolves({});
      IoTClientMock.on(DescribeEndpointCommand).resolves({
        endpointAddress: "local-mocked",
      });
      IoTClientMock.on(AttachPolicyCommand).resolves({
        $metadata: "test",
      });
      IoTClientMock.on(GetPolicyCommand).resolves({
        policyArn: "testArn",
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
          endpoint: "local-mocked",
          topic: "iqs",
          policyApplied: true,
        },
      ]);
    });

    test(`should return ${httpStatus.OK} with provision action with RegisterCertificateWithoutCACommand error`, async () => {
      IoTClientMock.on(RegisterCertificateWithoutCACommand).rejects();
      IoTClientMock.on(CreateThingCommand).resolves({
        thingName,
      });
      IoTClientMock.on(AttachThingPrincipalCommand).resolves({});
      IoTClientMock.on(DescribeEndpointCommand).resolves({
        endpointAddress: "local-mocked",
      });
      IoTClientMock.on(AttachPolicyCommand).resolves({
        $metadata: "test",
      });
      IoTClientMock.on(GetPolicyCommand).resolves({
        policyArn: "testArn",
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
          status: "ERROR",
          message: "Failed creating and registering thing",
        },
      ]);
    });

    test(`should return ${httpStatus.OK} test 2 certs, one good and one bad`, async () => {
      IoTClientMock.on(RegisterCertificateWithoutCACommand).resolves({
        certificateArn: "path::to::cert",
        certificateId: "1234",
      });
      IoTClientMock.on(CreateThingCommand).resolves({
        thingName,
      });
      IoTClientMock.on(AttachThingPrincipalCommand).resolves({});
      IoTClientMock.on(DescribeEndpointCommand).resolves({
        endpointAddress: "local-mocked",
      });
      IoTClientMock.on(AttachPolicyCommand).resolves({
        $metadata: "test",
      });
      IoTClientMock.on(GetPolicyCommand).resolves({
        policyArn: "testArn",
      });

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
          ref: "a",
          status: "SUCCESS",
          endpoint: "local-mocked",
          topic: "iqs",
          policyApplied: true,
        },
        {
          ref: "b",
          status: "ERROR",
          message: "Cannot decode certitifcate",
        },
      ]);
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
