import '../config'
import { Environment, MessageServer } from '@hedera-modules';
import {
    COMMON_CONNECTION_CONFIG,
    DB_DI, ExternalEventChannel, Logger, MessageBrokerChannel
} from '@guardian/common';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { BlockTreeGenerator } from '@policy-engine/block-tree-generator';
import { Wallet } from '@helpers/wallet';
import { Users } from '@helpers/users';
import { Workers } from '@helpers/workers';
import process from 'process';
import { IPFS } from '@helpers/ipfs';
import { CommonVariables } from '@helpers/common-variables';
import { PolicyEvents } from '@guardian/interfaces';

const {
    policy,
    policyId,
    policyServiceName,
    skipRegistration,
    resultsContainer
} = JSON.parse(process.env.POLICY_START_OPTIONS);

process.env.SERVICE_CHANNEL = policyServiceName;

Promise.all([
    MikroORM.init<MongoDriver>({
        ...COMMON_CONNECTION_CONFIG,
        driverOptions: {
            useUnifiedTopology: true
        },
        ensureIndexes: true,
    }),
    MessageBrokerChannel.connect(policyServiceName)
]).then(async values => {

    const [db, cn] = values;
    DB_DI.orm = db;

    Environment.setLocalNodeProtocol(process.env.LOCALNODE_PROTOCOL);
    Environment.setLocalNodeAddress(process.env.LOCALNODE_ADDRESS);
    Environment.setNetwork(process.env.HEDERA_NET);
    MessageServer.setLang(process.env.MESSAGE_LANG);

    const channel = new MessageBrokerChannel(cn, policyServiceName);
    new CommonVariables().setVariable('channel', channel);

    new Logger().setChannel(channel);
    new BlockTreeGenerator().setChannel(channel);
    IPFS.setChannel(channel);
    new ExternalEventChannel().setChannel(channel);
    new Wallet().setChannel(channel);
    new Users().setChannel(channel);
    const workersHelper = new Workers();
    workersHelper.setChannel(channel);
    workersHelper.initListeners();

    new Logger().info(`Process for with id ${policyId} was started started PID: ${process.pid}, SERVICE_CHANNEL: ${process.env.SERVICE_CHANNEL}`, ['POLICY', policyId]);

    const generator = new BlockTreeGenerator();
    await generator.generate(policy, skipRegistration, resultsContainer);

    channel.publish(PolicyEvents.POLICY_READY, { policyId: policyId.toString() });
    new Logger().info('Start policy', ['POLICY', policy.name, policyId.toString()]);

});
