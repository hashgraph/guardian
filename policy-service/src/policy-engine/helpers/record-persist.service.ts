// import {
//     DatabaseServer,
//     MessageAction,
//     MessageServer,
//     Policy,
//     PolicyRecordMessage,
//     Record,
//     RecordImportExport,
//     TopicConfig,
//     Users
// } from '@guardian/common';
// import { FilterObject } from '@mikro-orm/core';
// import { ISignOptions } from '@guardian/interfaces';

// export interface PersistStepPayload {
//     policyId: string;
//     policyMessageId: string | null;
//     recordingUuid: string;
//     recordId: any;
//     payload: FilterObject<Record>;
//     documentSnapshot: any;
//     hedera?: {
//         topicId: string;
//         submitKey?: string | null;
//         operatorId: string;
//         operatorKey: string;
//         signOptions?: ISignOptions;
//         dryRun?: string | null;
//     } | null;
//     uploadToIpfs: boolean;
// }

// export class RecordPersistService {
//     public static async persistStep(data: PersistStepPayload): Promise<void> {
//         const {
//             policyId,
//             policyMessageId: policyMessageIdFromRecording,
//             recordingUuid,
//             recordId,
//             payload,
//             documentSnapshot,
//             hedera,
//             uploadToIpfs
//         } = data;

//         console.log(uploadToIpfs, 'uploadToIpfs uploadToIpfsuploadToIpfs 2222');

//         if (!uploadToIpfs) {
//             return;
//         }

//         try {
//             const records = await DatabaseServer.getRecord(
//                 { _id: recordId } as any,
//                 { limit: 1 } as any
//             ) as any;

//             const savedRecord: Record | null =
//                 Array.isArray(records) ? (records[0] as Record) : (records as Record | null);

//                 console.log(savedRecord, 'savedRecord');
//             if (!savedRecord) {
//                 console.error(`RecordPersistService: record not found for id ${recordId}`);
//                 return;
//             }

//             let topicConfig: TopicConfig;
//             let operatorId: string;
//             let operatorKey: string;
//             let signOptions: ISignOptions | undefined;
//             let dryRun: string | null = null;
//             let policyMessageId: string | null = policyMessageIdFromRecording ?? null;

//             if (hedera?.topicId && hedera.operatorId && hedera.operatorKey) {
//                 const topicRow = await DatabaseServer.getTopicById(hedera.topicId);
//                 topicConfig = await TopicConfig.fromObject(topicRow, false, null);

//                 operatorId = hedera.operatorId;
//                 operatorKey = hedera.operatorKey;
//                 signOptions = hedera.signOptions;
//                 dryRun = hedera.dryRun ?? null;

//                 if (!policyMessageId) {
//                     const policy = await DatabaseServer.getPolicyById(policyId) as Policy;
//                     policyMessageId = policy?.messageId || null;
//                 }
//             } else {
//                 const policy = await DatabaseServer.getPolicyById(policyId) as Policy;
//                 if (!policy || !policy.recordsTopicId || !policy.owner) {
//                     console.error(`RecordPersistService: unable to resolve policy/actions topic for policy ${policyId}`);
//                     return;
//                 }

//                 policyMessageId = policy.messageId || null;

//                 const topicRow = await DatabaseServer.getTopicById(policy.recordsTopicId);
//                 topicConfig = await TopicConfig.fromObject(topicRow, false, null);

//                 const users = new Users();
//                 const root = await users.getHederaAccount(policy.owner, null);

//                 operatorId = root.hederaAccountId;
//                 operatorKey = root.hederaAccountKey;
//                 signOptions = root.signOptions;
//             }

//             const resultDocuments = RecordPersistService.buildStepResults(documentSnapshot, payload, recordId);
//             const zip = await RecordImportExport.generateSingleRecordZip({
//                 ...savedRecord,
//                 document: documentSnapshot ?? null
//             } as Record, resultDocuments);

//             const buffer = await zip.generateAsync({
//                 type: 'nodebuffer',
//                 compression: 'DEFLATE',
//                 compressionOptions: { level: 3 }
//             });

//             const message = new PolicyRecordMessage(MessageAction.PolicyRecordStep);
//             message.setDocument(
//                 {
//                     policyId,
//                     policyMessageId,
//                     recordingUuid,
//                     recordId,
//                     method: String(payload.method),
//                     action: payload.action ? String(payload.action) : null,
//                     time: payload.time as number,
//                     user: (payload.user as string) ?? null,
//                     target: (payload.target as string) ?? null
//                 },
//                 buffer
//             );

//             console.log(operatorId, 'operatorId');
//             console.log(operatorKey, 'operatorKey');
//             console.log(signOptions, 'signOptions');
//             console.log(topicConfig, 'topicConfig');
//             console.log(dryRun, 'dryRun');
//             console.log(dryRun, 'dryRun');
//             console.log(message, 'zxcxzcxzcxzc');
            
//             const messageServer = new MessageServer({
//                 operatorId,
//                 operatorKey,
//                 encryptKey: null,
//                 signOptions,
//                 dryRun
//             });

//             await messageServer
//                 .setTopicObject(topicConfig)
//                 .sendMessage(message, {
//                     sendToIPFS: true,
//                     memo: `RECORD:${policyId}`,
//                     userId: null,
//                     interception: null
//                 });
//         } catch (error) {
//             console.error(`RecordPersistService: unable to persist step for policy ${policyId}`, error);
//         }
//     }

//     private static buildStepResults(
//         documentSnapshot: any,
//         payload: FilterObject<Record>,
//         recordId: any
//     ): { id: string, type: 'vc' | 'vp' | 'schema', document: any }[] {
//         if (!documentSnapshot) {
//             return [];
//         }
//         return [{
//             id: RecordPersistService.extractResultId(documentSnapshot, payload, recordId),
//             type: RecordPersistService.detectResultType(documentSnapshot),
//             document: documentSnapshot
//         }];
//     }

//     private static extractResultId(
//         documentSnapshot: any,
//         payload: FilterObject<Record>,
//         recordId: any
//     ): string {
//         if (typeof documentSnapshot?.id === 'string') {
//             return documentSnapshot.id;
//         }
//         if (typeof documentSnapshot?.document?.id === 'string') {
//             return documentSnapshot.document.id;
//         }
//         if (typeof payload.target === 'string' && payload.target) {
//             return payload.target;
//         }
//         if (typeof payload.action === 'string' && payload.action) {
//             return `${payload.action}-${recordId?.toString?.()}`;
//         }
//         return recordId?.toString?.();
//     }

//     private static detectResultType(documentSnapshot: any): 'vc' | 'vp' | 'schema' {
//         const rawTypes = documentSnapshot?.type;
//         const types = Array.isArray(rawTypes)
//             ? rawTypes
//             : rawTypes
//                 ? [rawTypes]
//                 : [];
//         if (types.some((t: any) => typeof t === 'string' && /presentation/i.test(t))) {
//             return 'vp';
//         }
//         if (types.some((t: any) => typeof t === 'string' && /credential/i.test(t))) {
//             return 'vc';
//         }
//         return 'schema';
//     }
// }
