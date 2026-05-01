// file: src/queue/queue.ts
import { RedisOptions } from "ioredis";

export const NO_QUEUE = false;

export const workerConnection: RedisOptions | null = process.env.REDIS_URL
  ? {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      // @ts-ignore
      url: process.env.REDIS_URL,
    }
  : null;
