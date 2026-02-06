import { ExecutionContext, Injectable } from '@nestjs/common'
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
    ): TUser {
        if (err || !user) {
            const jwtInfo = info as JwtError | undefined
            if (jwtInfo?.name === 'JsonWebTokenError') {
                throw new WsException('Invalid token')
            } else if (jwtInfo?.name === 'TokenExpiredError') {
                throw new WsException('Token expired')
            }
            if (err instanceof Error) {
                throw err
            }
            throw new WsException('Unauthorized')
        }
        return user
    }
}
