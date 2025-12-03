/**
 * GlobalTopicWriterBlock
 *
 * Server-side policy block that forwards a reference to an already anchored VC/VP/VS
 * into one or more global Hedera topics. It does not create or modify documents
 * and does not persist anything; it simply extracts the canonical address
 * (messageId) from the incoming IPolicyDocument and publishes a compact JSON
 * notification.
 */

import { ActionCallback, EventBlock } from '../helpers/decorators/index.js';
import { BlockActionError } from '../errors/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { AnyBlockType, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyUtils } from '../helpers/utils.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { LocationType } from '@guardian/interfaces';
import { MessageServer, TopicConfig } from '@guardian/common';
import { TopicId } from '@hashgraph/sdk';

interface GlobalVsNotification {
    documentMessageId: string;
    policyId: string;
    sourceBlockTag: string;
    documentSourceTag?: string;
    routingHint?: string;
    vcId?: string;
    hash?: string;
    topicId?: string;
    relationships?: string[];
    owner?: string;
    timestamp: string;
}

@EventBlock({
    blockType: 'globalTopicWriterBlock',
    commonBlock: false,
    // actionType: LocationType.LOCAL,
    actionType: LocationType.REMOTE,
    about: {
        label: 'Global Topic Writer',
        title: 'Publish document address to a global Hedera topic',
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.RunEvent,
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent,
            PolicyOutputEventType.ReleaseEvent,
        ],
        defaultEvent: true,
        properties: [
            {
                name: 'topicId',
                label: 'Global topic id',
                title: 'Hedera topic where notifications are published',
                type: PropertyType.Input,
            },
            {
                name: 'senderTag',
                label: 'Sender tag',
                title: 'Optional tag to include in notification',
                type: PropertyType.Input,
            },
            {
                name: 'routingHint',
                label: 'Routing hint',
                title: 'Optional routing hint for downstream consumers',
                type: PropertyType.Input,
            },
        ],
    },
})
export class GlobalTopicWriterBlock {
    /**
     * Handle RunEvent: validate input, build payload, publish to topic, and pass through events.
     */
    @ActionCallback({
        type: PolicyInputEventType.RunEvent,
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
        ],
    })
    public async runAction(event: IPolicyEventState): Promise<void> {
        console.log('Global Topic Writer Block');
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const user: PolicyUser = (event as any)?.user;

        if (!user) {
            throw new BlockActionError('User is required', ref.blockType, ref.uuid);
        }

        const state: IPolicyEventState =
            (event as any)?.data || (event as any);
        const doc: IPolicyDocument = state?.data as IPolicyDocument;

        if (!doc) {
            throw new BlockActionError('Document is required', ref.blockType, ref.uuid);
        }

        const topicId: string | undefined = ref.options?.topicId;
        if (!topicId) {
            throw new BlockActionError('Global topic id is not configured', ref.blockType, ref.uuid);
        }

        try {
            TopicId.fromString(topicId);
        } catch (err) {
            throw new BlockActionError('Invalid topic id format', ref.blockType, ref.uuid);
        }

        const documentMessageId: string = this.extractCanonicalAddress(doc);
        if (!documentMessageId) {
            throw new BlockActionError('Canonical document address (messageId) is missing', ref.blockType, ref.uuid);
        }

        const documentSourceTag: string | undefined = (doc as any).__sourceTag__ || (doc as any).tag;

        const payload: GlobalVsNotification = {
            documentMessageId,
            policyId: ref.policyId,
            sourceBlockTag: ref.options?.senderTag || ref.tag,
            documentSourceTag,
            routingHint: ref.options?.routingHint || ref.options?.senderTag,
            vcId: doc.document?.id,
            hash: doc.hash,
            topicId: doc.topicId,
            relationships: doc.relationships,
            owner: doc.owner,
            timestamp: new Date().toISOString(),
        };

        await this.publish(ref, user, topicId, payload);

        ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);
        ref.backup();
    }

    /**
     * Extract canonical address for the document (prefers Hedera messageId).
     */
    private extractCanonicalAddress(doc: IPolicyDocument): string {
        if (doc.messageId) {
            return doc.messageId;
        }

        if (doc.document?.id) {
            return doc.document.id;
        }

        if (doc.hash) {
            return doc.hash;
        }

        if (Array.isArray(doc.relationships) && doc.relationships.length) {
            return doc.relationships[0];
        }

        return '';
    }

    /**
     * Publish JSON payload to the configured global topic using user credentials.
     */
    /**
     * Publish JSON payload to the configured global topic using user credentials.
     * This uses MessageServer under the hood, but sends a raw JSON string instead
     * of a typed Guardian Message instance.
     */
    private async publish(
        ref: AnyBlockType,
        user: PolicyUser,
        topicId: string,
        payload: GlobalVsNotification
    ): Promise<void> {
        try {
            /**
             * Resolve user credentials (respecting dry-run and relayer accounts).
             */
            const userCredentials = await PolicyUtils.getUserCredentials(
                ref,
                user.did,
                user.userId
            );

            const hederaAccount = await userCredentials.loadRelayerAccount(
                ref,
                user.hederaAccountId,
                user.userId
            );

            /**
             * Configure topic metadata.
             * TopicConfig will resolve submitKey (if any) from stored config.
             */
            const topic = new TopicConfig({ topicId }, null, null);

            console.log('GlobalTopicWriter hederaAccount', {
                hederaAccountId: hederaAccount.hederaAccountId,
                signOptions: hederaAccount.signOptions,
                dryRun: ref.dryRun
            });

            /**
             * Create a MessageServer instance bound to the target topic.
             * We pass relayer/operator credentials and sign options.
             */
            const messageServer = new MessageServer({
                operatorId: process.env.HEDERA_OPERATOR_ID! ?? hederaAccount.hederaAccountId,
                operatorKey: process.env.HEDERA_OPERATOR_KEY! ?? hederaAccount.hederaAccountKey,
                encryptKey: hederaAccount.hederaAccountKey,
                signOptions: hederaAccount.signOptions,
                dryRun: "" // ref.dryRun
            }).setTopicObject(topic);

            /**
             * Lightweight "message-like" object that matches the minimal
             * interface used by MessageServer.sendMessage / sendHedera.
             * We are not using IPFS, so only toMessage/memo-related methods
             * and setters for id/topicId are required.
             */
            const rawMessage = (() => {
                let currentMemo: string | null = null;
                let currentId: string | null = null;
                let currentTopicId: string | null = null;
                let currentLang: string | null = null;

                return {
                    toMessage(): string {
                        return JSON.stringify(payload);
                    },

                    setLang(lang: string): void {
                        currentLang = lang;
                    },

                    setMemo(memo: string): void {
                        currentMemo = memo;
                    },

                    getMemo(): string | null {
                        return currentMemo;
                    },

                    setId(id: string): void {
                        currentId = id;
                    },

                    getId(): string | null {
                        return currentId;
                    },

                    setTopicId(topic: string | TopicId): void {
                        if (topic) {
                            currentTopicId = topic.toString();
                        } else {
                            currentTopicId = null;
                        }
                    },

                    getTopicId(): string | null {
                        return currentTopicId;
                    }
                };
            })();

            /**
             * Use MessageServer.sendMessage, but:
             * - bypass IPFS (sendToIPFS: false),
             * - provide explicit memo to avoid MessageMemo.getMessageMemo(),
             * - call through `any` to avoid strict typing on Message<T>.
             */
            await (messageServer as any).sendMessage(rawMessage, {
                sendToIPFS: false,
                memo: 'GlobalTopicNotification',
                userId: user.userId,
                interception: null
            });
        } catch (err) {
            ref.error(
                `Publish to global topic failed: ${PolicyUtils.getErrorMessage(err)}`
            );
            throw new BlockActionError(
                'Publish to global topic failed',
                ref.blockType,
                ref.uuid
            );
        }
    }
}

