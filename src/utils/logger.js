const winston = require('winston');
const path = require('path');  // Add this line
require('winston/lib/winston/config');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
};

const logger = winston.createLogger({
  levels,
  level: process.env.DEBUG ? 'trace' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.simple(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const debugInfo = process.env.DEBUG ? `[${meta.file}:${meta.line}]` : '';
          return `${timestamp} ${level.toUpperCase()}: ${debugInfo} ${message} ${
            Object.keys(meta).length > 0 && !meta.file ? JSON.stringify(meta, null, 2) : ''
          }`;
        })
      )
    })
  ]
});

// Simplified source location tracking
const addSourceInfo = (info) => {
  try {
    const stack = new Error().stack;
    const callerLine = stack.split('\n')[3];
    const match = callerLine.match(/\((.+?):(\d+):\d+\)$/);
    if (match) {
      info.file = path.basename(match[1]);
      info.line = match[2];
    }
  } catch (error) {
    info.file = 'unknown';
    info.line = '0';
  }
  return info;
};

// Wrap logger methods to add source information in debug mode
['error', 'warn', 'info', 'debug', 'trace'].forEach(level => {
  const originalMethod = logger[level];
  logger[level] = function (message, meta = {}) {
    if (process.env.DEBUG) {
      meta = addSourceInfo(meta);
    }
    originalMethod.call(logger, message, meta);
  };
});

module.exports = logger;
