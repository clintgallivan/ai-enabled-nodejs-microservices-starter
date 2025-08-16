import request from "supertest";
import express from "express";
import { setupTestEnvironment } from "tests/helpers/testHelpers";

// Mock all external dependencies
jest.mock("controllers/authController");
jest.mock("middleware/validateRequest");
jest.mock("middleware/tokenAuthHandler");

// Import mocked controllers
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getHealthToken,
  getLogsToken,
} from "controllers/authController";

// Create a test app with the auth routes
import authRoutes from "../v1/authRoute";

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/v1/auth", authRoutes);

  // Error handling middleware for tests
  app.use(
    (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: err.message });
    }
  );

  return app;
};

describe("Auth Routes", () => {
  setupTestEnvironment();

  let app: express.Application;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();

    // Setup default mock implementations
    (registerUser as jest.Mock).mockImplementation(
      async (_req: express.Request, res: express.Response) => {
        res.status(201).json({
          token: "mock-access-token",
          refreshToken: "mock-refresh-token",
          user: {
            id: "mock-user-id",
            email: "test@example.com",
            planTier: "free",
            role: "user",
            createdAt: new Date().toISOString(),
          },
        });
      }
    );

    (loginUser as jest.Mock).mockImplementation(
      async (_req: express.Request, res: express.Response) => {
        res.status(200).json({
          token: "mock-access-token",
          refreshToken: "mock-refresh-token",
          user: {
            id: "mock-user-id",
            email: "test@example.com",
            planTier: "free",
            role: "user",
            createdAt: new Date().toISOString(),
          },
        });
      }
    );

    (refreshAccessToken as jest.Mock).mockImplementation(
      async (_req: express.Request, res: express.Response) => {
        res.status(200).json({
          token: "mock-new-access-token",
          refreshToken: "mock-new-refresh-token",
        });
      }
    );

    (logoutUser as jest.Mock).mockImplementation(
      async (_req: express.Request, res: express.Response) => {
        res.status(200).json({ message: "Logged out successfully" });
      }
    );

    (getHealthToken as jest.Mock).mockImplementation(
      (_req: express.Request, res: express.Response) => {
        res.json({ token: "mock-health-token" });
      }
    );

    (getLogsToken as jest.Mock).mockImplementation(
      (_req: express.Request, res: express.Response) => {
        res.json({ token: "mock-logs-token" });
      }
    );
  });

  describe("POST /v1/auth/register", () => {
    const validRegistrationData = {
      email: "test@example.com",
      password: "ValidPassword123!",
    };

    it("should register a user successfully", async () => {
      const response = await request(app)
        .post("/v1/auth/register")
        .send(validRegistrationData)
        .expect(201);

      expect(registerUser).toHaveBeenCalled();
      expect(response.body).toEqual({
        token: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: {
          id: "mock-user-id",
          email: "test@example.com",
          planTier: "free",
          role: "user",
          createdAt: expect.any(String),
        },
      });
    });

    it("should call registerUser with correct parameters", async () => {
      await request(app).post("/v1/auth/register").send(validRegistrationData);

      expect(registerUser).toHaveBeenCalledWith(
        expect.objectContaining({
          body: validRegistrationData,
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it("should return 409 when user already exists", async () => {
      // Override the mock for this specific test
      (registerUser as jest.Mock).mockImplementationOnce(
        async (_req: express.Request, res: express.Response) => {
          res.status(409).json({ error: "User already exists." });
        }
      );

      const response = await request(app)
        .post("/v1/auth/register")
        .send(validRegistrationData)
        .expect(409);

      expect(response.body).toEqual({
        error: "User already exists.",
      });
    });

    it("should handle route correctly", async () => {
      await request(app).post("/v1/auth/register").send(validRegistrationData);

      expect(registerUser).toHaveBeenCalled();
    });
  });

  describe("POST /v1/auth/login", () => {
    const validLoginData = {
      email: "test@example.com",
      password: "ValidPassword123!",
    };

    it("should login a user successfully", async () => {
      const response = await request(app).post("/v1/auth/login").send(validLoginData).expect(200);

      expect(loginUser).toHaveBeenCalled();
      expect(response.body).toEqual({
        token: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: expect.objectContaining({
          email: "test@example.com",
        }),
      });
    });

    it("should return 401 for invalid credentials", async () => {
      (loginUser as jest.Mock).mockImplementationOnce(
        async (_req: express.Request, res: express.Response) => {
          res.status(401).json({ error: "Invalid credentials." });
        }
      );

      const response = await request(app).post("/v1/auth/login").send(validLoginData).expect(401);

      expect(response.body).toEqual({
        error: "Invalid credentials.",
      });
    });

    it("should call loginUser with correct parameters", async () => {
      await request(app).post("/v1/auth/login").send(validLoginData);

      expect(loginUser).toHaveBeenCalledWith(
        expect.objectContaining({
          body: validLoginData,
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe("POST /v1/auth/refresh-token", () => {
    const validRefreshData = {
      refreshToken: "valid-refresh-token",
    };

    it("should refresh access token successfully", async () => {
      const response = await request(app)
        .post("/v1/auth/refresh-token")
        .send(validRefreshData)
        .expect(200);

      expect(refreshAccessToken).toHaveBeenCalled();
      expect(response.body).toEqual({
        token: "mock-new-access-token",
        refreshToken: "mock-new-refresh-token",
      });
    });

    it("should return 401 for invalid refresh token", async () => {
      (refreshAccessToken as jest.Mock).mockImplementationOnce(
        async (_req: express.Request, res: express.Response) => {
          res.status(401).json({ error: "Invalid refresh token" });
        }
      );

      const response = await request(app)
        .post("/v1/auth/refresh-token")
        .send(validRefreshData)
        .expect(401);

      expect(response.body).toEqual({
        error: "Invalid refresh token",
      });
    });

    it("should call refreshAccessToken with correct parameters", async () => {
      await request(app).post("/v1/auth/refresh-token").send(validRefreshData);

      expect(refreshAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          body: validRefreshData,
        }),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe("POST /v1/auth/logout", () => {
    it("should logout successfully", async () => {
      const response = await request(app)
        .post("/v1/auth/logout")
        .set("Authorization", "Bearer valid-token")
        .expect(200);

      expect(logoutUser).toHaveBeenCalled();
      expect(response.body).toEqual({
        message: "Logged out successfully",
      });
    });

    it("should handle logout with query parameters", async () => {
      await request(app)
        .post("/v1/auth/logout?all=true")
        .set("Authorization", "Bearer valid-token")
        .expect(200);

      expect(logoutUser).toHaveBeenCalled();
      // Check that the controller was called with a request containing the query parameter
      const callArgs = (logoutUser as jest.Mock).mock.calls[0];
      expect(callArgs[0].query.all).toBe("true");
    });
  });

  describe("GET /v1/auth/health-token", () => {
    it("should return health token", async () => {
      const response = await request(app)
        .get("/v1/auth/health-token")
        .set("Authorization", "Bearer admin-token")
        .expect(200);

      expect(getHealthToken).toHaveBeenCalled();
      expect(response.body).toEqual({
        token: "mock-health-token",
      });
    });

    it("should return 403 for non-admin users", async () => {
      (getHealthToken as jest.Mock).mockImplementationOnce(
        (_req: express.Request, res: express.Response) => {
          res.status(403).json({ error: "Forbidden: Admins only" });
        }
      );

      const response = await request(app)
        .get("/v1/auth/health-token")
        .set("Authorization", "Bearer user-token")
        .expect(403);

      expect(response.body).toEqual({
        error: "Forbidden: Admins only",
      });
    });
  });

  describe("GET /v1/auth/logs-token", () => {
    it("should return logs token", async () => {
      const response = await request(app)
        .get("/v1/auth/logs-token")
        .set("Authorization", "Bearer admin-token")
        .expect(200);

      expect(getLogsToken).toHaveBeenCalled();
      expect(response.body).toEqual({
        token: "mock-logs-token",
      });
    });

    it("should return 403 for non-admin users", async () => {
      (getLogsToken as jest.Mock).mockImplementationOnce(
        (_req: express.Request, res: express.Response) => {
          res.status(403).json({ error: "Forbidden: Admins only" });
        }
      );

      const response = await request(app)
        .get("/v1/auth/logs-token")
        .set("Authorization", "Bearer user-token")
        .expect(403);

      expect(response.body).toEqual({
        error: "Forbidden: Admins only",
      });
    });
  });

  describe("Route Structure", () => {
    it("should handle unsupported HTTP methods", async () => {
      await request(app).put("/v1/auth/register").expect(404);
    });

    it("should handle non-existent endpoints", async () => {
      await request(app).get("/v1/auth/non-existent").expect(404);
    });

    it("should mount routes correctly", async () => {
      // Test that routes are properly mounted and controllers are called
      await request(app)
        .post("/v1/auth/register")
        .send({ email: "test@example.com", password: "Test123!" });

      expect(registerUser).toHaveBeenCalled();
    });
  });
});
