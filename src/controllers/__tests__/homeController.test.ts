// Don't use the global mock for this test - we want to test the real implementation
jest.unmock("../homeController");

import { Request, Response } from "express";
import { getHome } from "../homeController";
import { setupTestEnvironment } from "tests/helpers/testHelpers";

// Create mock objects for Express req, res
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: "GET",
  path: "/",
  ...overrides,
});

const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
  };
  return res;
};

describe("homeController", () => {
  setupTestEnvironment();

  describe("getHome", () => {
    it("should return welcome message with API information", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      getHome(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Welcome to Node.js Microservices Starter API",
        data: {
          service: "nodejs-microservices-starter",
          version: expect.any(String),
          environment: expect.any(String),
          status: "operational",
          timestamp: expect.any(String),
          endpoints: {
            health: "/v1/health",
            auth: {
              register: "/v1/auth/register",
              login: "/v1/auth/login",
              logout: "/v1/auth/logout",
              refresh: "/v1/auth/refresh-token",
            },
            docs: "Coming soon...",
          },
        },
      });
    });

    it("should not call res.status (defaults to 200)", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      getHome(req, res);

      expect(res.status).not.toHaveBeenCalled();
    });

    it("should return correct response structure", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      getHome(req, res);

      const responseCall = (res.json as jest.Mock).mock.calls[0][0];

      // Check top-level structure
      expect(responseCall).toHaveProperty("success", true);
      expect(responseCall).toHaveProperty("message");
      expect(responseCall).toHaveProperty("data");

      // Check data structure
      const { data } = responseCall;
      expect(data).toHaveProperty("service");
      expect(data).toHaveProperty("version");
      expect(data).toHaveProperty("environment");
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("timestamp");
      expect(data).toHaveProperty("endpoints");
    });

    it("should return valid timestamp in ISO format", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      const beforeCall = new Date();
      getHome(req, res);
      const afterCall = new Date();

      const responseCall = (res.json as jest.Mock).mock.calls[0][0];
      const timestamp = responseCall.data.timestamp;

      // Should be a valid ISO string
      expect(() => new Date(timestamp)).not.toThrow();

      // Should be between before and after the call
      const responseTime = new Date(timestamp);
      expect(responseTime.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(responseTime.getTime()).toBeLessThanOrEqual(afterCall.getTime());

      // Should match ISO format
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should return correct service information", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      getHome(req, res);

      const responseCall = (res.json as jest.Mock).mock.calls[0][0];
      const { data } = responseCall;

      expect(data.service).toBe("nodejs-microservices-starter");
      expect(data.status).toBe("operational");
      expect(typeof data.version).toBe("string");
      expect(data.version.length).toBeGreaterThan(0);
    });

    it("should return environment from config", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      getHome(req, res);

      const responseCall = (res.json as jest.Mock).mock.calls[0][0];
      const { data } = responseCall;

      // Environment should be from mocked config (development)
      expect(data.environment).toBe("development");
    });

    it("should return correct endpoint information", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      getHome(req, res);

      const responseCall = (res.json as jest.Mock).mock.calls[0][0];
      const { endpoints } = responseCall.data;

      // Check health endpoint
      expect(endpoints.health).toBe("/v1/health");

      // Check auth endpoints
      expect(endpoints.auth).toEqual({
        register: "/v1/auth/register",
        login: "/v1/auth/login",
        logout: "/v1/auth/logout",
        refresh: "/v1/auth/refresh-token",
      });

      // Check docs
      expect(endpoints.docs).toBe("Coming soon...");
    });

    it("should handle version from npm_package_version environment variable", () => {
      const originalVersion = process.env.npm_package_version;

      // Test with npm_package_version set
      process.env.npm_package_version = "2.5.1";

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      getHome(req, res);

      const responseCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.data.version).toBe("2.5.1");

      // Restore original value
      if (originalVersion !== undefined) {
        process.env.npm_package_version = originalVersion;
      } else {
        delete process.env.npm_package_version;
      }
    });

    it("should fallback to default version when npm_package_version is not set", () => {
      const originalVersion = process.env.npm_package_version;

      // Remove npm_package_version
      delete process.env.npm_package_version;

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      getHome(req, res);

      const responseCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseCall.data.version).toBe("1.0.0");

      // Restore original value
      if (originalVersion !== undefined) {
        process.env.npm_package_version = originalVersion;
      }
    });

    it("should be idempotent - multiple calls return same structure", () => {
      const req = createMockRequest() as Request;
      const res1 = createMockResponse() as Response;
      const res2 = createMockResponse() as Response;

      getHome(req, res1);
      getHome(req, res2);

      const response1 = (res1.json as jest.Mock).mock.calls[0][0];
      const response2 = (res2.json as jest.Mock).mock.calls[0][0];

      // Should have same structure (timestamps will differ)
      expect(response1.success).toBe(response2.success);
      expect(response1.message).toBe(response2.message);
      expect(response1.data.service).toBe(response2.data.service);
      expect(response1.data.version).toBe(response2.data.version);
      expect(response1.data.environment).toBe(response2.data.environment);
      expect(response1.data.status).toBe(response2.data.status);
      expect(response1.data.endpoints).toEqual(response2.data.endpoints);
    });

    it("should not be affected by request parameters", () => {
      const requests = [
        createMockRequest(),
        createMockRequest({ query: { test: "value" } }),
        createMockRequest({ headers: { "user-agent": "test" } }),
        createMockRequest({ method: "POST" }), // Even wrong method shouldn't matter
      ];

      const responses = requests.map(req => {
        const res = createMockResponse() as Response;
        getHome(req as Request, res);
        return (res.json as jest.Mock).mock.calls[0][0];
      });

      // All responses should have the same structure
      const firstResponse = responses[0];
      responses.forEach(response => {
        expect(response.success).toBe(firstResponse.success);
        expect(response.message).toBe(firstResponse.message);
        expect(response.data.service).toBe(firstResponse.data.service);
        expect(response.data.endpoints).toEqual(firstResponse.data.endpoints);
      });
    });

    it("should include all expected auth endpoints", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      getHome(req, res);

      const responseCall = (res.json as jest.Mock).mock.calls[0][0];
      const authEndpoints = responseCall.data.endpoints.auth;

      // Check that all auth endpoints are present
      const expectedEndpoints = ["register", "login", "logout", "refresh"];
      expectedEndpoints.forEach(endpoint => {
        expect(authEndpoints).toHaveProperty(endpoint);
        expect(typeof authEndpoints[endpoint]).toBe("string");
        expect(authEndpoints[endpoint]).toContain("/v1/auth/");
      });
    });

    it("should return JSON-serializable data", () => {
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      getHome(req, res);

      const responseCall = (res.json as jest.Mock).mock.calls[0][0];

      // Should be able to serialize and deserialize without error
      expect(() => {
        const jsonString = JSON.stringify(responseCall);
        const parsed = JSON.parse(jsonString);
        return parsed;
      }).not.toThrow();
    });
  });
});
