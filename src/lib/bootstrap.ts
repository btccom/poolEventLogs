/// <reference path="../../typings/index.d.ts" />

import Promise = require('bluebird');
import path = require('path');
import raven = require('raven');
import dotenv = require('dotenv');

// replace es6 promise with bluebird
global.Promise = Promise;

// load config
dotenv.config({
    path: path.join(__dirname, '../../.env'),
});

// use sentry to capture exceptions
const ravenClient = new raven.Client(process.env.SENTRY_DSN);

if (process.env.APP_DEBUG === 'false') {
    ravenClient.patchGlobal();

    // Bluebird unhandledRejection
    process.on('unhandledRejection', function(reason: any, promise: Promise<any>) {
        throw reason;       // sentry will catch it
    });
}