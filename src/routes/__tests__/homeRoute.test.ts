import request from "supertest";
import express from "express";
import { setupTestEnvironment } from "tests/helpers/testHelpers";

// Mock all external dependencies
jest.mock("controllers/homeController");

// Import mocked controllers
import { getHome } from "controllers/homeController";

// Create a test app with the home routes
import homeRoutes from "../v1/homeRoute";

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/v1", homeRoutes);

  // Error handling middleware for tests
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message });
    }
  );

  return app;
};

describe("Home Routes", () => {
  setupTestEnvironment();

  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();

    // Setup default mock implementation
    (getHome as jest.Mock).mockImplementation(
      async (_req: express.Request, res: express.Response) => {
        res.json({
          success: true,
          message: "Welcome to Node.js Microservices Starter API",
          data: {
            service: "nodejs-microservices-starter",
            version: "1.0.0",
            environment: "test",
            status: "operational",
            timestamp: new Date().toISOString(),
            endpoints: {
              auth: {
                register: "POST /v1/auth/register",
                login: "POST /v1/auth/login",
                logout: "POST /v1/auth/logout",
                refresh: "POST /v1/auth/refresh-token",
                healthToken: "GET /v1/auth/health-token",
                logsToken: "GET /v1/auth/logs-token",
              },
            },
          },
        });
      }
    );
  });

  describe("GET /v1/", () => {
    it("should return API information successfully", async () => {
      const response = await request(app).get("/v1/").expect(200);

      expect(getHome).toHaveBeenCalled();
      expect(response.body).toEqual({
        success: true,
        message: "Welcome to Node.js Microservices Starter API",
        data: {
          service: "nodejs-microservices-starter",
          version: "1.0.2",
          environment: "test",
          status: "operational",
          timestamp: expect.any(String),
          endpoints: {
            auth: {
              register: "POST /v1/auth/register",
              login: "POST /v1/auth/login",
              logout: "POST /v1/auth/logout",
              refresh: "POST /v1/auth/refresh-token",
              healthToken: "GET /v1/auth/health-token",
              logsToken: "GET /v1/auth/logs-token",
            },
          },
        },
      });
    });

    it("should call getHome with correct parameters", async () => {
      await request(app).get("/v1/");

      expect(getHome).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it("should handle controller errors", async () => {
      // Override the mock to throw an error
      (getHome as jest.Mock).mockImplementationOnce(
        async (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
          next(new Error("Home controller error"));
        }
      );

      const response = await request(app).get("/v1/").expect(500);

      expect(response.body).toEqual({
        error: "Home controller error",
      });
    });

    it("should only accept GET requests", async () => {
      // GET should work
      await request(app).get("/v1/").expect(200);

      expect(getHome).toHaveBeenCalled();

      // Other methods should not work
      await request(app).post("/v1/").expect(404);

      await request(app).put("/v1/").expect(404);
    });

    it("should ignore query parameters", async () => {
      await request(app).get("/v1/?test=value").expect(200);

      expect(getHome).toHaveBeenCalled();
    });
  });

  describe("Route Structure", () => {
    it("should handle non-existent endpoints", async () => {
      await request(app).get("/v1/non-existent").expect(404);
    });

    it("should mount routes correctly", async () => {
      // Test that routes are properly mounted and controllers are called
      await request(app).get("/v1/");

      expect(getHome).toHaveBeenCalled();
    });

    it("should have correct route path", async () => {
      // Test that the route responds at the expected path
      await request(app).get("/v1/").expect(200);

      // And not at other paths
      await request(app).get("/v1/home").expect(404);
    });
  });
});
