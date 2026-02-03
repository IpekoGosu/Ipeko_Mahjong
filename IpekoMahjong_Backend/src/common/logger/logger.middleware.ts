import { Injectable, NestMiddleware } from '@nestjs/common'
import { WinstonLoggerService } from './winston.logger.service'
import { NextFunction, Request, Response } from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    constructor(private readonly logger: WinstonLoggerService) {}

    use(req: Request, res: Response, next: NextFunction) {
        // 요청 정보 로깅
        this.logger.log(
            `Request - ${req.method} ${req.originalUrl} - IP: ${req.ip} - User-Agent: ${req.headers['user-agent']}`,
        )

        // 요청 본문 로깅
        if (Object.keys(req.body).length) {
            this.logger.log(`Request Body: ${JSON.stringify(req.body)}`)
        }

        // 응답 본문 캡처
        const originalSend = res.send
        res.send = (body: unknown) => {
            res.locals.body = body // 응답 본문을 res.locals에 저장

            // // `body`가 배열인지 객체인지 확인
            // if (
            //     Array.isArray(body) ||
            //     (typeof body === 'object' && body !== null)
            // ) {
            //     this.logger.log(`Response Body: ${JSON.stringify(body)}`);
            // } else {
            //     // `body`가 배열도 아니고 객체도 아닐 경우
            //     this.logger.log(`Response Body: ${String(body)}`);
            // }

            return originalSend.call(res, body) // 원래의 send 메서드 호출
        }

        // 응답이 끝난 후 로깅
        res.on('finish', () => {
            this.logger.log(
                `Response - ${res.statusCode} ${req.originalUrl} - Response Body: ${res.locals.body}`,
            )
        })

        next()
    }
}
