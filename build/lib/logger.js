"use strict";
var path = require('path');
var winston = require('winston');
var moment = require('moment');
var cache = {};
function timestamp() {
    return moment().format('YYYY-MM-DD HH:mm:ss');
}
function LoggerFactory(name) {
    if (!cache[name]) {
        cache[name] = new (winston.Logger)({
            transports: [
                // new winston.transports.Console({
                //     level: 'debug',
                //     colorize: true,
                //     prettyPrint: true,
                //     timestamp,
                // }),
                new winston.transports.File({
                    level: process.env.APP_DEBUG == 'true' ? 'debug' : 'info',
                    filename: path.join(__dirname, '/../../log/', name + ".log"),
                    maxsize: 500 * 1024 * 1024,
                    maxFiles: 3,
                    json: false,
                    prettyPrint: true,
                    zippedArchive: false,
                    tailable: true,
                    timestamp: timestamp,
                })
            ]
        });
    }
    return cache[name];
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoggerFactory;
