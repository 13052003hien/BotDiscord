const winston = require('winston');
const path = require('path');
require('winston/lib/winston/config');  // Add this line for colors support

// Custom log levels
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
    winston.format.errors({ stack: true }),
    winston.format.json()
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
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/debug.log'),
      level: 'debug'
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error'
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/combined.log')
    })
  ]
});

// Add source location to logs
const addSourceInfo = (info) => {
  const stack = new Error().stack;
  const callerLine = stack.split('\n')[3];
  const match = callerLine.match(/\((.+?):(\d+):\d+\)$/);
  if (match) {
    info.file = path.basename(match[1]);
    info.line = match[2];
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
