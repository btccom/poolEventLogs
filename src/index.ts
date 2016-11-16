import './lib/bootstrap';
import getLogger from './lib/logger';
import _ = require('lodash');
import uuid = require('node-uuid');
import kafka = require('kafka-node');
import http = require('http');
import fs = require('fs');
import SocketIO = require('socket.io');
import Redis = require('ioredis');
import moment = require('moment');
import socketAuth from './auth';
const logger = getLogger('service');

const LATEST_LOGS_COUNT = 100;
const RING_BUFFER_LENGTH = 10000;
const WINDOW_BUFFER_LENGTH = 2000;
const WINDOW_BUFFER_DURATION = 1000;      // ms

/// REDIS
logger.info(`connecting to redis`);
const redis = new Redis({
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    dropBufferSupport: true
});

redis.ping().then(() => {
    logger.info(`connected to redis`);
});

redis.on('error', e => {
    logger.error(`lost connection to redis`, e);
    process.exit();
});

/// SOCKET.IO
const app = http.createServer(handler);
const io = SocketIO(app);
io.use(socketAuth);
app.listen(process.env.PORT || 3000);
logger.info(`listening on ${process.env.PORT || 3000}`);

interface IUserMap {
    [puid: string]: {
        [id: string]: SocketIO.Socket;
    };
};

const userMap: IUserMap = {};
io.on('connection', async socket => {
    const puid = +socket.handshake.query.puid;
    (userMap[puid] || (userMap[puid] = {}))[socket.id] = socket;

    logger.debug(`connected, id = ${socket.id}, puid = ${puid}`);

    const ringBufferKey = makeKey(puid);
    const logs: IMinerActivity[] = (await redis.lrange(ringBufferKey, 0, LATEST_LOGS_COUNT - 1)).reverse().map(JSON.parse);
    if (logs.length) {
        socket.emit('latest_logs', {logs});
    }

    socket.on('disconnect', function () {
        logger.debug(`disconnected, id = ${socket.id}, puid = ${puid}`);
        if (!userMap[puid][socket.id]) return;

        delete userMap[puid][socket.id];

        if (Object.keys(userMap[puid]).length === 0) {
            delete userMap[puid];
        }
    });
});

function handler(req: http.IncomingMessage, res: http.ServerResponse) {
    fs.readFile(__dirname + '/../index.html', function (err, data) {
        if (err) {
            logger.error('read file error', err);
            res.writeHead(500);
            return res.end('Error loading index.html');
        }

        res.writeHead(200);
        res.end(data);
    });
}

/// KAFKA
logger.info(`kafkaConsumer starting`);
const client = new kafka.Client(process.env.ZK_CONNECTION_STRING, `bpool-event-logs-consumer.${process.env.HOST}`);
const offset = new kafka.Offset(client);
const topic = 'CommonEvents';
const consumer = new kafka.Consumer(client, [ { topic } ], {});
logger.info(`subscribe topic: ${topic}`);

consumer.on('offsetOutOfRange', (topic: kafka.OffsetRequest) => {
    topic.maxNum = 2;
    offset.fetch([topic], function (err, offsets) {
        if (err) {
            return console.error(err);
        }
        const min = Math.min(offsets[topic.topic][topic.partition]);
        consumer.setOffset(topic.topic, topic.partition, min);
    });
});
consumer.on('message', (message: ICommonEvents) => {
    logger.debug(`kafka message: ${JSON.stringify(message)}`);

    const event: IMinerActivityEvent = JSON.parse(message.value);
    const messageType = event.type;

    if (messageType !== 'miner_connect' && messageType !== 'miner_dead') {
        logger.warn(`invalid message type: ${messageType}`);
        return;
    }

    const minerActivity: IMinerActivity = {
        event_id: uuid.v4(),
        event_name: messageType,
        created_at: moment.utc(event.created_at, 'YYYY-MM-DD HH:mm:ss').unix(),
        content: {
            worker_name: event.content.worker_name,
        },
    };

    const key = makeKey(event.content.user_id);
    const value = JSON.stringify(minerActivity);
    redis.lpush(key, value);
    redis.ltrim(key, 0, RING_BUFFER_LENGTH - 1);

    if (!userMap[event.content.user_id]) return;
    const windowKey = makeWindowKey(event.content.user_id);
    redis.lpush(windowKey, value);
    redis.expire(windowKey, Math.ceil(WINDOW_BUFFER_DURATION / 1000));
});

consumer.on('error', (err: any) => {
    logger.error(`an error occurred`, err);
});

(async function digest() {
    const promises = Object.keys(userMap).map(async (puid: string) => {
        // just ignore the race condition
        const windowKey = makeWindowKey(+puid);
        const len = await redis.llen(windowKey);
        const skipCount = Math.max(0, len - WINDOW_BUFFER_LENGTH);
        const logs = (await redis.lrange(windowKey, 0, WINDOW_BUFFER_LENGTH - 1)).reverse().map(JSON.parse);
        await redis.del(windowKey);

        if (logs.length) {
            Object.keys(userMap[puid]).forEach(id => {
                userMap[puid][id].emit('logs', {
                    skipCount,
                    logs
                });
            });

            logger.debug(`emit puid = ${puid}, skipCount = ${skipCount}, logsCount = ${logs.length}`);
        }
    });

    await Promise.all(promises);

    setTimeout(digest, WINDOW_BUFFER_DURATION);
})();

function makeKey(puid: number): string {
    return `MA_${puid}`;
}

function makeWindowKey(puid: number): string {
    return `MA_${puid}_window`;
}
