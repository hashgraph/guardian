import { DataBaseHelper, EncryptVcHelper, KeyType, PolicyComment, PolicyDiscussion, Wallet } from '@guardian/common';
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

    private getCredentialSubject(document: any): any {
        if (Array.isArray(document.credentialSubject)) {
            return document.credentialSubject[0];
        } else {
            return document.credentialSubject;
        }
    }

    private async restoreDiscussion(discussion: PolicyDiscussion, key: string) {
        try {
            if (discussion.document) {
                return;
            }
            if (discussion.encryptedDocument) {
                const data = await EncryptVcHelper.decrypt(discussion.encryptedDocument, key);
                discussion.document = JSON.parse(data);
            }
            if (discussion.document) {
                const subject = this.getCredentialSubject(discussion.document);
                discussion.name = subject.name;
                discussion.privacy = subject.privacy;
                discussion.relationships = subject.relationships || [];
                discussion.parent = subject.parent || null;
                discussion.field = subject.field || null;
                discussion.fieldName = subject.fieldName || null;
            }
            const collection = new DataBaseHelper(PolicyDiscussion);
            await collection.update(discussion);
        } catch (error) {
            console.error(error);
        }
    }

    private async restoreComment(comment: PolicyComment, key: string) {
        try {
            if (comment.document) {
                return;
            }
            if (comment.encryptedDocument) {
                const data = await EncryptVcHelper.decrypt(comment.encryptedDocument, key);
                comment.document = JSON.parse(data);
            }
            if (comment.document) {
                const subject = this.getCredentialSubject(comment.document);
                comment.text = subject.text;
                comment.sender = subject.sender;
                comment.senderRole = subject.senderRole;
                comment.senderName = subject.senderName;
                comment.recipients = subject.users || [];
                comment.fields = subject.fields || [];
            }
            const collection = new DataBaseHelper(PolicyComment);
            await collection.update(comment);
        } catch (error) {
            console.error(error);
        }
    }

    private async restoreDiscussions(messageId: string, key: string) {
        const collection = new DataBaseHelper(PolicyDiscussion);
        const discussions = await collection.find({ policyId: this.policyId, messageId });
        for (const discussion of discussions) {
            await this.restoreDiscussion(discussion, key);
        }
    }

    private async restoreComments(messageId: string, key: string) {
        const collection = new DataBaseHelper(PolicyComment);
        const comments = await collection.find({ policyId: this.policyId, discussionMessageId: messageId });
        for (const comment of comments) {
            await this.restoreComment(comment, key);
        }
    }

    private async setKey(
        did: string,
        messageId: string,
        key: string
    ): Promise<void> {
        const wallet = new Wallet();
        return wallet.updateUserKey(
            did,
            KeyType.DISCUSSION,
            messageId,
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
                const [_, messageId, did] = target.split('|');
                const key = await this.decryptKey(encryptedKey, did);
                if (key) {
                    await this.setKey(this.policyOwner, messageId, key);
                    await this.restoreDiscussions(messageId, key);
                    await this.restoreComments(messageId, key);
                }
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
