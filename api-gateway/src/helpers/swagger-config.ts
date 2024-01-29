import { DocumentBuilder } from '@nestjs/swagger';

export const SwaggerConfig = new DocumentBuilder()
    .setTitle('Guardian')
    .setDescription(
        'The Guardian is a modular open-source solution that includes best-in-class identity ' +
        'management and decentralized ledger technology (DLT) libraries. At the heart of the ' +
        'Guardian solution is a sophisticated Policy Workflow Engine (PWE) that enables applications ' +
        'to offer a requirements-based tokenization implementation.'
    )
    .setVersion(process.env.npm_package_version)
    .setContact(
        'API developer',
        'https://envisionblockchain.com',
        'info@envisionblockchain.com'
    )
    .setLicense(
        'Apache 2.0',
        'http://www.apache.org/licenses/LICENSE-2.0.html'
    )
    .addServer(
        '/api/v1',
        'version 1.0'
    )
    .addSecurity(
        'bearerAuth',
        {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
        }
    )
    .build();
