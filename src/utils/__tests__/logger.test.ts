import logger, { LOGS_FILE_PATH } from "../logger";

describe("Logger", () => {
  describe("Logger Module", () => {
    it("should export LOGS_FILE_PATH constant", () => {
      expect(LOGS_FILE_PATH).toBe("logs/server.log");
    });

    it("should export a logger instance", () => {
      expect(logger).toBeDefined();
      expect(typeof logger).toBe("object");
    });

    it("should have all standard log methods", () => {
      const methods = ["error", "warn", "info", "debug"];

      methods.forEach(method => {
        expect(logger).toHaveProperty(method);
        expect(typeof logger[method as keyof typeof logger]).toBe("function");
      });
    });
  });

  describe("Logger Mock Behavior", () => {
    it("should be mockable for testing", () => {
      // Since this is the mock logger, test that it behaves as expected in tests
      const logSpy = jest.spyOn(logger, "info");

      const testMessage = "Test message";
      const testMetadata = { userId: "123", action: "test" };

      logger.info(testMessage, testMetadata);

      expect(logSpy).toHaveBeenCalledWith(testMessage, testMetadata);

      logSpy.mockRestore();
    });

    it("should handle different log levels", () => {
      const errorSpy = jest.spyOn(logger, "error");
      const warnSpy = jest.spyOn(logger, "warn");
      const debugSpy = jest.spyOn(logger, "debug");

      logger.error("Error message");
      logger.warn("Warning message");
      logger.debug("Debug message");

      expect(errorSpy).toHaveBeenCalledWith("Error message");
      expect(warnSpy).toHaveBeenCalledWith("Warning message");
      expect(debugSpy).toHaveBeenCalledWith("Debug message");

      errorSpy.mockRestore();
      warnSpy.mockRestore();
      debugSpy.mockRestore();
    });

    it("should handle metadata in log calls", () => {
      const infoSpy = jest.spyOn(logger, "info");

      const message = "User action";
      const metadata = {
        userId: "user-123",
        action: "login",
        timestamp: new Date().toISOString(),
      };

      logger.info(message, metadata);

      expect(infoSpy).toHaveBeenCalledWith(message, metadata);

      infoSpy.mockRestore();
    });
  });

  describe("Integration with Application", () => {
    it("should be importable without errors", () => {
      // This test ensures the logger module can be imported successfully
      // which validates the basic module structure and dependencies
      expect(() => {
        require("../logger");
      }).not.toThrow();
    });

    it("should maintain consistent interface across calls", () => {
      // Test that multiple calls to the same log method work consistently
      const infoSpy = jest.spyOn(logger, "info");

      logger.info("First message");
      logger.info("Second message");
      logger.info("Third message");

      expect(infoSpy).toHaveBeenCalledTimes(3);
      expect(infoSpy).toHaveBeenNthCalledWith(1, "First message");
      expect(infoSpy).toHaveBeenNthCalledWith(2, "Second message");
      expect(infoSpy).toHaveBeenNthCalledWith(3, "Third message");

      infoSpy.mockRestore();
    });
  });
});
