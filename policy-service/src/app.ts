import {
    MessageBrokerChannel,
    ApplicationState,
    Logger
} from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { policyAPI } from '@api/policy.service';

export const obj = {};

Promise.all([
    MessageBrokerChannel.connect('policy-service')
]).then(async values => {
    const [cn] = values;

    new Logger().setConnection(cn);
    const state = new ApplicationState();
    await state.setServiceName('POLICY_SERVICE').setConnection(cn).init();
    await state.updateState(ApplicationStates.STARTED);

    /////////////

    state.updateState(ApplicationStates.INITIALIZING);

    await policyAPI(cn);

    await new Logger().info('Policy service started', ['GUARDIAN_SERVICE']);

    await state.updateState(ApplicationStates.READY);
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
