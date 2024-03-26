import { ApplicationState, LargePayloadContainer, Logger, MessageBrokerChannel } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { PolicyContainer } from './helpers/policy-container.js';
import { startMetricsServer } from './utils/metrics.js';

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

    // await new PolicyContainer().setConnection(cn).init();

    const c = new PolicyContainer();
    await c.setConnection(cn).init();

    const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
    if (Number.isInteger(maxPayload)) {
        new LargePayloadContainer().runServer();
    }
    await new Logger().info('Policy service started', ['POLICY_SERVICE']);

    await state.updateState(ApplicationStates.READY);

    startMetricsServer();
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
