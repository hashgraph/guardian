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

type GlobalDocumentType = 'vc' | 'json' | 'csv' | 'text' | 'any';

/**
 * Notification sent to global topics.
 *
 * schemaContextIri: base context IRI (schema "package" / base context)
 * schemaIri: full schema IRI (context#type)
 */
interface GlobalEvent {
    documentType: GlobalDocumentType;
    documentTopicId: string;        // Hedera topic where the VC is stored
    documentMessageId: string;      // Specific VC message in this topic
    schemaContextIri: string;       // Base context IRI (package/base context)
    schemaIri: string;              // Full schema IRI (context#type)
    timestamp: string;              // ISO timestamp of publish moment
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
                name: 'documentType',
                label: 'Document type',
                title: 'Type written to the global topic for reader-side filtering',
                type: PropertyType.Select,
                items: [
                    { label: 'VC', value: 'vc' },
                    { label: 'JSON', value: 'json' },
                    { label: 'CSV', value: 'csv' },
                    { label: 'Text', value: 'text' },
                    { label: 'Any', value: 'any' },
                ],
                default: 'any',
            },
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
        ],
    },
})
export class GlobalEventsWriterBlock {
    @ActionCallback({
        type: PolicyInputEventType.RunEvent,
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
        ],
    })
    public async runAction(event: IPolicyEventState): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const user: PolicyUser = (event as any)?.user;

        if (!user) {
            throw new BlockActionError('User is required', ref.blockType, ref.uuid);
        }

        const state: IPolicyEventState = (event as any)?.data || (event as any);
        const doc: IPolicyDocument = state?.data as IPolicyDocument;

        if (!doc) {
            throw new BlockActionError('Document is required', ref.blockType, ref.uuid);
        }

        if (!doc.topicId) {
            throw new BlockActionError('Document topicId is missing', ref.blockType, ref.uuid);
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

        const { schemaContextIri, schemaIri } = this.extractSchemaIris(ref, doc);

        const payload: GlobalEvent = {
            documentType: ref.options?.documentType,
            documentTopicId: doc.topicId,
            documentMessageId,
            schemaContextIri,
            schemaIri,
            timestamp: new Date().toISOString(),
        };

        for (const cfg of topicConfigs) {
            const globalTopicId: string | undefined = cfg?.topicId;

            if (!globalTopicId) {
                throw new BlockActionError('Global topic id is not configured', ref.blockType, ref.uuid);
            }

            try {
                TopicId.fromString(globalTopicId);
            } catch (err) {
                throw new BlockActionError('Invalid topic id format', ref.blockType, ref.uuid);
            }

            await this.publish(ref, user, globalTopicId, payload);
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);
        ref.backup();
    }

    /**
     * Prefer Hedera messageId as canonical address.
     */
    private extractCanonicalAddress(doc: IPolicyDocument): string {
        if (doc.messageId) {
            return doc.messageId;
        }
        return '';
    }

    /**
     * Extract (schemaContextIri, schemaIri) primarily from the VC itself.
     *
     * Why: doc.schema in DB is often an internal schema ID (#uuid&version), not an IRI.
     * VC @context may already contain context#type or at least the base context.
     */
    private extractSchemaIris(ref: AnyBlockType, doc: IPolicyDocument): { schemaContextIri: string; schemaIri: string } {
        try {
            let vc: any = (doc as any).document;

            if (typeof vc === 'string') {
                vc = JSON.parse(vc);
            }

            const ctxRaw = vc?.['@context'];
            const ctxList: string[] = Array.isArray(ctxRaw)
                ? ctxRaw.filter((v: any) => typeof v === 'string')
                : [];

            // 1) If full schema IRI already exists in @context (contains '#'), use it.
            let fullIri: string | undefined;
            for (const c of ctxList) {
                if (typeof c === 'string' && c.includes('#')) {
                    fullIri = c;
                }
            }
            if (fullIri) {
                const base = fullIri.split('#')[0] || '';
                return {
                    schemaContextIri: base,
                    schemaIri: fullIri,
                };
            }

            // 2) Otherwise, find a likely base schema context (not W3C core contexts).
            const baseContext = ctxList.find((c) => {
                if (!c.startsWith('http') && !c.startsWith('ipfs://')) {
                    return false;
                }
                if (c.includes('www.w3.org/2018/credentials')) {
                    return false;
                }
                if (c.includes('w3id.org/security')) {
                    return false;
                }
                return true;
            });

            // 3) Determine schema "type" (credentialSubject.type is the best source).
            const cs = PolicyUtils.getCredentialSubjectByDocument?.(vc);
            const csType =
                (cs && (cs.type || cs['@type'])) ||
                (Array.isArray(cs?.type) ? cs.type[0] : undefined) ||
                (doc as any).type;

            if (baseContext && csType) {
                return {
                    schemaContextIri: baseContext,
                    schemaIri: `${baseContext}#${csType}`,
                };
            }

            if (baseContext) {
                return {
                    schemaContextIri: baseContext,
                    schemaIri: '',
                };
            }

            // 4) Final fallback: if doc.schema looks like a real IRI, use it.
            if (typeof doc.schema === 'string' && (doc.schema.startsWith('http') || doc.schema.startsWith('ipfs://'))) {
                if (doc.schema.includes('#')) {
                    return {
                        schemaContextIri: doc.schema.split('#')[0] || '',
                        schemaIri: doc.schema,
                    };
                }
            }

            return { schemaContextIri: '', schemaIri: '' };
        } catch (err) {
            ref.warn?.(`Unable to extract schema IRIs: ${PolicyUtils.getErrorMessage(err)}`);
            return { schemaContextIri: '', schemaIri: '' };
        }
    }

    /**
     * Publish JSON payload to the configured global topic using user credentials.
     */
    private async publish(
        ref: AnyBlockType,
        user: PolicyUser,
        globalTopicId: string,
        payload: GlobalEvent
    ): Promise<void> {
        try {
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

            const topic = new TopicConfig({ topicId: globalTopicId }, null, null);

            const messageServer = new MessageServer({
                operatorId: hederaAccount.hederaAccountId,
                operatorKey: hederaAccount.hederaAccountKey,
                encryptKey: hederaAccount.hederaAccountKey,
                signOptions: hederaAccount.signOptions,
                dryRun: ref.dryRun
            }).setTopicObject(topic);

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

                    setTopicId(topicValue: string | TopicId): void {
                        if (topicValue) {
                            currentTopicId = topicValue.toString();
                        } else {
                            currentTopicId = null;
                        }
                    },

                    getTopicId(): string | null {
                        return currentTopicId;
                    }
                };
            })();

            await (messageServer as any).sendMessage(rawMessage, {
                sendToIPFS: false,
                memo: 'GlobalEvent',
                userId: user.userId,
                interception: null
            });
        } catch (err) {
            ref.error(`Publish to global topic failed: ${PolicyUtils.getErrorMessage(err)}`);
            throw new BlockActionError('Publish to global topic failed', ref.blockType, ref.uuid);
        }
    }
}
