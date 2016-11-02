///<reference path="../../typings/index.d.ts"/>

import Promise = require('bluebird');
import path = require('path');
import raven = require('raven');
import dotenv = require('dotenv');

// 替换全局 Promise 实现
global.Promise = Promise;

// 加载配置
dotenv.config({
    path: path.join(__dirname, '../.env'),
});

// 添加异常捕获
const ravenClient = new raven.Client(process.env.SENTRY_DSN);
if (process.env.APP_DEBUG == 'false') {
    ravenClient.patchGlobal();
}