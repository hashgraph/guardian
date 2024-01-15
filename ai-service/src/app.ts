import { MessageBrokerChannel } from './helpers/common/message-brokers-chanel';
import { AISuggestionService } from './helpers/suggestions';
import { aiSuggestionsAPI } from './api/service/ai-suggestions-service';
import { AISuggestionsDB } from './helpers/ai-suggestions-db';
import { AIManager } from './ai-manager';

Promise.all([
    MessageBrokerChannel.connect('AI_SERVICE')
]).then(async values => {
    const [cn] = values;

    await new AISuggestionService().setConnection(cn).init();
    await new AISuggestionsDB().setConnection(cn).init();

    console.log('ai service');
    const aiManager = new AIManager();

    try {
        await aiSuggestionsAPI(aiManager);
    } catch (error) {
        console.log(error);
        console.error(error);
        process.exit(0);
    }

}, (reason) => {
    console.log(reason);
    process.exit(0);
});
