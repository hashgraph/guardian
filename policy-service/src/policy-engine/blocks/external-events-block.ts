// import { CronJob } from 'cron';
// import { EventBlock } from '../helpers/decorators/index.js';
// import {
//     IVC,
//     LocationType,
// } from '@guardian/interfaces';
// import {
//     PolicyComponentsUtils,
// } from '../policy-components-utils.js';
// import {
//     PolicyInputEventType,
//     PolicyOutputEventType,
// } from '../interfaces/index.js';
// import {
//     ChildrenType,
//     ControlType,
// } from '../interfaces/block-about.js';
// import {
//     AnyBlockType,
//     IPolicyAddonBlock,
//     IPolicyDocument,
//     IPolicyEventState,
//     IPolicyGetData,
// } from '../policy-engine.interface.js';
// import {
//     IHederaCredentials,
//     PolicyUser,
// } from '../policy-user.js';
// import { PolicyUtils } from '../helpers/utils.js';
// import {
//     VcDocument as VcDocumentCollection,
//     MessageServer,
//     MessageType,
//     VCMessage,
//     VcHelper,
//     ExternalEventStream,
// } from '@guardian/common';
// import {
//     ExternalDocuments,
//     ExternalEvent,
//     ExternalEventType,
// } from '../interfaces/external-event.js';
//
// /**
//  * External events block
//  *
//  * Automatically pulls VC documents from configured external event streams
//  * (ExternalEventStream rows) and injects them into the policy flow.
//  */
// @EventBlock({
//     blockType: 'externalEventsBlock',
//     commonBlock: false,
//     actionType: LocationType.REMOTE,
//     about: {
//         label: 'External Events',
//         title: `Add 'External Events' Block`,
//         post: false,
//         get: true,
//         children: ChildrenType.Special,
//         control: ControlType.Server,
//         input: [
//             PolicyInputEventType.TimerEvent,
//         ],
//         output: [
//             PolicyOutputEventType.RunEvent,
//             PolicyOutputEventType.RefreshEvent,
//             PolicyOutputEventType.ErrorEvent,
//             PolicyOutputEventType.ReleaseEvent,
//         ],
//         defaultEvent: true,
//         properties: [],
//     },
//     variables: [],
// })
// export class ExternalEventsBlock {
//     /**
//      * Cron job
//      * @private
//      */
//     private job: CronJob;
//
//     /**
//      * After init callback
//      */
//     protected afterInit(): void {
//         const cronMask =
//             process.env.EXTERNAL_EVENTS_SCHEDULER ||
//             '0 */5 * * * *'; // every 5 minutes by default
//
//         this.job = new CronJob(
//             cronMask,
//             () => {
//                 this.run().then();
//             },
//             null,
//             false,
//             'UTC',
//         );
//
//         this.job.start();
//     }
//
//     /**
//      * Block destructor
//      */
//     protected destroy(): void {
//         if (this.job) {
//             this.job.stop();
//         }
//     }
//
//     /**
//      * Main cron tick
//      */
//     public async run(): Promise<void> {
//         const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
//
//         const externalEventStreams =
//             await ref.databaseServer.getActiveExternalEventStreams(
//                 ref.policyId,
//                 ref.uuid,
//             );
//
//         if (!externalEventStreams || externalEventStreams.length === 0) {
//             return;
//         }
//
//         for (const externalEventStream of externalEventStreams) {
//             if (externalEventStream.status === 'PROCESSING') {
//                 continue;
//             }
//
//             await this.runBySubscription(externalEventStream);
//         }
//     }
//
//     /**
//      * Process single subscription
//      * @param externalEventStream
//      * @private
//      */
//     private async runBySubscription(
//         externalEventStream: ExternalEventStream,
//     ): Promise<void> {
//         const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
//
//         externalEventStream.status = 'PROCESSING';
//
//         await ref.databaseServer.updateExternalEventStream(
//             externalEventStream,
//         );
//
//         const policyUser = await PolicyComponentsUtils.GetPolicyUserByDID(
//             externalEventStream.ownerDid,
//             null,
//             ref,
//             null,
//         );
//
//         try {
//             await this.receiveMessagesForSubscription(
//                 externalEventStream,
//                 policyUser,
//             );
//
//             externalEventStream.status = 'FREE';
//             externalEventStream.lastUpdate = new Date().toISOString();
//
//             await ref.databaseServer.updateExternalEventStream(
//                 externalEventStream,
//             );
//         } catch (error) {
//             externalEventStream.status = 'ERROR';
//
//             await ref.databaseServer.updateExternalEventStream(
//                 externalEventStream,
//             );
//
//             ref.error(
//                 `ExternalEventsBlock: ${PolicyUtils.getErrorMessage(error)}`,
//             );
//         }
//     }
//
//     /**
//      * Load and process messages for one subscription
//      * @param externalEventStream
//      * @param policyUser
//      * @private
//      */
//     private async receiveMessagesForSubscription(
//         externalEventStream: ExternalEventStream,
//         policyUser: PolicyUser,
//     ): Promise<void> {
//         const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
//
//         if (!externalEventStream.documentTopicId || !externalEventStream.schemaId) {
//             return;
//         }
//
//         const documentOwnerCredentials =
//             await PolicyUtils.getUserCredentials(
//                 ref,
//                 externalEventStream.ownerDid,
//                 policyUser.userId,
//             );
//
//         const hederaCredentials: IHederaCredentials =
//             await documentOwnerCredentials.loadHederaCredentials(
//                 ref,
//                 policyUser.userId,
//             );
//
//         const messages: VCMessage[] =
//             await MessageServer.getTopicMessages({
//                 topicId: externalEventStream.documentTopicId,
//                 userId: policyUser.userId,
//                 timeStamp: externalEventStream.lastMessage,
//             });
//
//         for (const message of messages) {
//             await this.processMessage(
//                 externalEventStream,
//                 hederaCredentials,
//                 policyUser,
//                 message,
//             );
//
//             externalEventStream.lastMessage = message.id;
//
//             await ref.databaseServer.updateExternalEventStream(
//                 externalEventStream,
//             );
//         }
//     }
//
//     /**
//      * Validate and inject single VC message
//      * @param externalEventStream
//      * @param hederaCredentials
//      * @param policyUser
//      * @param message
//      * @private
//      */
//     private async processMessage(
//         externalEventStream: ExternalEventStream,
//         hederaCredentials: IHederaCredentials,
//         policyUser: PolicyUser,
//         message: VCMessage,
//     ): Promise<void> {
//         const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
//
//         if (message.type !== MessageType.VCDocument) {
//             return;
//         }
//
//         if (message.payer !== hederaCredentials.hederaAccountId) {
//             return;
//         }
//
//         await MessageServer.loadDocument(
//             message,
//             hederaCredentials.hederaAccountKey,
//         );
//
//         const document: IVC = message.getDocument();
//
//         const validationError = await this.checkDocument(
//             externalEventStream,
//             document,
//         );
//
//         if (validationError) {
//             return;
//         }
//
//         const relationships = await this.getRelationships(
//             ref,
//             policyUser,
//         );
//
//         const relayerAccount =
//             await PolicyUtils.getRefRelayerAccount(
//                 ref,
//                 policyUser.did,
//                 null,
//                 relationships,
//                 policyUser.userId,
//             );
//
//         const policyDocument: IPolicyDocument =
//             PolicyUtils.createPolicyDocument(
//                 ref,
//                 policyUser,
//                 document,
//             );
//
//         policyDocument.schema = externalEventStream.schemaId;
//         policyDocument.relayerAccount = relayerAccount;
//
//         if (relationships) {
//             PolicyUtils.setDocumentRef(
//                 policyDocument,
//                 relationships,
//             );
//         }
//
//         if (policyDocument.relationships) {
//             policyDocument.relationships.push(message.getId());
//         } else {
//             policyDocument.relationships = [
//                 message.getId(),
//             ];
//         }
//
//         const eventState: IPolicyEventState = {
//             data: policyDocument,
//         };
//
//         ref.triggerEvents(
//             PolicyOutputEventType.RunEvent,
//             policyUser,
//             eventState,
//         );
//
//         ref.triggerEvents(
//             PolicyOutputEventType.ReleaseEvent,
//             policyUser,
//             null,
//         );
//
//         ref.triggerEvents(
//             PolicyOutputEventType.RefreshEvent,
//             policyUser,
//             eventState,
//         );
//
//         PolicyComponentsUtils.ExternalEventFn(
//             new ExternalEvent(
//                 ExternalEventType.Run,
//                 ref,
//                 policyUser,
//                 {
//                     documents: ExternalDocuments(policyDocument),
//                 },
//             ),
//         );
//
//         ref.backup();
//     }
//
//     /**
//      * Check VC against expected schema and proof
//      * @param externalEventStream
//      * @param document
//      * @private
//      */
//     private async checkDocument(
//         externalEventStream: ExternalEventStream,
//         document: IVC,
//     ): Promise<string | null> {
//         if (!document) {
//             return 'Invalid document';
//         }
//
//         if (
//             !Array.isArray(document['@context']) ||
//             document['@context'].indexOf(externalEventStream.schemaId) === -1
//         ) {
//             return 'Invalid schema';
//         }
//
//         let isValid: boolean;
//
//         try {
//             const vcHelper = new VcHelper();
//
//             const schemaResult = await vcHelper.verifySchema(
//                 document,
//             );
//
//             isValid = schemaResult.ok;
//
//             if (isValid) {
//                 isValid = await vcHelper.verifyVC(
//                     document,
//                 );
//             }
//         } catch (error) {
//             isValid = false;
//         }
//
//         if (!isValid) {
//             return 'Invalid proof';
//         }
//
//         return null;
//     }
//
//     /**
//      * Get relationships from SourceAddon (if present)
//      * @param ref
//      * @param policyUser
//      * @private
//      */
//     private async getRelationships(
//         ref: AnyBlockType,
//         policyUser: PolicyUser,
//     ): Promise<VcDocumentCollection | null> {
//         try {
//             for (const child of ref.children) {
//                 if (child.blockClassName === 'SourceAddon') {
//                     const childData =
//                         await (child as IPolicyAddonBlock).getFromSource(
//                             policyUser,
//                             null,
//                         );
//
//                     if (childData && childData.length > 0) {
//                         return childData[0];
//                     }
//                 }
//             }
//
//             return null;
//         } catch (error) {
//             ref.error(
//                 PolicyUtils.getErrorMessage(error),
//             );
//
//             return null;
//         }
//     }
//
//     /**
//      * Optional: expose current status for UI
//      */
//     public async getData(
//         policyUser: PolicyUser,
//     ): Promise<IPolicyGetData> {
//         const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
//
//         const externalEventStreams =
//             await ref.databaseServer.getActiveExternalEventStreams(
//                 ref.policyId,
//                 ref.uuid,
//             );
//
//         return {
//             id: ref.uuid,
//             blockType: ref.blockType,
//             actionType: ref.actionType,
//             readonly: true,
//             status: externalEventStreams
//                 ? externalEventStreams.map((externalEventStream) => {
//                     return {
//                         streamId: externalEventStream.streamId,
//                         documentTopicId: externalEventStream.documentTopicId,
//                         schemaId: externalEventStream.schemaId,
//                         lastMessage: externalEventStream.lastMessage,
//                         lastUpdate: externalEventStream.lastUpdate,
//                         status: externalEventStream.status,
//                     };
//                 })
//                 : [],
//         } as any;
//     }
// }
