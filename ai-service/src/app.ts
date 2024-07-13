import { AISuggestionService } from './helpers/suggestions.js';
import { aiSuggestionsAPI } from './api/service/ai-suggestions-service.js';
import { AISuggestionsDB } from './helpers/ai-suggestions-db.js';
import { AIManager } from './ai-manager.js';
import { ApplicationState, MessageBrokerChannel, PinoLogger, pinoLoggerInitialization } from '@guardian/common';
import * as process from 'process';
import { ApplicationStates } from '@guardian/interfaces';
import { mongoInitialization } from './helpers/mongo-initialization';

Promise.all([
    MessageBrokerChannel.connect('AI_SERVICE'),
    mongoInitialization()
]).then(async values => {
    const [cn, db] = values;

    const logger: PinoLogger = await pinoLoggerInitialization(db);

    const state = new ApplicationState();
    await state.setServiceName('AI_SERVICE').setConnection(cn).init();

    await state.updateState(ApplicationStates.INITIALIZING);
    // new Logger().setConnection(cn);
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
