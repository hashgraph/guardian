import { ApplicationState, Logger, MessageBrokerChannel, SettingsContainer } from '@guardian/common';
import { Worker } from './api/worker';
import { HederaSDKHelper } from './api/helpers/hedera-sdk-helper';

Promise.all([
    MessageBrokerChannel.connect('WORKERS_SERVICE')
]).then(async values => {
    const channelName = (process.env.SERVICE_CHANNEL || `worker.${Date.now()}`).toUpperCase()
    const [cn] = values;
    const channel = new MessageBrokerChannel(cn, 'worker');

    const logger = new Logger();
    logger.setChannel(channel);
    const state = new ApplicationState(channelName);
    state.setChannel(channel);

    HederaSDKHelper.setTransactionLogSender(async (data) => {
        await channel.request(`guardians.transaction-log-event`, data);
    });

    const settingsContainer = new SettingsContainer();
    settingsContainer.setChannel(channel);
    await settingsContainer.init('IPFS_STORAGE_API_KEY');

    const w = new Worker(channel, channelName);
    w.init();

    logger.info('Worker started', [channelName]);
}, (reason) => {
    console.log(reason);
    process.exit(0);
})
