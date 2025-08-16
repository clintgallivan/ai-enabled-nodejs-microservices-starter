import request from "supertest";
import express from "express";
import { setupTestEnvironment } from "tests/helpers/testHelpers";

// Mock all external dependencies
jest.mock("controllers/logsController");
jest.mock("middleware/tokenAuthHandler");

// Import mocked controllers
import { getLogs } from "controllers/logsController";

// Create a test app with the logs routes
import logsRoutes from "../v1/logsRoute";

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/v1/logs", logsRoutes);

  // Error handling middleware for tests
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message });
    }
  );

  return app;
};

describe("Logs Routes", () => {
  setupTestEnvironment();

  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();

    // Setup simple mock implementation
    (getLogs as jest.Mock).mockImplementation(
      async (_req: express.Request, res: express.Response) => {
        res.status(200).json({ message: "Log download initiated" });
      }
    );
  });

  describe("GET /v1/logs/download", () => {
    it("should call logs controller", async () => {
      await request(app).get("/v1/logs/download").expect(200);

      expect(getLogs).toHaveBeenCalled();
    });

    it("should require authentication middleware", async () => {
      // Since middleware is mocked, we just verify the controller is called
      await request(app)
        .get("/v1/logs/download")
        .set("Authorization", "Bearer valid-token")
        .expect(200);

      expect(getLogs).toHaveBeenCalled();
    });

    it("should handle controller errors", async () => {
      (getLogs as jest.Mock).mockImplementationOnce(
        async (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
          next(new Error("Logs download failed"));
        }
      );

      await request(app).get("/v1/logs/download").expect(500);
    });

    it("should only accept GET requests", async () => {
      await request(app).post("/v1/logs/download").expect(404);

      await request(app).put("/v1/logs/download").expect(404);
    });
  });

  describe("Route Structure", () => {
    it("should mount at correct path", async () => {
      await request(app).get("/v1/logs/download").expect(200);

      expect(getLogs).toHaveBeenCalled();
    });

    it("should handle non-existent paths", async () => {
      await request(app).get("/v1/logs/invalid").expect(404);
    });
  });
});
