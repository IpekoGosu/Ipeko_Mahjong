import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { WsException } from '@nestjs/websockets'
import { Socket } from 'socket.io'

interface JwtError extends Error {
    name: string
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    override getRequest(context: ExecutionContext): unknown {
        if (context.getType() === 'ws') {
            const client = context.switchToWs().getClient<Socket>()
            return client.handshake
        }
        return context.switchToHttp().getRequest<unknown>()
    }

    override handleRequest<TUser = unknown>(
        err: unknown,
        user: TUser,
        info: unknown,
        context: ExecutionContext,
    ): TUser {
        const isWs = context.getType() === 'ws'

        if (err || !user) {
            const jwtInfo = info as JwtError | undefined
            let exception: Error

            if (jwtInfo?.name === 'JsonWebTokenError') {
                exception = isWs
                    ? new WsException('Invalid token')
                    : new UnauthorizedException('Invalid token')
            } else if (jwtInfo?.name === 'TokenExpiredError') {
                exception = isWs
                    ? new WsException('Token expired')
                    : new UnauthorizedException('Token expired')
            } else if (err instanceof Error) {
                exception = err
            } else {
                exception = isWs
                    ? new WsException('Unauthorized')
                    : new UnauthorizedException()
            }
            throw exception
        }
        return user
    }
}
