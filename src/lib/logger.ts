import path = require('path');
import winston = require('winston');
import moment = require('moment');

let cache: ({[name: string]: winston.LoggerInstance}) = {};

function timestamp() {
    return moment().format('YYYY-MM-DD HH:mm:ss');
}

export default function LoggerFactory(name: string) {
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
                    level: process.env.APP_DEBUG === 'true' ? 'debug' : 'info',
                    filename: path.join(__dirname, '/../../log/', `${name}.log`),
                    maxsize: 500 * 1024 * 1024,
                    maxFiles: 3,
                    json: false,
                    prettyPrint: true,
                    zippedArchive: false,
                    tailable: true,
                    timestamp,
                })
            ]
        });
    }

    return cache[name];
}