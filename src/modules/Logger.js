/**
 *@module Logger
*/
import fs from 'fs';
import { ERROR_LEVELS, ENV } from './Constants';
import { ServerResponse } from 'http';

export default class Logger {

    /**
     *@param {string} errorLog - path to error log file
     *@param {string} accessLog - path to access log file
     *@param {Object} config - the server config object
    */
    constructor(errorLog, accessLog, config) {

        this.config = config;
        this.errorHandle = null;
        this.accessHandle = null;

        this.init(errorLog, accessLog);
    }

    /**
     *@type {string}
    */
    get [Symbol.toStringTag]() {
        return 'Logger';
    }

    /**
     * initializes the log files
     *@param {string} errorLog - path to error log file
     *@param {string} accessLog - path to access log file
    */
    init(errorLog, accessLog) {
        this.errorHandle = fs.openSync(errorLog, 'a');
        this.accessHandle = fs.openSync(accessLog, 'a');
        return this;
    }

    /**
     * close the handles once the server is closed
    */
    close() {
        fs.closeSync(this.errorHandle);
        fs.closeSync(this.accessHandle);
        return this;
    }

    /**
     * runs the error logging
    */
    logError(level, stack) {
        const now = new Date();
        fs.writeSync(
            this.errorHandle,
            `[${now.toUTCString()}] [${level}] ${stack}\r\n`
        );
        return this;
    }

    /**
     * logs access information
    */
    logAccess(req, res) {
        const log = `[${req.startTime.toUTCString()}] "${req.method} ${req.url}`
        +
        ` Http/${req.httpVersion}" ${res.statusCode}\r\n`;

        fs.writeSync(this.accessHandle, log);
        return this;
    }

    /**
     * log request response profile
     *@param {http.IncomingMessage} req - the request object
     *@param {http.ServerResponse} res - the response object
    */
    profile(req, res) {
        this.logAccess(req, res);
        if (this.config.env === ENV.DEVELOPMENT && this.config.profileRequest) {
            if (res.statusCode >= 400)
                console.log('%s: %s \x1b[31m%d\x1b[0m ~%dms ~%dms\x1b[0m', req.method, req.url,
                    res.statusCode, res.startTime - req.startTime, Date.now() - res.startTime);
            else
                console.log('%s: %s \x1b[32m%d\x1b[0m ~%dms ~%dms\x1b[0m', req.method, req.url,
                    res.statusCode, res.startTime - req.startTime, Date.now() - res.startTime);
        }
        return this;
    }

    /**
     * logs a fatal error to the file and ends the response
     *@param {http.ServerResponse} response - the response object
     *@param {Error} ex - the error that just occured
    */
    fatal({stack}, response, errorCode) {

        this.logError(ERROR_LEVELS.FATAL, stack);

        /* istanbul ignore else */
        if (response instanceof ServerResponse && !response.finished) {
            if (this.config.env === ENV.DEVELOPMENT)
                response.end(stack);
            else
                response.status(errorCode || 500).end();
        }
        return this;
    }

    /**
     * log error message to the console
     *@param {string} message - the error message
    */
    warn(message) {
        console.log('\x1b[1m\x1b[31m%s\x1b[0m', message);
        return this;
    }

    /**
     * log info message to the console
     *@param {string} message - the info message
    */
    info(message) {
        console.log('\x1b[1m\x1b[32m%s\x1b[0m', message);
        return this;
    }
}