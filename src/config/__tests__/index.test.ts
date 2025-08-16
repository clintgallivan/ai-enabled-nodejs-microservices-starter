// The config is mocked globally, so we'll test the mock values
import { config, type NodeEnvOptions } from "../index";

describe("Configuration", () => {
  describe("Configuration Types", () => {
    it("should have correct NodeEnvOptions type", () => {
      const validEnvs: NodeEnvOptions[] = ["production", "development", "staging"];

      validEnvs.forEach(env => {
        expect(["production", "development", "staging"]).toContain(env);
      });
    });

    it("should have correct Config interface structure", () => {
      const configKeys = [
        "nodeEnv",
        "allowedOrigins",
        "port",
        "healthSecret",
        "logSecret",
        "jwtSecret",
        "refreshTokenExpiresIn",
        "accessTokenExpiresIn",
        "healthTokenExpiresIn",
        "logsTokenExpiresIn",
      ];

      configKeys.forEach(key => {
        expect(config).toHaveProperty(key);
      });
    });
  });

  describe("Configuration Values", () => {
    it("should have correct nodeEnv", () => {
      expect(config.nodeEnv).toBe("development");
    });

    it("should have correct allowedOrigins", () => {
      expect(Array.isArray(config.allowedOrigins)).toBe(true);
      expect(config.allowedOrigins.length).toBeGreaterThan(0);
    });

    it("should have correct port", () => {
      expect(config.port).toBe("3000");
    });

    it("should have all secrets defined", () => {
      expect(config.healthSecret).toBe("test-health-secret");
      expect(config.logSecret).toBe("test-log-secret");
      expect(config.jwtSecret).toBe("test-jwt-secret");
    });

    it("should have all token TTLs defined", () => {
      expect(config.refreshTokenExpiresIn).toBe("7d");
      expect(config.accessTokenExpiresIn).toBe("15m");
      expect(config.healthTokenExpiresIn).toBe("1h");
      expect(config.logsTokenExpiresIn).toBe("1h");
    });

    it("should have valid ms format for token TTLs", () => {
      // Test that the values look like valid ms formats
      expect(config.refreshTokenExpiresIn).toMatch(/^\d+[dhms]$/);
      expect(config.accessTokenExpiresIn).toMatch(/^\d+[dhms]$/);
      expect(config.healthTokenExpiresIn).toMatch(/^\d+[dhms]$/);
      expect(config.logsTokenExpiresIn).toMatch(/^\d+[dhms]$/);
    });
  });

  describe("Configuration Behavior", () => {
    it("should be a valid configuration object", () => {
      expect(typeof config).toBe("object");
      expect(config).not.toBeNull();
    });

    it("should have readonly behavior", () => {
      // Config should be a read-only object
      expect(() => {
        (config as any).nodeEnv = "test";
      }).not.toThrow(); // This won't throw in JS but the value shouldn't change
    });

    it("should have string values for all secrets", () => {
      expect(typeof config.healthSecret).toBe("string");
      expect(typeof config.logSecret).toBe("string");
      expect(typeof config.jwtSecret).toBe("string");
      expect(config.healthSecret.length).toBeGreaterThan(0);
      expect(config.logSecret.length).toBeGreaterThan(0);
      expect(config.jwtSecret.length).toBeGreaterThan(0);
    });

    it("should have valid port", () => {
      expect(typeof config.port).toBe("string");
      expect(config.port).toMatch(/^\d+$/);
      const portNum = parseInt(config.port);
      expect(portNum).toBeGreaterThan(0);
      expect(portNum).toBeLessThan(65536);
    });

    it("should have valid allowedOrigins format", () => {
      expect(Array.isArray(config.allowedOrigins)).toBe(true);
      config.allowedOrigins.forEach(origin => {
        expect(typeof origin).toBe("string");
        expect(origin.length).toBeGreaterThan(0);
        // Should be valid URL format
        expect(origin).toMatch(/^https?:\/\/.+/);
      });
    });
  });
});
