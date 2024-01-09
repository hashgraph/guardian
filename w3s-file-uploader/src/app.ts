
import { LargePayloadContainer, MessageBrokerChannel } from '@guardian/common';
import { W3SFileUploader } from './api/w3s-file-uploader.service.js';
import process from 'process';

MessageBrokerChannel.connect('W3S_SERVICE').then(async (cn) => {
    try {
        if (!process.env.IPFS_STORAGE_KEY) {
            throw new Error('IPFS_STORAGE_KEY is empty');
        }

        if (!process.env.IPFS_STORAGE_PROOF) {
            throw new Error('IPFS_STORAGE_PROOF is empty');
        }

        await new W3SFileUploader().setConnection(cn).init();
        await new W3SFileUploader().registerListeners();

        const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
        if (Number.isInteger(maxPayload)) {
            new LargePayloadContainer().runServer();
        }
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }

}, (reason) => {
    console.log(reason);
    process.exit(0);
});
