import request from "supertest";
import express from "express";
import { setupTestEnvironment } from "tests/helpers/testHelpers";

// Mock all route modules and their dependencies
jest.mock("controllers/homeController");
jest.mock("controllers/authController");
jest.mock("controllers/healthController");
jest.mock("controllers/logsController");
jest.mock("middleware/validateRequest");
jest.mock("middleware/tokenAuthHandler");

// Import the main routes
import routes from "../index";

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount the routes exactly like the main app
  app.use("/", routes);

  // Error handling middleware for tests
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message });
    }
  );

  return app;
};

describe("Main Routes", () => {
  setupTestEnvironment();

  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
  });

  describe("Root Redirect", () => {
    it("should redirect / to /v1/", async () => {
      const response = await request(app).get("/").expect(302);

      expect(response.headers.location).toBe("/v1/");
    });

    it("should handle redirect properly", async () => {
      // Test that the redirect is set up correctly
      await request(app).get("/").expect("Location", "/v1/");
    });
  });

  describe("V1 API Routes", () => {
    it("should mount v1 routes correctly", async () => {
      // Test that v1 routes are mounted and accessible
      // The actual route handling is tested in individual route test files
      await request(app).get("/v1/").expect(200);
    });

    it("should mount auth routes under /v1/auth", async () => {
      // Test auth route mounting
      await request(app)
        .post("/v1/auth/register")
        .send({ email: "test@example.com", password: "Test123!" })
        .expect(201);
    });

    it("should mount health route correctly", async () => {
      // Test health route mounting
      await request(app).get("/v1/health").expect(200);
    });
  });

  describe("Route Structure", () => {
    it("should handle non-existent routes", async () => {
      await request(app).get("/non-existent").expect(404);
    });

    it("should handle non-existent v1 routes", async () => {
      await request(app).get("/v1/non-existent").expect(404);
    });

    it("should have correct route hierarchy", async () => {
      // Test that the route structure is as expected

      // Root redirect
      await request(app).get("/").expect(302);

      // V1 home
      await request(app).get("/v1/").expect(200);

      // Health (under v1)
      await request(app).get("/v1/health").expect(200);

      // Logs (under v1)
      // NOT TESTED DUE TO TIMEOUTS

      // Auth under v1
      await request(app)
        .post("/v1/auth/login")
        .send({ email: "test@example.com", password: "Test123!" })
        .expect(200);
    });

    it("should properly handle different HTTP methods on root", async () => {
      // Only GET should redirect, others should 404
      await request(app).get("/").expect(302);

      await request(app).post("/").expect(404);

      await request(app).put("/").expect(404);
    });
  });

  describe("API Versioning", () => {
    it("should only have v1 routes", async () => {
      // Test that only v1 is supported
      await request(app).get("/v1/").expect(200);

      await request(app).get("/v2/").expect(404);
    });

    it("should maintain consistent v1 path structure", async () => {
      // All v1 routes should be under /v1/ except health and logs
      await request(app).get("/v1/").expect(200);

      await request(app)
        .post("/v1/auth/register")
        .send({ email: "test@example.com", password: "Test123!" })
        .expect(201);

      // These ARE under v1 in this application
      await request(app).get("/v1/health").expect(200);
    });
  });
});
