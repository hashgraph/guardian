import { IPFS } from '@helpers/ipfs';
import { Wallet } from '@helpers/wallet';
import { Users } from '@helpers/users';
import {
    MessageBrokerChannel,
    ApplicationState,
    Logger,
    ExternalEventChannel,
    DB_DI,
    Migration,
    COMMON_CONNECTION_CONFIG,
} from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import {
    Environment,
    MessageServer,
    TransactionLogger,
    TransactionLogLvl
} from '@hedera-modules';
import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { Workers } from '@helpers/workers';
import { policyAPI } from '@api/policy.service';

export const obj = {};

Promise.all([
    Migration({
        ...COMMON_CONNECTION_CONFIG,
        migrations: {
            path: 'dist/migrations',
            transactional: false
        }
    }),
    MikroORM.init<MongoDriver>({
        ...COMMON_CONNECTION_CONFIG,
        driverOptions: {
            useUnifiedTopology: true
        },
        ensureIndexes: true,
    }),
    MessageBrokerChannel.connect('POLICY_SERVICE')
]).then(async values => {
    const [_, db, cn] = values;
    DB_DI.orm = db;
    const channel = new MessageBrokerChannel(cn, 'policy');

    new Logger().setChannel(channel);
    const state = new ApplicationState('POLICY_SERVICE');
    state.setChannel(channel);

    /////////////
    await state.updateState(ApplicationStates.STARTED);

    Environment.setLocalNodeProtocol(process.env.LOCALNODE_PROTOCOL);
    Environment.setLocalNodeAddress(process.env.LOCALNODE_ADDRESS);
    Environment.setNetwork(process.env.HEDERA_NET);
    MessageServer.setLang(process.env.MESSAGE_LANG);
    TransactionLogger.init(channel, process.env.LOG_LEVEL as TransactionLogLvl);

    IPFS.setChannel(channel);
    new ExternalEventChannel().setChannel(channel);

    new Wallet().setChannel(channel);
    new Users().setChannel(channel);
    const workersHelper = new Workers();
    workersHelper.setChannel(channel);
    workersHelper.initListeners();

    state.updateState(ApplicationStates.INITIALIZING);

    await policyAPI(channel);

    await new Logger().info('Policy service started', ['GUARDIAN_SERVICE']);

    await state.updateState(ApplicationStates.READY);
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
