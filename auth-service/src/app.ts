import { createConnection } from 'typeorm';
import { fixtures } from '@helpers/fixtures';
import { AccountService } from '@api/account-service';
import { WalletService } from '@api/wallet-service';
import { ApplicationState, MessageBrokerChannel, Logger } from '@guardian/common';
import { ApplicationStates } from '@guardian/interfaces';

Promise.all([
    createConnection({
        type: 'mongodb',
        host: process.env.DB_HOST,
        database: process.env.DB_DATABASE,
        synchronize: true,
        logging: process.env.ENVIRONMENT !== 'production',
        useUnifiedTopology: true,
        entities: [
            'dist/entity/*.js'
        ],
        cli: {
            entitiesDir: 'dist/entity'
        }
    }),
    MessageBrokerChannel.connect('LOGGER_SERVICE'),
]).then(async ([_, cn]) => {
    const state = new ApplicationState('AUTH_SERVICE');
    const channel = new MessageBrokerChannel(cn, 'auth-service');
    state.setChannel(channel);
    state.updateState(ApplicationStates.INITIALIZING);
    await fixtures();

    new Logger().setChannel(channel);
    new AccountService(channel).registerListeners();
    new WalletService(channel).registerListeners();

    state.updateState(ApplicationStates.READY);
    new Logger().info('auth service started', ['AUTH_SERVICE']);
});
