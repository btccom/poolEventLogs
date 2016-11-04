/// <reference path="../../typings/index.d.ts" />
"use strict";
var Promise = require('bluebird');
var path = require('path');
var raven = require('raven');
var dotenv = require('dotenv');
// 替换全局 Promise 实现
global.Promise = Promise;
// 加载配置
dotenv.config({
    path: path.join(__dirname, '../../.env'),
});
// 添加异常捕获
var ravenClient = new raven.Client(process.env.SENTRY_DSN);
if (process.env.APP_DEBUG == 'false') {
    ravenClient.patchGlobal();
}
