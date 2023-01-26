import { workerData, parentPort, isMainThread } from 'node:worker_threads';
import '../config'
import { Environment, MessageServer } from '@hedera-modules';
import {
    COMMON_CONNECTION_CONFIG,
    DB_DI, Logger, MessageBrokerChannel
} from '@guardian/common';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { BlockTreeGenerator } from '@policy-engine/block-tree-generator';
import { Wallet } from '@helpers/wallet';
import { Users } from '@helpers/users';
import { Workers } from '@helpers/workers';

/**
 * Init worker
 */
async function init() {

    const values = await Promise.all([
        MikroORM.init<MongoDriver>({
            ...COMMON_CONNECTION_CONFIG,
            driverOptions: {
                useUnifiedTopology: true
            },
            ensureIndexes: true,
        }),
        MessageBrokerChannel.connect('POLICY_SERVICE')
    ])

    const [db, cn] = values;
    DB_DI.orm = db;

    Environment.setLocalNodeProtocol(process.env.LOCALNODE_PROTOCOL);
    Environment.setLocalNodeAddress(process.env.LOCALNODE_ADDRESS);
    Environment.setNetwork(process.env.HEDERA_NET);
    MessageServer.setLang(process.env.MESSAGE_LANG);

    const channel = new MessageBrokerChannel(cn, 'policy-instance' + Date.now());

    new Logger().setChannel(channel);
    new Wallet().setChannel(channel);
    new Users().setChannel(channel);
    const workersHelper = new Workers();
    workersHelper.setChannel(channel);
    workersHelper.initListeners();
}

parentPort.on('message', async (m) => {
    switch (m.type) {
        case 'GENERATE':
            console.log(workerData);
            const {
                policy,
                // policyId,
                skipRegistration,
                resultsContainer
            } = workerData;
            const generator = new BlockTreeGenerator();
            const p = await generator.generate(policy, skipRegistration, resultsContainer);
            console.log(p);
            break;

        default:
            throw new Error('Unknown message' + m.type);
    }
});

if (!isMainThread) {
    init().then(() => {
        parentPort.postMessage({
            type: 'INITIALIZED'
        })
    });
}
