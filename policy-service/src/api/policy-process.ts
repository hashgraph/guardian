import '../config.js'
import { COMMON_CONNECTION_CONFIG, DataBaseHelper, DatabaseServer, entities, Environment, ExternalEventChannel, IPFS, LargePayloadContainer, Logger, MessageBrokerChannel, MessageServer, NotificationService, OldSecretManager, Users, Workers } from '@guardian/common';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { BlockTreeGenerator } from '../policy-engine/block-tree-generator.js';
import { PolicyValidator } from '../policy-engine/block-validators/index.js';
import process from 'process';
import { CommonVariables } from '../helpers/common-variables.js';
import { PolicyEvents } from '@guardian/interfaces';
import { GridFSBucket } from 'mongodb';
import { SynchronizationService } from '../policy-engine/multi-policy-service/index.js';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

@Module({
    providers: [
        NotificationService,
    ]
})
class AppModule {}

const {
    policyId,
    policyServiceName,
    skipRegistration
} = JSON.parse(process.env.POLICY_START_OPTIONS);

process.env.SERVICE_CHANNEL = policyServiceName;

Promise.all([
    MikroORM.init<MongoDriver>({
        ...COMMON_CONNECTION_CONFIG,
        driverOptions: {
            useUnifiedTopology: true
        },
        ensureIndexes: true,
        entities
    }),
    MessageBrokerChannel.connect(policyServiceName),
    NestFactory.createMicroservice<MicroserviceOptions>(AppModule,{
        transport: Transport.NATS,
        options: {
            name: `${process.env.SERVICE_CHANNEL}`,
            servers: [
                `nats://${process.env.MQ_ADDRESS}:4222`
            ]
        },
    })
]).then(async values => {
    const [db, cn, app] = values;
    app.listen();
    DataBaseHelper.orm = db;
    // @ts-ignore
    DataBaseHelper.gridFS = new GridFSBucket(db.em.getDriver().getConnection().getDb());
    Environment.setLocalNodeProtocol(process.env.LOCALNODE_PROTOCOL);
    Environment.setLocalNodeAddress(process.env.LOCALNODE_ADDRESS);
    Environment.setNetwork(process.env.HEDERA_NET);

    const policyConfig = await DatabaseServer.getPolicyById(policyId);

    if (process.env.HEDERA_CUSTOM_NODES) {
        try {
            const nodes = JSON.parse(process.env.HEDERA_CUSTOM_NODES);
            Environment.setNodes(nodes);
        } catch (error) {
            await new Logger().warn(
                'HEDERA_CUSTOM_NODES field in settings: ' + error.message,
                ['POLICY', policyConfig.name, policyId.toString()]
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
            await new Logger().warn(
                'HEDERA_CUSTOM_MIRROR_NODES field in settings: ' +
                error.message,
                ['POLICY', policyConfig.name, policyId.toString()]
            );
            console.warn(error);
        }
    }
    MessageServer.setLang(process.env.MESSAGE_LANG);

    const channel = new MessageBrokerChannel(cn, policyServiceName);
    new CommonVariables().setVariable('channel', channel);

    new Logger().setConnection(cn);
    new BlockTreeGenerator().setConnection(cn);
    IPFS.setChannel(channel);
    new ExternalEventChannel().setChannel(channel);
    await new OldSecretManager().setConnection(cn).init();
    await new Users().setConnection(cn).init();
    const workersHelper = new Workers();
    await workersHelper.setConnection(cn).init();;
    workersHelper.initListeners();

    // try {
    new Logger().info(`Process for with id ${policyId} was started started PID: ${process.pid}`, ['POLICY', policyId]);

    const generator = new BlockTreeGenerator();
    const policyValidator = new PolicyValidator(policyConfig);

    const policyModel = await generator.generate(policyConfig, skipRegistration, policyValidator);
    if ((policyModel as { type: 'error', message: string }).type === 'error') {
        await generator.publish(PolicyEvents.POLICY_READY, {
            policyId: policyId.toString(),
            error: (policyModel as { type: 'error', message: string }).message
        });
        process.exit(0);
        // throw new Error((policyModel as {type: 'error', message: string}).message);
    }

    const synchronizationService = new SynchronizationService(policyConfig);
    synchronizationService.start();

    generator.getPolicyMessages(PolicyEvents.DELETE_POLICY, policyId, () => {
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

    new Logger().info('Start policy', ['POLICY', policyConfig.name, policyId.toString()]);
    // } catch (e) {
    //     process.exit(500);
    // }
});
