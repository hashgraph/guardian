import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import process from 'node:process';

@Module({
    imports: [
        ClientsModule.register([{
            name: 'LOGGER',
            transport: Transport.NATS,
            options: {
                servers: [
                    `nats://${process.env.MQ_ADDRESS}:4222`
                ]
            }
        }]),
    ],
})
export class LoggerModule {}
