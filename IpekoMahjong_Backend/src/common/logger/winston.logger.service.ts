import { Injectable, LoggerService } from '@nestjs/common'
import * as winston from 'winston'
import chalk from 'chalk'
import { convertUtcToKst } from '@src/common/utils/date.utils'
import { ENV } from '@src/common/utils/env'

@Injectable()
export class WinstonLoggerService implements LoggerService {
    private logger: winston.Logger

    constructor() {
        // Use process.env directly if ENV is not yet initialized
        const nodeEnv = process.env.NODE_ENV || ENV.NODE_ENV || 'development'
        const level =
            nodeEnv === 'test' || nodeEnv === 'production' ? 'warn' : 'info'

        this.logger = winston.createLogger({
            level: level,
            format: winston.format.combine(
                winston.format.timestamp({
                    format: () => {
                        const utcDate = new Date()
                        return convertUtcToKst(utcDate)
                    },
                }),
                winston.format.printf(
                    ({ timestamp, level, message, context }) => {
                        const contextStr =
                            typeof context === 'string' ? ` [${context}]` : ''
                        return `[${String(timestamp)}] ${level}:${contextStr} ${String(message)}`
                    },
                ),
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.printf(
                            ({ timestamp, level, message, context }) => {
                                let levelStr = level
                                if (level === 'info') {
                                    levelStr = chalk.green(level)
                                } else if (level === 'warn') {
                                    levelStr = chalk.yellow(level)
                                } else if (level === 'error') {
                                    levelStr = chalk.red(level)
                                }
                                const contextStr =
                                    typeof context === 'string'
                                        ? ` [${chalk.magenta(context)}]`
                                        : ''
                                return `[${chalk.cyan(String(timestamp))}] [${levelStr}]${contextStr} ${String(message)}`
                            },
                        ),
                    ),
                }),
            ],
        })
    }

    log(message: unknown, context?: string) {
        if (typeof message === 'string') {
            this.logger.info(message, { context })
        } else {
            this.logger.info(JSON.stringify(message, null, 0), { context })
        }
    }

    error(message: string, trace?: string, context?: string) {
        this.logger.error(`${message}${trace ? ` - ${trace}` : ''}`, {
            context,
        })
    }

    warn(message: string, context?: string) {
        this.logger.warn(message, { context })
    }

    debug(message: string, context?: string) {
        this.logger.debug(message, { context })
    }

    verbose(message: string, context?: string) {
        this.logger.verbose(message, { context })
    }
}
