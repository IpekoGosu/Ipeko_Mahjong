import { NestFactory } from '@nestjs/core'
import { AppModule } from '@src/app.module'
import cookieParser from 'cookie-parser'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { ENV, initializeEnv } from '@src/common/utils/env'
import { WinstonLoggerService } from '@src/common/logger/winston.logger.service'

async function bootstrap() {
    // Load environment variables (from .env or GSM)
    await initializeEnv()

    const app = await NestFactory.create(AppModule)
    app.enableCors({
        origin: ['http://localhost:5173'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        credentials: true,
    })
    app.use(cookieParser())
    app.useLogger(app.get(WinstonLoggerService))
    // Swagger
    const config = new DocumentBuilder()
        .setTitle('Ipeko Mahjong API')
        .setDescription('API documentation')
        .setVersion('1.0')
        .addBearerAuth()
        .addCookieAuth('access_token')
        .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api-docs', app, document)

    await app.listen(Number(ENV.PORT))
}
void bootstrap()
