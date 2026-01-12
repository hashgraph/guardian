import { AISuggestionService } from './helpers/suggestions.js';
import { aiSuggestionsAPI } from './api/service/ai-suggestions-service.js';
import { AISuggestionsDB } from './helpers/ai-suggestions-db.js';
import { AIManager } from './ai-manager.js';
import { ApplicationState, JwtServicesValidator, MessageBrokerChannel, mongoForLoggingInitialization, OldSecretManager, PinoLogger, pinoLoggerInitialization } from '@guardian/common';
import * as process from 'node:process';
import { ApplicationStates } from '@guardian/interfaces';

Promise.all([
    MessageBrokerChannel.connect('AI_SERVICE'),
    mongoForLoggingInitialization()
]).then(async values => {
    const [cn, loggerMongo] = values;

    const logger: PinoLogger = pinoLoggerInitialization(loggerMongo);
    await new OldSecretManager().setConnection(cn).init();
    const jwtServiceName = 'AI_SERVICE';

    JwtServicesValidator.setServiceName(jwtServiceName);

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
