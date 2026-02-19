/* eslint-disable */
import { Injectable, NestMiddleware } from '@nestjs/common'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'
import { NextFunction, Request, Response } from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    constructor(private readonly logger: WinstonLoggerService) {}

    use(req: Request, res: Response, next: NextFunction) {
        // 요청 정보 로깅
        const requestLog = {
            Request: `${req.method} ${req.originalUrl} - IP: ${req.ip} - User-Agent: ${req.headers['user-agent']}`,
            RequestBody: null,
        }
        if (
            req.body &&
            typeof req.body === 'object' &&
            Object.keys(req.body as object).length
        ) {
            requestLog.RequestBody = req.body
        }
        this.logger.log(requestLog)

        // 응답 본문 캡처
        const originalSend = res.send
        res.send = (body: string | Buffer | object) => {
            res.locals.body = body // 응답 본문을 res.locals에 저장
            return originalSend.call(res, body) as Response // 원래의 send 메서드 호출
        }

        // 응답이 끝난 후 로깅
        res.on('finish', () => {
            const responseLog: { Response: string; Body: unknown } = {
                Response: `${res.statusCode} ${req.originalUrl}`,
                Body: null,
            }
            if (res.locals.body instanceof Buffer) {
                responseLog.Body = 'File Buffer'
            } else {
                responseLog.Body = JSON.parse(res.locals.body)
            }
            this.logger.log(responseLog)
        })

        next()
    }
}
