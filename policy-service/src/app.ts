import { ApplicationState, LargePayloadContainer, Logger, MessageBrokerChannel, PinoLogger, pinoLoggerInitialization } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { PolicyContainer } from './helpers/policy-container.js';
import { startMetricsServer } from './utils/metrics.js';
import { mongoInitialization } from './helpers/mongo-initialization.js';

export const obj = {};

Promise.all([
    MessageBrokerChannel.connect('policy-service'),
    mongoInitialization()
]).then(async values => {
    const [cn, db] = values;

    const logger: PinoLogger = await pinoLoggerInitialization(db);

    new Logger().setConnection(cn);
    const state = new ApplicationState();
    await state.setServiceName('POLICY_SERVICE').setConnection(cn).init();
    await state.updateState(ApplicationStates.STARTED);

    /////////////

    state.updateState(ApplicationStates.INITIALIZING);

    // await new PolicyContainer().setConnection(cn).init();

    const c = new PolicyContainer(logger);
    await c.setConnection(cn).init();

    const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
    if (Number.isInteger(maxPayload)) {
        new LargePayloadContainer().runServer();
    }
    await logger.info('Policy service started', ['POLICY_SERVICE']);

    await state.updateState(ApplicationStates.READY);

    startMetricsServer();
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
