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
                winston.format.printf(({ timestamp, level, message }) => {
                    return `[${String(timestamp)}] ${level}: ${String(message)}`
                }),
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.printf(
                            ({ timestamp, level, message }) => {
                                let levelStr = level
                                if (level === 'info') {
                                    levelStr = chalk.green(level)
                                } else if (level === 'warn') {
                                    levelStr = chalk.yellow(level)
                                } else if (level === 'error') {
                                    levelStr = chalk.red(level)
                                }
                                return `[${chalk.cyan(String(timestamp))}] [${levelStr}] ${String(message)}`
                            },
                        ),
                    ),
                }),
            ],
        })
    }

    log(message: unknown) {
        this.logger.info(JSON.stringify(message, null, 0))
    }

    error(message: string, trace?: string) {
        this.logger.error(`${message}${trace ? ` - ${trace}` : ''}`)
    }

    warn(message: string) {
        this.logger.warn(message)
    }

    debug(message: string) {
        this.logger.debug(message)
    }

    verbose(message: string) {
        this.logger.verbose(message)
    }
}
