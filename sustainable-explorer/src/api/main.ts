import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiModule } from './api.module';
import {
    ensureAllNetworkDatabasesExist,
    getConfiguredNetworks,
} from '@shared/config/database.config';
import { resolveNestLogLevels } from '@shared/config/log-level';

async function bootstrap() {
    const logger = new Logger('SustainableExplorer:API');
    const networks = getConfiguredNetworks();

    logger.log(`Configured networks: ${networks.join(', ')}`);

    // Ensure every network's database exists before starting NestJS
    await ensureAllNetworkDatabasesExist();

    const app = await NestFactory.create(ApiModule, {
        logger: resolveNestLogLevels(),
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
    const corsOrigin = (process.env.API_CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)[0];
    const swaggerServerUrl = corsOrigin || `http://localhost:${parseInt(process.env.API_PORT || '3030', 10)}`;
    const swaggerConfig = new DocumentBuilder()
        .setTitle('Sustainable Explorer API')
        .setDescription('REST API for querying indexed Hedera Guardian sustainability data')
        .setVersion('1.0')
        .addTag('registries', 'Standard Registries')
        .addServer(swaggerServerUrl, 'Sustainable Explorer API Server')
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
    logger.log(`Example: http://localhost:${port}/api/v1/${networks[0]}/registries`);
}

bootstrap();
