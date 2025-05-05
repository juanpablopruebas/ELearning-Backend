import { Redis } from "ioredis";
import "dotenv/config";
 
const redisClient = () => {
  if (process.env.REDIS_URL) {
    console.log("Connecting to Redis");
    return process.env.REDIS_URL;
  }
  throw new Error("Redis URL not found");
};

export const redis = new Redis(redisClient());
