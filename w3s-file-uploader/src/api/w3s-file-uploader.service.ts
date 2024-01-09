import {
    MessageError,
    MessageResponse,
    NatsService,
    Singleton,
} from '@guardian/common';
import { GenerateUUIDv4, W3SEvents } from '@guardian/interfaces';
import { CarReader } from '@ipld/car';
import * as Delegation from '@ucanto/core/delegation';
import * as Signer from '@ucanto/principal/ed25519';
import * as Client from '@web3-storage/w3up-client';

/**
 * Account service
 */
@Singleton
export class W3SFileUploader extends NatsService {
    /**
     * Message queue name
     */
    public messageQueueName = 'w3s-file-uploader';

    /**
     * Reply subject
     * @private
     */
    public replySubject = 'w3s-file-uploader-queue-reply-' + GenerateUUIDv4();

    private async parseProof(data) {
        const blocks = [];
        const reader = await CarReader.fromBytes(Buffer.from(data, 'base64'));
        for await (const block of reader.blocks()) {
            blocks.push(block);
        }
        return Delegation.importDAG(blocks);
    }

    /**
     * Register listeners
     */
    async registerListeners() {
        const principal = Signer.parse(process.env.IPFS_STORAGE_KEY);
        const client = await Client.create({ principal });
        const proof = await this.parseProof(process.env.IPFS_STORAGE_PROOF);
        const space = await client.addSpace(proof);
        await client.setCurrentSpace(space.did());

        this.getMessages<any, string>(W3SEvents.UPLOAD_FILE, async (msg) => {
            try {
                console.log(msg);
                const result = await client.uploadFile(
                    new Blob([Buffer.from(msg)])
                );
                return new MessageResponse(result.toString());
            } catch (error) {
                return new MessageError(error);
            }
        });
    }
}
