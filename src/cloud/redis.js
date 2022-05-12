const Redis = require('ioredis');
const moment = require('moment');

let redisClient_config = null;

function createClient() {
    if (redisClient_config === null) {
        redisClient_config = new Redis(process.env['REDIS_URL_ball1']);
        redisClient_config.on('error', function (err) {
            console.error('redisClient error', err)
        });
    }

    return redisClient_config
}

export function clearDB(){
    const redis = createClient();
    redis.flushdb();
}