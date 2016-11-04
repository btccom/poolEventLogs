import './lib/bootstrap';
import getLogger from './lib/logger';
import _ = require('lodash');
import uuid = require('node-uuid');
import kafka = require('kafka-node');
import http = require('http');
import SocketIO = require('socket.io');
import Redis = require('ioredis');
const logger = getLogger('kafkaConsumer');

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

/// KAFKA
logger.info(`kafkaConsumer starting`);
const client = new kafka.Client(process.env.ZK_CONNECTION_STRING, `bpool-event-stream-consumer.${process.env.HOST}`);
const consumer = new kafka.Consumer(client, [
    {
        topic: 'CommonEvents'
    }
], {});
logger.info(`subscribe topic: CommonEvents`);

consumer.on('message', (message:ICommonEvents) => {
    logger.debug(`kafka message: ${JSON.stringify(message)}`);

    const event:IMinerActivityEvent = JSON.parse(message.value);
    const messageType = event.type;

    if (messageType != 'miner_connect' && messageType != 'miner_dead') {
        logger.warn(`invalid message type: ${messageType}`);
        return;
    }

    // user_id = 0 时为非法矿机，需要过滤
    if (event.content.user_id == 0) return;

    // MA for minerActivity
    const minerActivity:IMinerActivity = _.extend<IMinerActivity>({
        id: uuid.v4(),
        created_at: Date.now(),
    }, event.content);

    const key = `MA_${event.content.user_id}`;
    const value = JSON.stringify(minerActivity);
    redis.rpush(key, value);
    redis.ltrim(key, -500, -1); // 只保留队列最后 500 条日志
});

consumer.on('error', (err:any) => {
    logger.error(`an error occurred`, err);
});

/// SOCKET.IO
const app = http.createServer();
const io = SocketIO(app);
app.listen(process.env.PORT || 3000);
console.info(`listening on ${process.env.PORT || 3000}`); 

const socketMap:({[puid:number]: SocketIO.Socket}) = {};

io.on('connection', socket => {
    //TODO get user id, save to the socketMap
});