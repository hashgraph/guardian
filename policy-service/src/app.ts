import { ApplicationState, JwtServicesValidator, LargePayloadContainer, MessageBrokerChannel, mongoForLoggingInitialization, OldSecretManager, PinoLogger, pinoLoggerInitialization, SecretManager } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';
import { PolicyContainer } from './helpers/policy-container.js';
import { startMetricsServer } from './utils/metrics.js';

export const obj = {};

Promise.all([
    MessageBrokerChannel.connect('policy-service'),
    mongoForLoggingInitialization()
]).then(async values => {
    const [cn, loggerMongo] = values;

    await new OldSecretManager().setConnection(cn).init();
    const secretManager = SecretManager.New();
    const jwtServiceName = 'POLICY_SERVICE';

    JwtServicesValidator.setSecretManager(secretManager)
    JwtServicesValidator.setServiceName(jwtServiceName)

    let { SERVICE_JWT_PUBLIC_KEY } = await secretManager.getSecrets(`publickey/jwt-service/${jwtServiceName}`);
    if (!SERVICE_JWT_PUBLIC_KEY) {
        SERVICE_JWT_PUBLIC_KEY = process.env.SERVICE_JWT_PUBLIC_KEY;
        if (SERVICE_JWT_PUBLIC_KEY?.length < 8) {
            throw new Error(`${jwtServiceName} service jwt keys not configured`);
        }
        await secretManager.setSecrets(`publickey/jwt-service/${jwtServiceName}`, {SERVICE_JWT_PUBLIC_KEY});
    }

    let { SERVICE_JWT_SECRET_KEY } = await secretManager.getSecrets(`secretkey/jwt-service/${jwtServiceName}`);

    if (!SERVICE_JWT_SECRET_KEY) {
        SERVICE_JWT_SECRET_KEY = process.env.SERVICE_JWT_SECRET_KEY;
        if (SERVICE_JWT_SECRET_KEY?.length < 8) {
            throw new Error(`${jwtServiceName} service jwt keys not configured`);
        }
        await secretManager.setSecrets(`secretkey/jwt-service/${jwtServiceName}`, {SERVICE_JWT_SECRET_KEY});
    }

    const logger: PinoLogger = pinoLoggerInitialization(loggerMongo);

    const state = new ApplicationState();
    await state.setServiceName('POLICY_SERVICE').setConnection(cn).init();
    await state.updateState(ApplicationStates.STARTED);

    state.updateState(ApplicationStates.INITIALIZING);

    // await new PolicyContainer().setConnection(cn).init();

    const c = new PolicyContainer(logger);
    await c.setConnection(cn).init();

    const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
    if (Number.isInteger(maxPayload)) {
        new LargePayloadContainer().runServer();
    }
    await logger.info('Policy service started', ['POLICY_SERVICE'], null);

    await state.updateState(ApplicationStates.READY);

    startMetricsServer();
}, (reason) => {
    console.log(reason);
    process.exit(0);
});
