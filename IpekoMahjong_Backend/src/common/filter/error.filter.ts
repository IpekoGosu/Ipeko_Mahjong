import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpStatus,
    HttpException,
} from '@nestjs/common'
import { CommonError } from '@src/common/error/common.error'
import { CommonErrorResponse } from '@src/common/response/common.response'
import { Request, Response } from 'express'
import { format, toZonedTime } from 'date-fns-tz'

@Catch(CommonError)
export class CommonErrorFilter implements ExceptionFilter {
    catch(exception: CommonError, host: ArgumentsHost) {
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>()
        const request = ctx.getRequest<Request>()
        const status = HttpStatus.INTERNAL_SERVER_ERROR

        const data = {
            statusCode: status,
            timestamp: format(
                toZonedTime(new Date(), 'Asia/Seoul'),
                'yyyy-MM-dd HH:mm:ss',
            ),
            path: request.url,
            error: exception.status,
            message: exception.message,
        }

        response.status(status).json(new CommonErrorResponse(data))
    }
}

interface ExceptionResponse {
    message: string | string[]
    error?: string
    statusCode?: number
}

@Catch(HttpException)
export class HttpErrorFilter implements ExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>()
        const request = ctx.getRequest<Request>()
        const status = exception.getStatus()
        const exceptionResponse = exception.getResponse()

        let message = exception.message
        if (
            typeof exceptionResponse === 'object' &&
            exceptionResponse !== null &&
            'message' in exceptionResponse
        ) {
            const resp = exceptionResponse as ExceptionResponse
            message = Array.isArray(resp.message)
                ? resp.message.join(', ')
                : resp.message
        }

        const data = {
            statusCode: status,
            timestamp: format(
                toZonedTime(new Date(), 'Asia/Seoul'),
                'yyyy-MM-dd HH:mm:ss',
            ),
            path: request.url,
            error: 'HTTP_ERROR',
            message: message,
        }

        response.status(status).json(new CommonErrorResponse(data))
    }
}
