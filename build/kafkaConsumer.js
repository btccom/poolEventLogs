"use strict";
require('./lib/bootstrap');
var logger_1 = require('./lib/logger');
var _ = require('lodash');
var uuid = require('node-uuid');
var kafka = require('kafka-node');
var http = require('http');
var SocketIO = require('socket.io');
var Redis = require('ioredis');
var logger = logger_1.default('kafkaConsumer');
/// REDIS
logger.info("connecting to redis");
var redis = new Redis({
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    dropBufferSupport: true
});
redis.ping().then(function () {
    logger.info("connected to redis");
});
redis.on('error', function (e) {
    logger.error("lost connection to redis", e);
    process.exit();
});
/// KAFKA
logger.info("kafkaConsumer starting");
var client = new kafka.Client(process.env.ZK_CONNECTION_STRING, "bpool-event-stream-consumer." + process.env.HOST);
var consumer = new kafka.Consumer(client, [
    {
        topic: 'CommonEvents'
    }
], {});
logger.info("subscribe topic: CommonEvents");
consumer.on('message', function (message) {
    logger.debug("kafka message: " + JSON.stringify(message));
    var event = JSON.parse(message.value);
    var messageType = event.type;
    if (messageType != 'miner_connect' && messageType != 'miner_dead') {
        logger.warn("invalid message type: " + messageType);
        return;
    }
    // user_id = 0 时为非法矿机，需要过滤
    if (event.content.user_id == 0)
        return;
    // MA for minerActivity
    var minerActivity = _.extend({
        id: uuid.v4(),
        created_at: Date.now(),
    }, event.content);
    var key = "MA_" + event.content.user_id;
    var value = JSON.stringify(minerActivity);
    redis.rpush(key, value);
    redis.ltrim(key, -500, -1); // 只保留队列最后 500 条日志
});
consumer.on('error', function (err) {
    logger.error("an error occurred", err);
});
/// SOCKET.IO
var app = http.createServer();
var io = SocketIO(app);
app.listen(process.env.PORT || 3000);
console.info("listening on " + (process.env.PORT || 3000));
var socketMap = {};
io.on('connection', function (socket) {
    socketMap['sfd'] = 'b';
});
