import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'
import { ValidationPipe } from '@nestjs/common'
import * as dotenv from 'dotenv'

dotenv.config()

async function bootstrap() {
    const app = await NestFactory.create(AppModule)
    // winston logger
    app.useLogger(app.get(WinstonLoggerService))
    // validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // 유효하지 않은 속성은 자동으로 제거
            forbidNonWhitelisted: true, // 유효하지 않은 속성이 있으면 400 에러
            transform: true, // 클라이언트에서 받은 데이터를 DTO 클래스에 맞게 변환
        }),
    )

    await app.listen(process.env.PORT ?? 3000)
}
bootstrap()
