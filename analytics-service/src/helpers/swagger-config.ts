import { DocumentBuilder } from '@nestjs/swagger';

export const SwaggerConfig = new DocumentBuilder()
    .setTitle('Guardian')
    .setOpenAPIVersion('3.2.0')
    .setDescription(
        'The Guardian is an innovative open-source platform that streamlines the creation, ' +
        'management, and verification of digital environmental assets. It leverages a customizable ' +
        'Policy Workflow Engine and Web3 technology to ensure transparent and fraud-proof operations, ' +
        'making it a key tool for transforming sustainability practices and carbon markets.'
    )
    .setVersion(process.env.npm_package_version)
    .setContact(
        'API developer',
        'https://hashgraph.com',
        'guardian@hashgraph.com'
    )
    .setLicense(
        'Apache 2.0',
        'http://www.apache.org/licenses/LICENSE-2.0.html'
    )
    .addServer(
        '/',
        'version 1.0'
    )
    .build();
