if (process.env.NODE_ENV === "production") {
  require("module-alias/register");
}
import "dotenv/config";
import app from "./app";
import { config } from "./config";
import logger from "./utils/logger";

app.listen(config.port, () => {
  logger.info(`Server started`, {
    port: config.port,
    url: `http://localhost:${config.port}`,
  });
});
