import { Injectable, LoggerService } from '@nestjs/common'
import * as winston from 'winston'
import { format, toZonedTime } from 'date-fns-tz'
import chalk from 'chalk'

@Injectable()
export class WinstonLoggerService implements LoggerService {
    private logger: winston.Logger

    constructor() {
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp({
                    format: () => {
                        const timeZone = 'Asia/Seoul'
                        const utcDate = new Date()
                        const kstDate = toZonedTime(utcDate, timeZone)
                        return format(kstDate, 'yyyy-MM-dd HH:mm:ss')
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

    log(message: string) {
        this.logger.info(message)
    }

    error(message: string, trace: string) {
        this.logger.error(`${message} - ${trace}`)
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
