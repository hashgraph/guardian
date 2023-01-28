import { IPFS } from '@helpers/ipfs';
import { Wallet } from '@helpers/wallet';
import { Users } from '@helpers/users';
import {
    MessageBrokerChannel,
    ApplicationState,
    Logger,
    ExternalEventChannel,
    DB_DI,
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
    MessageBrokerChannel.connect('policy-service')
]).then(async values => {
    const [cn] = values;
    const channel = new MessageBrokerChannel(cn, 'policy-service');

    new Logger().setChannel(channel);
    const state = new ApplicationState('POLICY_SERVICE');
    state.setChannel(channel);

    /////////////
    await state.updateState(ApplicationStates.STARTED);

    state.updateState(ApplicationStates.INITIALIZING);

    await policyAPI(channel);

    await new Logger().info('Policy service started', ['GUARDIAN_SERVICE']);

    await state.updateState(ApplicationStates.READY);
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
