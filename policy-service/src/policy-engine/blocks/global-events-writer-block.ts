/**
 * GlobalEventsWriterBlock
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

interface GlobalEvent {
    documentTopicId: string;        // Hedera topic where the VC is stored (e.g. alias "Project")
    documentMessageId: string;      // Specific VC message in this topic
    schemaIri?: string;             // VC schema IRI (for filtering/routing)
    policyInstanceTopicId?: string; // Policy instance topic, if available
    sourceBlockTag: string;         // Tag of the policy block that sent the event
    timestamp: string;              // When the event was written to the global topic (ISO)
}

@EventBlock({
    blockType: 'globalEventsWriterBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
    about: {
        label: 'Global Events Writer',
        title: 'Publish VC reference to a global Hedera topics',
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
                name: 'topicIds',
                label: 'Global topic ids',
                title: 'One or more Hedera topics where notifications are published',
                type: PropertyType.Array,
                items: {
                    label: 'Topic',
                    value: 'topicId',
                    properties: [
                        {
                            name: 'topicId',
                            label: 'Topic id',
                            title: 'Hedera topic id',
                            type: PropertyType.Input,
                        },
                    ],
                },
            },
            {
                name: 'senderTag',
                label: 'Sender tag',
                title: 'Optional tag to include as sourceBlockTag in notifications',
                type: PropertyType.Input,
            },
            {
                name: 'customFields',
                label: 'Custom fields',
                title: 'Additional key/value pairs',
                type: PropertyType.Array,
                items: {
                    label: 'Field',
                    value: 'key',
                    properties: [
                        {
                            name: 'key',
                            label: 'Key',
                            title: 'Field name',
                            type: PropertyType.Input,
                        },
                        {
                            name: 'value',
                            label: 'Value',
                            title: 'Field value',
                            type: PropertyType.Input,
                        },
                    ],
                },
            }
        ],
    },
})
export class GlobalEventsWriterBlock {
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
        console.log('GlobalEventsWriterBlock: runAction');

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

        if (!doc.topicId) {
            throw new BlockActionError(
                'Document topicId is missing',
                ref.blockType,
                ref.uuid
            );
        }

        const documentMessageId: string = this.extractCanonicalAddress(doc);
        if (!documentMessageId) {
            throw new BlockActionError(
                'Canonical document address (messageId) is missing',
                ref.blockType,
                ref.uuid
            );
        }

        const topicConfigs = Array.isArray(ref.options?.topicIds)
            ? ref.options.topicIds
            : [];

        if (!topicConfigs.length) {
            throw new BlockActionError(
                'At least one global topic id is required',
                ref.blockType,
                ref.uuid
            );
        }

        const schemaIri: string | undefined = doc.schema;

        const policyInstanceTopicId: string | undefined =
            ref.policyInstance?.instanceTopicId;

        const customFieldsArray: { key: string; value: string }[] =
            Array.isArray(ref.options?.customFields)
                ? ref.options.customFields
                : [];

        const customFields: Record<string, string> = {};
        for (const field of customFieldsArray) {
            if (!field || !field.key) {
                continue;
            }
            customFields[field.key] = field.value;
        }

        const basePayload: GlobalEvent = {
            documentTopicId: doc.topicId,
            documentMessageId,
            sourceBlockTag: ref.options?.senderTag || ref.tag,
            timestamp: new Date().toISOString(),
        };

        if (schemaIri) {
            basePayload.schemaIri = schemaIri;
        }

        if (policyInstanceTopicId) {
            basePayload.policyInstanceTopicId = policyInstanceTopicId;
        }

        const payload: GlobalEvent & Record<string, string> = {
            ...basePayload,
            ...customFields,
        };

        for (const cfg of topicConfigs) {
            const globalTopicId: string | undefined = cfg?.topicId;

            if (!globalTopicId) {
                throw new BlockActionError(
                    'Global topic id is not configured',
                    ref.blockType,
                    ref.uuid
                );
            }

            try {
                TopicId.fromString(globalTopicId);
            } catch (err) {
                throw new BlockActionError(
                    'Invalid topic id format',
                    ref.blockType,
                    ref.uuid
                );
            }

            await this.publish(ref, user, globalTopicId, payload);
        }

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

        return '';
    }

    /**
     * Publish JSON payload to the configured global topic using user credentials.
     * This uses MessageServer under the hood, but sends a raw JSON string instead
     * of a typed Guardian Message instance.
     */
    private async publish(
        ref: AnyBlockType,
        user: PolicyUser,
        globalTopicId: string,
        payload: GlobalEvent & Record<string, string>
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
            const topic = new TopicConfig({ topicId: globalTopicId }, null, null);

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
                operatorId: hederaAccount.hederaAccountId, //process.env.HEDERA_OPERATOR_ID! ??
                operatorKey: hederaAccount.hederaAccountKey, //process.env.HEDERA_OPERATOR_KEY! ??
                encryptKey: hederaAccount.hederaAccountKey,
                signOptions: hederaAccount.signOptions,
                dryRun: ref.dryRun
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
                memo: 'GlobalEvent',
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

