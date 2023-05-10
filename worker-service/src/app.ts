import {
    ApplicationState, LargePayloadContainer,
    Logger,
    MessageBrokerChannel,
    ValidateConfiguration
} from '@guardian/common';
import { Worker } from './api/worker';
import { HederaSDKHelper } from './api/helpers/hedera-sdk-helper';
import { ApplicationStates } from '@guardian/interfaces';
import { decode } from 'jsonwebtoken';
import * as process from 'process';
import { OldSecretManager } from '@guardian/common/dist/secret-manager/old-style/old-secret-manager';
import { SecretManager } from '@guardian/common/dist/secret-manager';

Promise.all([
    MessageBrokerChannel.connect('WORKERS_SERVICE')
]).then(async values => {
    const channelName = (process.env.SERVICE_CHANNEL || `worker.${Date.now()}`).toUpperCase()
    const [cn] = values;
    const channel = new MessageBrokerChannel(cn, 'worker');
    const logger = new Logger();
    logger.setConnection(cn);
    const state = new ApplicationState();
    await state.setServiceName('WORKER').setConnection(cn).init();
    await state.updateState(ApplicationStates.STARTED);
    await new OldSecretManager().setConnection(cn).init();

    const validator = new ValidateConfiguration();

    let timer = null;
    validator.setValidator(async () => {
        if (timer) {
            clearInterval(timer);
        }
        const secretManager = SecretManager.New();
        let {IPFS_STORAGE_API_KEY} = await secretManager.getSecrets('apikey/ipfs');
        if (!IPFS_STORAGE_API_KEY) {
            IPFS_STORAGE_API_KEY= process.env.IPFS_STORAGE_API_KEY
            await secretManager.setSecrets('apikey/ipfs', { IPFS_STORAGE_API_KEY });
        }

        HederaSDKHelper.setTransactionLogSender(async (data) => {
            await channel.publish(`guardians.transaction-log-event`, data);
        });

        await state.updateState(ApplicationStates.INITIALIZING);
        const w = new Worker();
        await w.setConnection(cn).init();

        if (process.env.IPFS_PROVIDER === 'web3storage') {
            if (!IPFS_STORAGE_API_KEY) {
                return false;
            }

            try {
                const decoded = decode(IPFS_STORAGE_API_KEY);
                if (!decoded) {
                    return false
                }
            } catch (e) {
                return false
            }
        }
        if (process.env.IPFS_PROVIDER === 'local') {
            if (!process.env.IPFS_NODE_ADDRESS) {
                return false
            }
        }

        return true;
    });

    validator.setValidAction(async () => {
        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }
        await state.updateState(ApplicationStates.READY);
        logger.info('Worker started', [channelName]);
    });

    validator.setInvalidAction(async () => {
        timer = setInterval(async () => {
            await state.updateState(ApplicationStates.BAD_CONFIGURATION);
        }, 1000);
        logger.error('Worker not configured', [channelName]);
    })

    await validator.validate();
}, (reason) => {
    console.log(reason);
    process.exit(0);
})
