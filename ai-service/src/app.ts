import { MessageBrokerChannel } from './helpers/common/message-brokers-chanel.js';
import { AISuggestionService } from './helpers/suggestions.js';
import { aiSuggestionsAPI } from './api/service/ai-suggestions-service.js';
import { AISuggestionsDB } from './helpers/ai-suggestions-db.js';
import { AIManager } from './ai-manager.js';
import * as process from 'process';
import { ApplicationState, Logger } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';

Promise.all([
    MessageBrokerChannel.connect('AI_SERVICE')
]).then(async values => {
    const [cn] = values;

    const state = new ApplicationState();
    await state.setServiceName('AI_SERVICE').setConnection(cn).init();

    state.updateState(ApplicationStates.INITIALIZING);
    new Logger().setConnection(cn);
    await new AISuggestionService().setConnection(cn).init();
    await new AISuggestionsDB().setConnection(cn).init();

    const aiManager = new AIManager();

    try {
        await aiSuggestionsAPI(aiManager);
        state.updateState(ApplicationStates.READY);
        new Logger().info('Ai service started', ['AI_SERVICE']);
    } catch (error) {
        console.log(error);
        console.error(error);
        process.exit(0);
    }

}, (reason) => {
    console.log(reason);
    process.exit(0);
});
