import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiModule } from './api.module';
import { ensureDatabaseExists } from '@shared/config/database.config';

async function bootstrap() {
    const logger = new Logger('SustainableExplorer:API');

    await ensureDatabaseExists();

    const app = await NestFactory.create(ApiModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    app.useGlobalPipes(new ValidationPipe({
        transform: true,
        whitelist: true,
    }));

    app.enableCors({
        origin: (process.env.API_CORS_ORIGINS || 'http://localhost:3000')
            .split(',')
            .map(o => o.trim()),
    });

    // Swagger / OpenAPI
    const swaggerConfig = new DocumentBuilder()
        .setTitle('Sustainable Explorer API')
        .setDescription('REST API for querying indexed Hedera Guardian sustainability data')
        .setVersion('1.0')
        .addTag('registries', 'Standard Registries')
        .addServer('http://localhost:3030', 'Local development')
        .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
    });

    const port = parseInt(process.env.API_PORT || '3030', 10);
    await app.listen(port);

    logger.log(`API server running on http://localhost:${port}`);
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
    logger.log(`Registries endpoint: http://localhost:${port}/api/v1/registries`);
}

bootstrap();
