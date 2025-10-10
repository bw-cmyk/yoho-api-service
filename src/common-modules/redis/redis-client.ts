import Redis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
let REDIS_PORT = 16341;

try {
  REDIS_PORT = parseInt(process.env.REDIS_PORT);
} catch (e) {
  // error;
}
const redis = new Redis({
  host: REDIS_HOST,
  port: (REDIS_PORT || 16341).valueOf(),
  password: REDIS_PASSWORD,
});

export default redis;
