import { ApplicationStates } from '@guardian/interfaces';
import { Web3Storage } from 'web3.storage';
import {
    MessageBrokerChannel,
    ApplicationState,
    Logger,
    SettingsContainer
} from '@guardian/common';
import { fileAPI } from './api/file.service';

Promise.all([
    MessageBrokerChannel.connect('IPFS_CLIENT')
]).then(async values => {
    const [cn] = values;
    const state = new ApplicationState('IPFS_CLIENT');
    const channel = new MessageBrokerChannel(cn, 'ipfs-client');

    new Logger().setChannel(channel);
    state.setChannel(channel);

    const settingsContainer = new SettingsContainer();
    settingsContainer.setChannel(channel);
    await settingsContainer.init('IPFS_STORAGE_API_KEY');

    const {IPFS_STORAGE_API_KEY} = settingsContainer.settings;

    state.updateState(ApplicationStates.INITIALIZING);
    await fileAPI(channel, new Web3Storage({ token: IPFS_STORAGE_API_KEY } as any));

    state.updateState(ApplicationStates.READY);
    new Logger().info('ipfs-client service started', ['IPFS_CLIENT']);
})
