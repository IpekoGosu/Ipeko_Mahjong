import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ENV } from '@src/common/utils/dotenv'

async function bootstrap() {
    const app = await NestFactory.create(AppModule)
    app.enableCors({
        origin: ['http://localhost:5173'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
    })
    app.use(cookieParser())
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

    const config = new DocumentBuilder()
        .setTitle('Ipeko Mahjong API')
        .setDescription('API documentation')
        .setVersion('1.0')
        .addBearerAuth()
        .addCookieAuth('access_token')
        .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api-docs', app, document)

    await app.listen(ENV.PORT)
}
void bootstrap()
