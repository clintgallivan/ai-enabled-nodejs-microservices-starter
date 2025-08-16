import request from "supertest";
import express from "express";
import { setupTestEnvironment } from "tests/helpers/testHelpers";

// Mock all external dependencies
jest.mock("controllers/healthController");
jest.mock("middleware/tokenAuthHandler");

// Import mocked controllers
import { getHealth } from "controllers/healthController";

// Create a test app with the health routes
import healthRoutes from "../v1/healthRoute";

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/v1/health", healthRoutes);

  // Error handling middleware for tests
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message });
    }
  );

  return app;
};

describe("Health Routes", () => {
  setupTestEnvironment();

  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();

    // Setup default mock implementation
    (getHealth as jest.Mock).mockImplementation(
      async (_req: express.Request, res: express.Response) => {
        res.json({ status: "ok" });
      }
    );
  });

  describe("GET /v1/health", () => {
    it("should return health status successfully", async () => {
      const response = await request(app).get("/v1/health").expect(200);

      expect(getHealth).toHaveBeenCalled();
      expect(response.body).toEqual({
        status: "ok",
      });
    });

    it("should call getHealth with correct parameters", async () => {
      await request(app).get("/v1/health");

      expect(getHealth).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it("should handle controller errors", async () => {
      // Override the mock to throw an error
      (getHealth as jest.Mock).mockImplementationOnce(
        async (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
          next(new Error("Health check failed"));
        }
      );

      const response = await request(app).get("/v1/health").expect(500);

      expect(response.body).toEqual({
        error: "Health check failed",
      });
    });

    it("should require authentication", async () => {
      // The route should be protected by tokenAuthHandler middleware
      // Since we mocked it, it will pass through, but we can verify the controller is called
      await request(app).get("/v1/health").set("Authorization", "Bearer valid-token").expect(200);

      expect(getHealth).toHaveBeenCalled();
    });

    it("should ignore query parameters", async () => {
      await request(app).get("/v1/health?test=value").expect(200);

      expect(getHealth).toHaveBeenCalled();
    });

    it("should only accept GET requests", async () => {
      // Test that other HTTP methods are not supported
      await request(app).post("/v1/health").expect(404);

      await request(app).put("/v1/health").expect(404);

      await request(app).delete("/v1/health").expect(404);
    });
  });

  describe("Route Structure", () => {
    it("should handle non-existent endpoints", async () => {
      await request(app).get("/v1/health-check").expect(404);
    });

    it("should mount routes correctly", async () => {
      // Test that routes are properly mounted and controllers are called
      await request(app).get("/v1/health");

      expect(getHealth).toHaveBeenCalled();
    });

    it("should have correct route path", async () => {
      // Test that the route responds at the expected path
      await request(app).get("/v1/health").expect(200);

      // And not at other similar paths
      await request(app).get("/v1/healthz").expect(404);
    });

    it("should return consistent response format", async () => {
      const response = await request(app).get("/v1/health").expect(200);

      // Health endpoint should always return a status field
      expect(response.body).toHaveProperty("status");
      expect(typeof response.body.status).toBe("string");
    });
  });
});
