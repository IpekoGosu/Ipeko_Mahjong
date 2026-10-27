import {
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { WsException } from '@nestjs/websockets'
import type { Socket } from 'socket.io'
import { ClsService } from 'nestjs-cls'
import type { Request } from 'express'
import {
    AppClsStore,
    isAuthenticatedUser,
} from '@src/common/interface/cls-store.interface'

interface JwtError extends Error {
    name: string
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly cls: ClsService<AppClsStore>) {
        super()
    }

    override getRequest(
        context: ExecutionContext,
    ): Request | Socket['handshake'] {
        if (context.getType() === 'ws') {
            const client = context.switchToWs().getClient<Socket>()
            return client.handshake
        }
        return context.switchToHttp().getRequest<Request>()
    }

    override handleRequest<TUser>(
        err: Error | null,
        user: TUser,
        info: JwtError | undefined,
        context: ExecutionContext,
    ): TUser {
        const isWs = context.getType() === 'ws'

        if (err || !user) {
            let exception: Error

            if (info?.name === 'JsonWebTokenError') {
                exception = isWs
                    ? new WsException('Invalid token')
                    : new UnauthorizedException('Invalid token')
            } else if (info?.name === 'TokenExpiredError') {
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

        // Use the type guard to set the user in CLS context safely
        if (typeof user === 'object' && isAuthenticatedUser(user)) {
            this.cls.set('user', user)
        }

        return user
    }
}
