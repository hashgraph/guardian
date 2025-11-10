import { DataBaseHelper, DeleteCache, EncryptVcHelper, KeyType, VcDocument, Wallet } from '@guardian/common';
import { FindCursor } from 'mongodb';
import { CollectionBackup } from '../collection-backup.js';
import { IDiffAction } from '../../interfaces/action.interface.js';
import { ICollectionKeys } from '../../interfaces/collection-diff.interface.js';
import { IKeyAction } from '../../interfaces/action.interface.js';
import { UserCredentials } from '../../../policy-user.js';

export class CommentKeysRestore {
    protected readonly policyId: string;
    protected readonly policyOwner: string;
    protected readonly messageId: string;

    constructor(
        policyId: string,
        policyOwner: string,
        messageId: string
    ) {
        this.policyId = policyId;
        this.policyOwner = policyOwner;
        this.messageId = messageId;
    }

    private async setKey(
        did: string,
        discussionId: string,
        key: string
    ): Promise<void> {
        const wallet = new Wallet();
        return wallet.updateUserKey(
            did,
            KeyType.DISCUSSION,
            discussionId,
            key,
            null
        )
    }

    private async decryptKey(encryptedKey: string, did: string): Promise<string> {
        const messageKey = await UserCredentials.loadMessageKey(this.messageId, did, null);
        if (messageKey) {
            const decryptedKey = await EncryptVcHelper.decrypt(encryptedKey, messageKey);
            return decryptedKey;
        } else {
            return null;
        }
    }

    private async restoreKey(action: IKeyAction): Promise<void> {
        try {
            if (action) {
                const target = action.target || '';
                const encryptedKey = action.key || '';
                const [discussionId, _, did] = target.split('|');
                const key = await this.decryptKey(encryptedKey, did);
                await this.setKey(this.policyOwner, discussionId, key);
            }
        } catch (error) {
            console.error(error);
        }
    }

    public async restoreBackup(backup: ICollectionKeys): Promise<void> {
        const actions = backup?.actions || [];

        for (const action of actions) {
            await this.restoreKey(action);
        }
    }
}
