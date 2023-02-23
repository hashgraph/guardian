import {
    MessageBrokerChannel,
    ApplicationState,
    Logger
} from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { policyAPI } from '@api/policy.service';
import { startMetricsServer } from './utils/metrics';

export const obj = {};

Promise.all([
    MessageBrokerChannel.connect('policy-service')
]).then(async values => {
    const [cn] = values;
    const channel = new MessageBrokerChannel(cn, 'policy-service');

    new Logger().setChannel(channel);
    const state = new ApplicationState('POLICY_SERVICE');
    state.setChannel(channel);
    await state.updateState(ApplicationStates.STARTED);

    /////////////

    state.updateState(ApplicationStates.INITIALIZING);

    await policyAPI(channel);

    await new Logger().info('Policy service started', ['GUARDIAN_SERVICE']);

    await state.updateState(ApplicationStates.READY);

    startMetricsServer();
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
