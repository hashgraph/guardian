import {
    DatabaseServer,
    MessageAction,
    MessageServer,
    Policy,
    PolicyRecordMessage,
    Record,
    RecordImportExport,
    TopicConfig,
    Users
} from '@guardian/common';
// import { FilterObject } from '@mikro-orm/core';
import { ISignOptions, Permissions, RecordMethod } from '@guardian/interfaces';
import { ObjectId } from '@mikro-orm/mongodb';

export interface PersistStepPayload {
    policyId: string;
    policyMessageId: string | null;
    recordingUuid: string;
    recordId: any;
    payload: Record;
    // documentSnapshot: any;
    hederaOptions?: {
        topicId: string;
        submitKey?: string | null;
        operatorId: string;
        operatorKey: string;
        signOptions?: ISignOptions;
        dryRun?: string | null;
    } | null;
    uploadToIpfs: boolean;
    // recordActionId?: string;
    userFull?: any;
    actionTimestemp: number;
}

export class RecordPersistService {
    public static async persistStep(data: PersistStepPayload): Promise<void> {
        const {
            // policyId,
            policyMessageId: policyMessageIdFromRecording,
            // recordingUuid,
            // recordId,
            payload,
            // documentSnapshot,
            hederaOptions,
            // uploadToIpfs,
            // recordActionId,
            userFull,
        } = data;
        
        // if (!uploadToIpfs) {
        //     return;
        // }

        try {
            // const records = await DatabaseServer.getRecord(
            //     { _id: recordId },
            //     { limit: 1 }
            // );

            // const savedRecord = records[0];

            let topicConfig: TopicConfig;
            let operatorId: string;
            let operatorKey: string;
            let signOptions: ISignOptions | undefined;
            let dryRun: string | null = null;
            let policyMessageId: string | null = policyMessageIdFromRecording ?? null;
            const policy = await DatabaseServer.getPolicyById(payload.policyId) as Policy;

            if (hederaOptions?.topicId && hederaOptions.operatorId && hederaOptions.operatorKey) {
                const topicRow = await DatabaseServer.getTopicById(hederaOptions.topicId);
                topicConfig = await TopicConfig.fromObject(topicRow, false, null);

                operatorId = hederaOptions.operatorId;
                operatorKey = hederaOptions.operatorKey;
                signOptions = hederaOptions.signOptions;
                dryRun = hederaOptions.dryRun ?? null;

                if (!policyMessageId) {
                    const policy = await DatabaseServer.getPolicyById(payload.policyId) as Policy;
                    policyMessageId = policy?.messageId || null;
                }
            } else {
                if (!policy || !policy.recordsTopicId || !policy.owner) {
                    console.error(`RecordPersistService: unable to resolve policy/records topic for policy ${payload.policyId}`);
                    return;
                }

                policyMessageId = policy.messageId || null;

                const topicRow = await DatabaseServer.getTopicById(policy.recordsTopicId);
                topicConfig = await TopicConfig.fromObject(topicRow, false, null);

                const users = new Users();
                const root = await users.getHederaAccount(policy.owner, null);

                operatorId = root.hederaAccountId;
                operatorKey = root.hederaAccountKey;
                signOptions = root.signOptions;
            }

            const resultDocuments = await RecordPersistService.buildStepResults(
                // policyId,
                // savedRecord,
                // documentSnapshot,
                payload,
                // recordId,
                // recordActionId
            );

            let userRole = null;

            if (policy.owner === userFull?.did || userFull?.permissions?.includes(Permissions.POLICIES_POLICY_MANAGE)) {
                userRole = 'Administrator';
            }

            const zip = await RecordImportExport.generateSingleRecordZip({
                ...payload,
                userRole,
                // document: documentSnapshot ?? null
            } as Record, resultDocuments);

            const buffer = await zip.generateAsync({
                type: 'nodebuffer',
                compression: 'DEFLATE',
                compressionOptions: { level: 3 }
            });

            const message = new PolicyRecordMessage(MessageAction.PolicyRecordStep);
            message.setDocument(
                {
                    policyId: payload.policyId,
                    policyMessageId,
                    recordingUuid: payload.uuid,
                    recordId: payload.id || new ObjectId().toString(),
                    method: String(payload.method),
                    action: payload.action ? String(payload.action) : null,
                    time: Number(payload.time),
                    recordActionId: payload.recordActionId,
                    user: (payload.user as string) ?? null,
                    target: (payload.target as string) ?? null,
                },
                buffer
            );

            const messageServer = new MessageServer({
                operatorId,
                operatorKey,
                encryptKey: null,
                signOptions,
                dryRun
            });

            await messageServer
                .setTopicObject(topicConfig)
                .sendMessage(message, {
                    sendToIPFS: true,
                    memo: `RECORD:${payload.policyId}`,
                    userId: null,
                    interception: null
                });
        } catch (error) {
            console.error(`RecordPersistService: unable to persist step for policy ${payload.policyId}`, error);
        }
    }

