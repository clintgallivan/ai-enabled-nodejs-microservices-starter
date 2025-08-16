import { createClient } from "redis";
import logger from "../../utils/logger";

const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.on("error", err => logger.error("Redis Client Error", { error: err }));

// Connect to Redis when the module is imported
redis.connect().catch(error => logger.error("Redis connection failed", { error }));

export default redis;
