import {
    ApplicationState,
    Logger,
    MessageBrokerChannel,
    SettingsContainer,
    ValidateConfiguration
} from '@guardian/common';
import { Worker } from './api/worker';
import { HederaSDKHelper } from './api/helpers/hedera-sdk-helper';
import { ApplicationStates } from '@guardian/interfaces';
import { decode } from 'jsonwebtoken';

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
    await state.updateState(ApplicationStates.STARTED);

    HederaSDKHelper.setTransactionLogSender(async (data) => {
        await channel.request(`guardians.transaction-log-event`, data);
    });

    const settingsContainer = new SettingsContainer();
    settingsContainer.setChannel(channel);
    await settingsContainer.init('IPFS_STORAGE_API_KEY');

    const validator = new ValidateConfiguration();

    validator.setValidator(async () => {
        if (!settingsContainer.settings.IPFS_STORAGE_API_KEY) {
            return false;
        }

        try {
            const decoded = decode(settingsContainer.settings.IPFS_STORAGE_API_KEY) as any;
            if (decoded.iss !== 'web3-storage') {
                return false;
            }
        } catch (e) {
            return false
        }

        return true;
    });

    validator.setValidAction(async () => {
        await state.updateState(ApplicationStates.INITIALIZING);
        const w = new Worker(channel, channelName);
        w.init();

        await state.updateState(ApplicationStates.READY);
        logger.info('Worker started', [channelName]);
    });

    validator.setInvalidAction(async () => {
        await state.updateState(ApplicationStates.BAD_CONFIGURATION);
    });

    await validator.validate();
}, (reason) => {
    console.log(reason);
    process.exit(0);
})
