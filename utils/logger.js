const winston = require('winston');
const { createLogger, format, transports } = winston;
const { combine, timestamp, json, errors, metadata, printf } = format;
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const util = require('util');
const os = require('os');

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}] ${message}`;
    
    if (stack) {
        log += `\n${stack}`;
    }
    
    // Add metadata if present (excluding internal fields)
    const filteredMeta = Object.keys(meta).reduce((acc, key) => {
        if (!['timestamp', 'level', 'message', 'stack', 'service'].includes(key)) {
            acc[key] = meta[key];
        }
        return acc;
    }, {});

    if (Object.keys(filteredMeta).length > 0) {
        log += `\n${util.inspect(filteredMeta, { depth: 3, colors: true })}`;
    }
    
    return log;
});

// Custom format for errors
const errorFormat = format((info) => {
    if (info instanceof Error) {
        return {
            ...info,
            message: info.message,
            stack: info.stack,
            name: info.name
        };
    }
    
    if (info.error instanceof Error) {
        info.message = info.error.message;
        info.stack = info.error.stack;
        info.name = info.error.name;
        delete info.error;
    }
    
    return info;
});

// Request context formatter
const requestContextFormat = format((info) => {
    // Add request context if available
    if (global.__requestContext) {
        info.requestId = global.__requestContext.requestId;
        info.userId = global.__requestContext.userId;
        info.ip = global.__requestContext.ip;
        info.userAgent = global.__requestContext.userAgent;
    }
    return info;
});

// System information
const systemInfo = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    loadAvg: os.loadavg(),
    uptime: os.uptime()
};

class AdvancedLogger {
    constructor() {
        this.logger = null;
        this._initializeLogger();
    }

    _initializeLogger() {
        const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
        
        // Base format for all transports
        const baseFormat = combine(
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
            errors({ stack: true }),
            metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] }),
            requestContextFormat(),
            errorFormat()
        );

        // File transport options
        const fileTransportOptions = {
            format: combine(
                baseFormat,
                json()
            ),
            maxSize: process.env.LOG_MAX_SIZE || '100m',
            maxFiles: process.env.LOG_MAX_FILES || '30d',
            zippedArchive: process.env.LOG_ZIPPED === 'true',
            createSymlink: true,
            symlinkName: 'current.log'
        };

        this.logger = createLogger({
            level: process.env.LOG_LEVEL || 'info',
            defaultMeta: {
                service: 'call-analytics-api',
                environment: process.env.NODE_ENV || 'development',
                ...systemInfo
            },
            transports: [
                // Console transport (development)
                new transports.Console({
                    format: combine(
                        format.colorize(),
                        baseFormat,
                        consoleFormat
                    ),
                    level: process.env.CONSOLE_LOG_LEVEL || 'debug',
                    silent: process.env.NODE_ENV === 'test'
                }),

                // Daily rotate file for all logs
                new DailyRotateFile({
                    ...fileTransportOptions,
                    filename: path.join(logDir, 'application-%DATE%.log'),
                    level: 'info'
                }),

                // Error logs (separate file)
                new DailyRotateFile({
                    ...fileTransportOptions,
                    filename: path.join(logDir, 'error-%DATE%.log'),
                    level: 'error'
                }),

                // HTTP request logs
                new DailyRotateFile({
                    ...fileTransportOptions,
                    filename: path.join(logDir, 'http-%DATE%.log'),
                    level: 'http'
                }),

                // Debug logs (development only)
                ...(process.env.NODE_ENV === 'development' ? [
                    new DailyRotateFile({
                        ...fileTransportOptions,
                        filename: path.join(logDir, 'debug-%DATE%.log'),
                        level: 'debug'
                    })
                ] : [])
            ],
            exceptionHandlers: [
                new transports.File({
                    filename: path.join(logDir, 'exceptions.log'),
                    format: combine(baseFormat, json())
                })
            ],
            rejectionHandlers: [
                new transports.File({
                    filename: path.join(logDir, 'rejections.log'),
                    format: combine(baseFormat, json())
                })
            ],
            exitOnError: false
        });

        // Add stream for Morgan HTTP logging
        this.stream = {
            write: (message) => {
                this.http(message.trim());
            }
        };

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.error('Uncaught Exception', { error });
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.error('Unhandled Rejection', { reason, promise });
            process.exit(1);
        });
    }

    // Log methods with structured metadata
    error(message, meta = {}) {
        this.logger.error(message, meta);
    }

    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    http(message, meta = {}) {
        this.logger.http(message, meta);
    }

    verbose(message, meta = {}) {
        this.logger.verbose(message, meta);
    }

    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }

    silly(message, meta = {}) {
        this.logger.silly(message, meta);
    }

    // Performance logging
    time(label) {
        if (this.logger.isLevelEnabled('debug')) {
            console.time(label);
        }
    }

    timeEnd(label, meta = {}) {
        if (this.logger.isLevelEnabled('debug')) {
            console.timeEnd(label);
            this.debug(`Performance: ${label}`, {
                ...meta,
                duration: console._times && console._times[label] ? console._times[label] : 'unknown'
            });
        }
    }

    // Database query logging
    query(query, duration, collection, operation) {
        if (this.logger.isLevelEnabled('debug')) {
            this.debug('Database Query', {
                collection,
                operation,
                duration: `${duration}ms`,
                query: this._sanitizeQuery(query)
            });
        }
    }

    // API request logging
    apiRequest(req, res, duration, error = null) {
        const logData = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            userId: req.user ? req.user.id : 'anonymous'
        };

        if (error) {
            logData.error = error.message;
            this.http('API Request Error', logData);
        } else if (res.statusCode >= 400) {
            this.warn('API Request Warning', logData);
        } else {
            this.http('API Request', logData);
        }
    }

    // Audit logging for security events
    audit(event, user, details = {}) {
        this.info('Audit Event', {
            event,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            ...details,
            timestamp: new Date().toISOString()
        });
    }

    // Business metrics logging
    metric(name, value, tags = {}) {
        this.info('Business Metric', {
            metric: name,
            value: typeof value === 'number' ? value : parseFloat(value) || 0,
            tags,
            timestamp: new Date().toISOString()
        });
    }

    // Helper methods
    _sanitizeQuery(query) {
        try {
            // Remove sensitive data from queries
            const sanitized = { ...query };
            const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'creditCard', 'ssn'];
            
            sensitiveFields.forEach(field => {
                if (sanitized[field]) {
                    sanitized[field] = '***REDACTED***';
                }
            });
            
            return sanitized;
        } catch (error) {
            return { error: 'Could not sanitize query' };
        }
    }

    // Child logger with context
    child(context) {
        return this.logger.child(context);
    }

    // Flush logs (for testing and graceful shutdown)
    async flush() {
        return new Promise((resolve) => {
            this.logger.on('finish', () => resolve());
            this.logger.end();
        });
    }

    // Get current transport levels
    getLevels() {
        return this.logger.transports.map(t => ({
            name: t.name || t.constructor.name,
            level: t.level
        }));
    }

    // Dynamic log level change
    setLevel(level) {
        this.logger.level = level;
        this.logger.transports.forEach(transport => {
            if (transport.level !== 'http') { // Don't change HTTP level
                transport.level = level;
            }
        });
    }
}

// Singleton instance
const logger = new AdvancedLogger();

// Request context middleware
logger.withRequestContext = (req, res, next) => {
    const requestId = req.headers['x-request-id'] || require('crypto').randomUUID();
    
    global.__requestContext = {
        requestId,
        userId: req.user ? req.user.id : 'anonymous',
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.originalUrl
    };

    res.setHeader('X-Request-ID', requestId);
    
    // Clean up after request
    res.on('finish', () => {
        delete global.__requestContext;
    });

    next();
};

// Performance monitoring middleware
logger.performanceMiddleware = (req, res, next) => {
    const start = process.hrtime();
    
    res.on('finish', () => {
        const duration = process.hrtime(start);
        const durationMs = (duration[0] * 1000 + duration[1] / 1000000).toFixed(2);
        
        logger.apiRequest(req, res, durationMs);
    });

    next();
};

// Error handling middleware
logger.errorHandler = (error, req, res, next) => {
    const requestId = global.__requestContext?.requestId || 'unknown';
    
    logger.error('Unhandled Error', {
        error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code
        },
        requestId,
        url: req.originalUrl,
        method: req.method
    });

    res.status(error.status || 500).json({
        success: false,
        error: {
            message: process.env.NODE_ENV === 'production' 
                ? 'Internal server error' 
                : error.message,
            requestId,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        }
    });
};

module.exports = logger;