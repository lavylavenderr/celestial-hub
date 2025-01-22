import { baseLogger } from 'index';
import { createClient } from 'redis';

const redisClient = createClient({ url: Bun.env.REDIS_URL });
redisClient.on('error', (err) => baseLogger.error(err));

await redisClient.connect();

export const setValue = async (key: string, value: string, expiration: number): Promise<void> => {
  await redisClient.set(key, value, { EX: 60 * expiration });
};

export const getValue = async (key: string): Promise<string | null> => {
  return redisClient.get(key);
};