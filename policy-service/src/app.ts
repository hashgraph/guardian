import {
    MessageBrokerChannel,
    ApplicationState,
    Logger
} from '@guardian/common';
import { ApplicationStates, GenerateUUIDv4 } from '@guardian/interfaces';
import { policyAPI } from '@api/policy.service';

const SERVICE_CHANNEL = `policy-service-${GenerateUUIDv4()}`;

export const obj = {};

Promise.all([
    MessageBrokerChannel.connect(SERVICE_CHANNEL)
]).then(async values => {
    const [cn] = values;
    const channel = new MessageBrokerChannel(cn, SERVICE_CHANNEL);

    new Logger().setChannel(channel);
    const state = new ApplicationState('POLICY_SERVICE');
    state.setChannel(channel);
    await state.updateState(ApplicationStates.STARTED);

    /////////////

    state.updateState(ApplicationStates.INITIALIZING);

    await policyAPI(channel);

    await new Logger().info('Policy service started', ['GUARDIAN_SERVICE']);

    await state.updateState(ApplicationStates.READY);
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
