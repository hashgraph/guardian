import { ApplicationState, LargePayloadContainer, Logger, MessageBrokerChannel, NotificationService, OldSecretManager, SecretManager, Users, ValidateConfiguration } from '@guardian/common';
import { Worker } from './api/worker.js';
import { HederaSDKHelper } from './api/helpers/hedera-sdk-helper.js';
import { ApplicationStates, GenerateUUIDv4 } from '@guardian/interfaces';
import * as process from 'process';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

@Module({
    providers: [
        NotificationService,
    ]
})
class AppModule { }

const channelName = (process.env.SERVICE_CHANNEL || `worker.${GenerateUUIDv4().substring(26)}`).toUpperCase();

Promise.all([
    MessageBrokerChannel.connect('WORKERS_SERVICE'),
    NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.NATS,
        options: {
            name: channelName,
            servers: [
                `nats://${process.env.MQ_ADDRESS}:4222`
            ]
        },
    }),
]).then(async values => {
    const [cn, app] = values;
    app.listen();
    const channel = new MessageBrokerChannel(cn, 'worker');
    const logger = new Logger();
    logger.setConnection(cn);
    await new Users().setConnection(cn).init();
    const state = new ApplicationState();
    await state.setServiceName('WORKER').setConnection(cn).init();
    await state.updateState(ApplicationStates.STARTED);
    await new OldSecretManager().setConnection(cn).init();

    const validator = new ValidateConfiguration();

    let timer = null;
    validator.setValidator(async () => {
        if (timer) {
            clearInterval(timer);
        }

        if (process.env.IPFS_PROVIDER === 'local' && !process.env.IPFS_NODE_ADDRESS) {
            logger.error('IPFS_NODE_ADDRESS must be set if IPFS_PROVIDER is `local`', [channelName, 'WORKER']);
            return false
        }

        let IPFS_STORAGE_KEY: string;
        let IPFS_STORAGE_PROOF: string;
        let IPFS_STORAGE_API_KEY: string;

        const secretManager = SecretManager.New();
        if (process.env.IPFS_PROVIDER === 'web3storage') {
            const keyAndProof = await secretManager.getSecrets('apikey/ipfs');
            if (!keyAndProof?.IPFS_STORAGE_API_KEY) {
                IPFS_STORAGE_KEY = process.env.IPFS_STORAGE_KEY;
                IPFS_STORAGE_PROOF = process.env.IPFS_STORAGE_PROOF;
                await secretManager.setSecrets('apikey/ipfs', { IPFS_STORAGE_API_KEY: `${IPFS_STORAGE_KEY};${IPFS_STORAGE_PROOF}` });
            } else {
                const [key, proof] = keyAndProof.IPFS_STORAGE_API_KEY.split(';')
                IPFS_STORAGE_KEY = key;
                IPFS_STORAGE_PROOF = proof;
            }
        }

        if (process.env.IPFS_PROVIDER === 'filebase') {
            const key = await secretManager.getSecrets('apikey/ipfs');
            if (!key?.IPFS_STORAGE_API_KEY) {
                IPFS_STORAGE_API_KEY = process.env.IPFS_STORAGE_API_KEY;
                await secretManager.setSecrets('apikey/ipfs', { IPFS_STORAGE_API_KEY });
            } else {
                IPFS_STORAGE_API_KEY = key.IPFS_STORAGE_API_KEY;
            }
        }

        HederaSDKHelper.setTransactionLogSender(async (data) => {
            await channel.publish(`guardians.transaction-log-event`, data);
        });

        await state.updateState(ApplicationStates.INITIALIZING);
        const w = new Worker(IPFS_STORAGE_KEY, IPFS_STORAGE_PROOF, IPFS_STORAGE_API_KEY, channelName);
        await w.setConnection(cn).init();

        return true;
    });

    validator.setValidAction(async () => {
        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }
        await state.updateState(ApplicationStates.READY);
        logger.info('Worker started', [channelName, 'WORKER']);
    });

    validator.setInvalidAction(async () => {
        timer = setInterval(async () => {
            await state.updateState(ApplicationStates.BAD_CONFIGURATION);
        }, 1000);
        logger.error('Worker not configured', [channelName, 'WORKER']);
    })

    await validator.validate();
}, (reason) => {
    console.log(reason);
    process.exit(0);
})
