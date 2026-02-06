import '../config.js'
import {
    COMMON_CONNECTION_CONFIG,
    DatabaseServer,
    entities,
    Environment,
    ExternalEventChannel,
    GenerateTLSOptionsNats,
    IPFS,
    JwtServicesValidator,
    LargePayloadContainer,
    MessageBrokerChannel,
    MessageServer,
    mongoForLoggingInitialization,
    NotificationService,
    OldSecretManager,
    PinoLogger,
    pinoLoggerInitialization,
    TopicListener,
    Users,
    Wallet,
    Workers
} from '@guardian/common';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { BlockTreeGenerator } from '../policy-engine/block-tree-generator.js';
import { PolicyValidator } from '../policy-engine/block-validators/index.js';
import process from 'process';
import { CommonVariables } from '../helpers/common-variables.js';
import { PolicyEvents } from '@guardian/interfaces';
import { SynchronizationService } from '../policy-engine/multi-policy-service/index.js';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DEFAULT_MONGO } from '#constants';

@Module({
    providers: [
        NotificationService,
    ]
})
class AppModule { }

const {
    policyId,
    policyServiceName,
    skipRegistration,
    policyOwnerId
} = JSON.parse(process.env.POLICY_START_OPTIONS);

process.env.SERVICE_CHANNEL = policyServiceName;

Promise.all([
    MikroORM.init<MongoDriver>({
        ...COMMON_CONNECTION_CONFIG,
        driverOptions: {
            minPoolSize: parseInt(process.env.MIN_POOL_SIZE ?? DEFAULT_MONGO.MIN_POOL_SIZE, 10),
            maxPoolSize: parseInt(process.env.MAX_POOL_SIZE ?? DEFAULT_MONGO.MAX_POOL_SIZE, 10),
            maxIdleTimeMS: parseInt(process.env.MAX_IDLE_TIME_MS ?? DEFAULT_MONGO.MAX_IDLE_TIME_MS, 10)
        },
        ensureIndexes: true,
        entities
    }),
    MessageBrokerChannel.connect(policyServiceName),
    NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.NATS,
        options: {
            name: `${process.env.SERVICE_CHANNEL}`,
            servers: [
                `nats://${process.env.MQ_ADDRESS}:4222`
            ],
            tls: GenerateTLSOptionsNats()
        },
    }),
    mongoForLoggingInitialization()
]).then(async values => {
    const [db, cn, app, loggerMongo] = values;
    app.listen();

    DatabaseServer.connectBD(db);

    DatabaseServer.connectGridFS();

    Environment.setLocalNodeProtocol(process.env.LOCALNODE_PROTOCOL);
    Environment.setLocalNodeAddress(process.env.LOCALNODE_ADDRESS);

    const jwtServiceName = 'POLICY_SERVICE';
    JwtServicesValidator.setServiceName(jwtServiceName);

    await new OldSecretManager().setConnection(cn).init();

    const policyConfig = await DatabaseServer.getPolicyById(policyId);

    const logger: PinoLogger = pinoLoggerInitialization(loggerMongo);

    if (process.env.HEDERA_CUSTOM_NODES) {
        try {
            const nodes = JSON.parse(process.env.HEDERA_CUSTOM_NODES);
            Environment.setNodes(nodes);
        } catch (error) {
            await logger.warn(
                'HEDERA_CUSTOM_NODES field in settings: ' + error.message,
                ['POLICY', policyConfig.name, policyId.toString()],
                policyOwnerId
            );
            console.warn(error);
        }
    }
    if (process.env.HEDERA_CUSTOM_MIRROR_NODES) {
        try {
            const mirrorNodes = JSON.parse(
                process.env.HEDERA_CUSTOM_MIRROR_NODES
            );
            Environment.setMirrorNodes(mirrorNodes);
        } catch (error) {
            await logger.warn(
                'HEDERA_CUSTOM_MIRROR_NODES field in settings: ' +
                error.message,
                ['POLICY', policyConfig.name, policyId.toString()],
                policyOwnerId
            );
            console.warn(error);
        }
    }
    Environment.setNetwork(process.env.HEDERA_NET);
    MessageServer.setLang(process.env.MESSAGE_LANG);

    const channel = new MessageBrokerChannel(cn, policyServiceName);
    new CommonVariables().setVariable('channel', channel);

    new BlockTreeGenerator().setConnection(cn);
    IPFS.setChannel(channel);
    new ExternalEventChannel().setChannel(channel);
    await new Users().setConnection(cn).init();
    await new Wallet().setConnection(cn).init();
    await TopicListener.init(cn);

    const workersHelper = new Workers();
    await workersHelper.setConnection(cn).init();;
    workersHelper.initListeners();

    // try {
    await logger.info(`Process for with id ${policyId} was started started PID: ${process.pid}`, ['POLICY', policyId], policyOwnerId);

    const generator = new BlockTreeGenerator();
    const policyValidator = new PolicyValidator(policyConfig);

    const policyModel = await generator.generate(policyConfig, skipRegistration, policyValidator, logger, policyOwnerId);
    if ((policyModel as { type: 'error', message: string }).type === 'error') {
        await generator.publish(PolicyEvents.POLICY_READY, {
            policyId: policyId.toString(),
            error: (policyModel as { type: 'error', message: string }).message
        });
        process.exit(0);
        // throw new Error((policyModel as {type: 'error', message: string}).message);
    }

    const synchronizationService = new SynchronizationService(policyConfig, logger, policyOwnerId);
    synchronizationService.start();

    generator.getPolicyMessages(PolicyEvents.DELETE_POLICY, policyId, async (payload: {policyOwnerId: string | null}) => {
        await generator.destroyModel(policyId, logger, payload.policyOwnerId)
        synchronizationService.stop();
        process.exit(0);
    });

    generator.publish(PolicyEvents.POLICY_READY, {
        policyId: policyId.toString(),
        data: policyValidator.getSerializedErrors()
    });

    const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
    if (Number.isInteger(maxPayload)) {
        new LargePayloadContainer().runServer();
    }

    await logger.info('Start policy', ['POLICY', policyConfig.name, policyId.toString()], policyOwnerId);
    // } catch (e) {
    //     process.exit(500);
    // }
});