    private static async buildStepResults(
        // policyId: string,
        // savedRecord: Record,
        // documentSnapshot: any,
        payload: Record,
        // recordId: any,
        // recordActionId: string,
    ): Promise<{ id: string, type: 'vc' | 'vp' | 'schema', document: any }[]> {
        // const id = RecordPersistService.extractResultId(documentSnapshot, payload);
        // const type = RecordPersistService.detectResultType(documentSnapshot);
        const id = RecordPersistService.extractResultId(payload);
        const type = RecordPersistService.detectResultType(payload.document);

        // const timeForWindow = (() => {
        //     const t = (payload as any)?.time;
        //     if (t instanceof Date) {
        //         return t.getTime();
        //     }
        //     const num = Number(t);
        //     return Number.isFinite(num) ? num : Date.now();
        // })();

        const fromDb = payload.method === RecordMethod.Generate ? [] : await RecordPersistService.loadResultsAroundStep(
            // policyId,
            // timeForWindow,
            // id,
            // type,
            payload.recordActionId,
        );
        if (fromDb.length) {
            return fromDb;
        }

        return [{
            id,
            type,
            document: payload.document?.ref ?? payload.document?.document ?? payload.document ?? null
        }];
    }

    private static async loadResultsAroundStep(
        // policyId: string,
        // baseTime: number,
        // documentId?: string,
        // _type?: 'vc' | 'vp' | 'schema',
        recordActionId?: string,
    ): Promise<{ id: string, type: 'vc' | 'vp' | 'schema', document: any }[]> {
        // const windowBeforeMs = 5000;
        // const windowAfterMs = 2000;
        // const start = baseTime - windowBeforeMs;
        // const end = baseTime + windowAfterMs;
        try {
            return await RecordImportExport.loadRecordResultsByActionId(
                // policyId,
                // documentId,
                recordActionId
            );
        } catch {
            return [];
        }
    }

    private static extractResultId(
        // documentSnapshot: any,
        payload: Record,
    ): string {
        if (typeof payload.document?.id === 'string') {
            return payload.document.id;
        }
        if (typeof payload.document?.ref?.id === 'string') {
            return payload.document.ref.id;
        }
        if (typeof payload.document?.ref?.document?.id === 'string') {
            return payload.document.ref.document.id;
        }
        if (typeof payload.document?.document?.id === 'string') {
            return payload.document.document.id;
        }
        if (typeof payload.target === 'string' && payload.target) {
            return payload.target;
        }

        return payload.uuid;
    }

    private static detectResultType(documentSnapshot: any): 'vc' | 'vp' | 'schema' {
        const rawTypes = documentSnapshot?.type
            || documentSnapshot?.document?.type
            || documentSnapshot?.ref?.document?.type;
        const types = Array.isArray(rawTypes)
            ? rawTypes
            : rawTypes
                ? [rawTypes]
                : [];
        if (types.some((t: any) => typeof t === 'string' && /presentation/i.test(t))) {
            return 'vp';
        }
        if (types.some((t: any) => typeof t === 'string' && /credential/i.test(t))) {
            return 'vc';
        }
        return 'schema';
    }
}
