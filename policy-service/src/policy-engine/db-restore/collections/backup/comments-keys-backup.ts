import { DataBaseHelper, DatabaseServer, DeleteCache, EncryptVcHelper, KeyType, PolicyDiscussion, Users, VcDocument, Wallet } from '@guardian/common';
import { FindCursor } from 'mongodb';
import { CollectionBackup } from '../collection-backup.js';
import { ICollectionKeys } from '../../interfaces/collection-diff.interface.js';
import { IKeyAction } from '../../interfaces/action.interface.js';
import { UserCredentials } from '../../../policy-user.js';

export class CommentsKeysBackup {
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

    private getKey(
        did: string,
        discussionId: string,
    ): Promise<string> {
        const wallet = new Wallet();
        return wallet.getUserKey(
            did,
            KeyType.DISCUSSION,
            discussionId,
            null
        )
    }

    private async getUsers(discussion: PolicyDiscussion): Promise<string[]> {
        if (!discussion) {
            return [];
        }
        const users = await (new Users()).getRemoteUsers(this.policyOwner, null);
        if (discussion.privacy === 'public') {
            return users
                .map((u) => u.did)
                .filter((u) => u);
        } else if (discussion.privacy === 'users') {
            if (Array.isArray(discussion.users)) {
                return users
                    .filter((u) => discussion.users.includes(u.did))
                    .map((u) => u.did);
            } else {
                return [];
            }
        } else if (discussion.privacy === 'roles') {
            if (Array.isArray(discussion.roles)) {
                const userIds = users.map((u) => u.did).filter((u) => u);
                const groups = await DatabaseServer.getPolicyGroups({
                    policyId: this.policyId,
                    role: { $in: discussion.roles },
                    did: { $in: userIds },
                });
                return groups
                    .map((u) => u.did)
                    .filter((u) => u);
            } else {
                return [];
            }
        }
    }

    private async encryptKey(key: string, did: string): Promise<string> {
        const messageKey = await UserCredentials.loadMessageKey(this.messageId, did, null);
        if (messageKey) {
            const encryptedKey = await EncryptVcHelper.encrypt(key, messageKey);
            return encryptedKey;
        } else {
            return null;
        }
    }

    public async createDiff(
        options: {
            discussion?: string,
            user?: string,
        },
        lastUpdate: Date
    ): Promise<ICollectionKeys> {
        const { discussion, user } = options;

        const actions: IKeyAction[] = [];
        const hash: string = '';

        if (discussion) {
            const discussionRow = await DatabaseServer.getPolicyDiscussion({
                _id: DatabaseServer.dbID(discussion),
            });
            const messageKey: string = await this.getKey(this.policyOwner, discussion);
            const users: any[] = await this.getUsers(discussionRow);
            for (const did of users) {
                const key = await this.encryptKey(messageKey, did);
                const target = `${discussionRow.messageId}|${did}`;
                actions.push({ target, key });
            }
        } else if (user) {
            const groups = await DatabaseServer.getPolicyGroups({
                policyId: this.policyId,
                did: user,
            });
            const role = groups[0]?.role;
            const discussionRows = await DatabaseServer.getPolicyDiscussions({
                $or: [{
                    privacy: 'public'
                }, {
                    privacy: 'users',
                    users: user
                }, {
                    privacy: 'roles',
                    roles: role
                }]
            });
            for (const discussionRow of discussionRows) {
                const messageKey: string = await this.getKey(this.policyOwner, discussion);
                const key = await this.encryptKey(messageKey, user);
                const target = `${discussionRow.id}|${discussionRow.messageId}|${user}`;
                actions.push({ target, key });
            }
        }

        return {
            hash,
            fullHash: hash,
            actions
        }
    }
}
