import { ApplicationState, Logger, MessageBrokerChannel, SettingsContainer } from '@guardian/common';
import { Worker } from './api/worker';

Promise.all([
    MessageBrokerChannel.connect('WORKERS_SERVICE')
]).then(async values => {
    const [cn] = values;
    const channel = new MessageBrokerChannel(cn, 'worker');

    const logger = new Logger();
    logger.setChannel(channel);
    const state = new ApplicationState(process.env.SERVICE_CHANNEL.toUpperCase());
    state.setChannel(channel);

    const settingsContainer = new SettingsContainer();
    settingsContainer.setChannel(channel);
    await settingsContainer.init('IPFS_STORAGE_API_KEY');

    const w = new Worker(channel);
    w.init();

    logger.info('Worker started', [process.env.SERVICE_CHANNEL.toUpperCase()]);
})
