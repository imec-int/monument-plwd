import * as winston from 'winston';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const jsonLogFormat = winston.format.combine(winston.format.splat(), winston.format.json());
const singleLineColorizedFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.splat(),
    winston.format.colorize(),
    winston.format.simple()
);

const logOptions = {
    level: 'debug',
    format: jsonLogFormat,
    defaultMeta: { service: 'monument-diary-backend' },
    transports: [new winston.transports.Console()],
};
const logger = winston.createLogger(logOptions);

export const setLoggingLevel = function (level: LogLevel) {
    logger.level = level.toString();
};

export const setPrettify = (pretty = false) => {
    if (pretty) {
        logger.format = singleLineColorizedFormat;
    } else {
        logger.format = jsonLogFormat;
    }
};

export const initLogging = (opts: { prettify: boolean; logLevel: LogLevel }) => {
    setLoggingLevel(opts.logLevel);
    setPrettify(opts.prettify);
    return logger;
};

export default logger;
