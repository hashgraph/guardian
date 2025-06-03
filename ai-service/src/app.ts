import { AISuggestionService } from './helpers/suggestions.js';
import { aiSuggestionsAPI } from './api/service/ai-suggestions-service.js';
import { AISuggestionsDB } from './helpers/ai-suggestions-db.js';
import { AIManager } from './ai-manager.js';
import { ApplicationState, JwtServicesValidator, MessageBrokerChannel, mongoForLoggingInitialization, OldSecretManager, PinoLogger, pinoLoggerInitialization, SecretManager } from '@guardian/common';
import * as process from 'process';
import { ApplicationStates } from '@guardian/interfaces';

Promise.all([
    MessageBrokerChannel.connect('AI_SERVICE'),
    mongoForLoggingInitialization()
]).then(async values => {
    const [cn, loggerMongo] = values;

    const logger: PinoLogger = pinoLoggerInitialization(loggerMongo);
    await new OldSecretManager().setConnection(cn).init();
    const secretManager = SecretManager.New();
    const jwtServiceName = 'AI_SERVICE';

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

    const state = new ApplicationState();
    await state.setServiceName('AI_SERVICE').setConnection(cn).init();

    await state.updateState(ApplicationStates.INITIALIZING);
    await new AISuggestionService().setConnection(cn).init();
    await new AISuggestionsDB().setConnection(cn).init();

    try {
        const aiManager = new AIManager(logger);
        await aiSuggestionsAPI(aiManager, logger);
        await state.updateState(ApplicationStates.READY);
        await logger.info('Ai service started', ['AI_SERVICE']);
    } catch (error) {
        console.log(error);
        console.error(error);
        process.exit(0);
    }

}, (reason) => {
    console.log(reason);
    process.exit(0);
});
