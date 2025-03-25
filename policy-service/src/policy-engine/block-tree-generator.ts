import { DataBaseHelper, DatabaseServer, MessageError, MessageResponse, NatsService, PinoLogger, Policy, Singleton, Users } from '@guardian/common';
import { GenerateUUIDv4, IUser, PolicyEvents } from '@guardian/interfaces';
import { headers } from 'nats';
import { Inject } from '../helpers/decorators/inject.js';
import { PolicyValidator } from '../policy-engine/block-validators/index.js';
import { ComponentsService } from './helpers/components-service.js';
import { PolicyComponentsUtils } from './policy-components-utils.js';
import { IPolicyBlock, IPolicyInstance, IPolicyInterfaceBlock, IPolicyNavigationStep } from './policy-engine.interface.js';
import { PolicyUser } from './policy-user.js';
import { RecordUtils } from './record-utils.js';
import { PolicyBackup, PolicyRestore } from './db-restore/index.js';

/**
 * Block tree generator
 */
@Singleton
export class BlockTreeGenerator extends NatsService {
    /**
     * Policy models map
     * @private
     */
    private readonly models: Map<string, IPolicyBlock> = new Map();
    /**
     * Users helper
     * @private
     */
    @Inject()
    declare private users: Users;
    /**
     * Message queue name
     */
    public messageQueueName = 'block-tree-generator-queue';
    /**
     * Reply subject
     * @private
     */
    public replySubject = 'block-tree-generator-reply-' + GenerateUUIDv4();

    /**
     * Get user
     * @param policy
     * @param user
     */
    public async getUser(
        policy: IPolicyInstance | IPolicyInterfaceBlock,
        user: IUser
    ): Promise<PolicyUser> {
        const policyUser = await PolicyComponentsUtils.GetPolicyUserByName(user?.username, policy);
        if (!user) {
            throw new Error(`Forbidden`);
        }
        return policyUser;
    }

    /**
     * Get messages
     * @param subject
     * @param cb
     */
    public getPolicyMessages<T, A>(subject: string, policyId, cb: Function) {
        this.connection.subscribe([policyId, subject].join('-'), {
            queue: this.messageQueueName,
            callback: async (error, msg) => {
                try {
                    const pId = msg.headers.get('policyId');
                    if (pId === policyId) {
                        const messageId = msg.headers.get('messageId');
                        const head = headers();
                        head.append('messageId', messageId);
                        const respond = await cb(await this.codec.decode(msg.data), msg.headers);
                        msg.respond(await this.codec.encode(respond), { headers: head });
                    }
                } catch (error) {
                    const messageId = msg.headers.get('messageId');
                    const head = headers();
                    head.append('messageId', messageId);
                    msg.respond(await this.codec.encode(new MessageError(error.message)), { headers: head });
                }
            }
        });
    }

    /**
     * Init policy events
     */
    async initPolicyEvents(policyId: string, policyInstance: IPolicyInterfaceBlock, policy: Policy): Promise<void> {
        this.getPolicyMessages(PolicyEvents.CHECK_IF_ALIVE, policyId, async (msg: any) => {
            return new MessageResponse(true);
        });

        this.getPolicyMessages(PolicyEvents.GET_ROOT_BLOCK_DATA, policyId, async (msg: any) => {
            const { user } = msg;

            const userFull = await this.getUser(policyInstance, user);

            if (policyInstance && (await policyInstance.isAvailable(userFull))) {
                const data = await policyInstance.getData(userFull, policyInstance.uuid);
                return new MessageResponse(data);
            } else {
                return new MessageError('Block Unavailable', 503);
            }
        });

        this.getPolicyMessages(PolicyEvents.GET_POLICY_GROUPS, policyId, async (msg: any) => {
            const { user } = msg;

            const userFull = await this.getUser(policyInstance, user);

            const templates = policyInstance.components.getGroupTemplates<any>();
            if (templates.length === 0) {
                return new MessageResponse([]);
            }

            const groups = await PolicyComponentsUtils.GetGroups(policyInstance, userFull);
            return new MessageResponse(groups);
        });

        this.getPolicyMessages(PolicyEvents.SELECT_POLICY_GROUP, policyId, async (msg: any) => {
            const { user, uuid } = msg;
            const userFull = await this.getUser(policyInstance, user);

            // <-- Record
            await RecordUtils.RecordSelectGroup(policyId, userFull, uuid);
            // Record -->

            const result = policyInstance.components.selectGroup(userFull, uuid) as any;
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.GET_BLOCK_DATA, policyId, async (msg: any) => {
            const { user, blockId, params } = msg;

            const userFull = await this.getUser(policyInstance, user);
            const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(blockId);

            if (block && (await block.isAvailable(userFull))) {
                const data = await block.getData(userFull, blockId, params);
                return new MessageResponse(data);
            } else {
                return new MessageError('Block Unavailable', 503);
            }
        });

        this.getPolicyMessages(PolicyEvents.GET_BLOCK_DATA_BY_TAG, policyId, async (msg: any) => {
            const { user, tag, params } = msg;

            const userFull = await this.getUser(policyInstance, user);
            const block = PolicyComponentsUtils.GetBlockByTag<IPolicyInterfaceBlock>(policyId, tag);

            if (block && (await block.isAvailable(userFull))) {
                if (typeof block.getData !== 'function') {
                    throw new Error(
                        'Block is not supporting get data functions'
                    );
                }
                const data = await block.getData(userFull, block.uuid, params);
                return new MessageResponse(data);
            } else {
                return new MessageError('Block Unavailable', 503);
            }
        });

        this.getPolicyMessages(PolicyEvents.SET_BLOCK_DATA, policyId, async (msg: any) => {
            const { user, blockId, data } = msg;
            const userFull = await this.getUser(policyInstance, user);
            const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(blockId);

            // <-- Record
            await RecordUtils.RecordSetBlockData(policyId, userFull, block, data);
            // Record -->

            if (block && (await block.isAvailable(userFull))) {
                if (typeof block.setData !== 'function') {
                    throw new Error(
                        'Block is not supporting set data functions'
                    );
                }
                const result = await block.setData(userFull, data);
                return new MessageResponse(result);
            } else {
                return new MessageError('Block Unavailable', 503);
            }
        });

        this.getPolicyMessages(PolicyEvents.SET_BLOCK_DATA_BY_TAG, policyId, async (msg: any) => {
            const { user, tag, data } = msg;
            const userFull = await this.getUser(policyInstance, user);
            const block = PolicyComponentsUtils.GetBlockByTag<IPolicyInterfaceBlock>(policyId, tag);

            // <-- Record
            await RecordUtils.RecordSetBlockData(policyId, userFull, block, data);
            // Record -->

            if (block && (await block.isAvailable(userFull))) {
                const result = await block.setData(userFull, data);
                return new MessageResponse(result);
            } else {
                return new MessageError('Block Unavailable', 503);
            }
        });

        this.getPolicyMessages(PolicyEvents.BLOCK_BY_TAG, policyId, async (msg: any) => {
            const { tag } = msg;
            const block = PolicyComponentsUtils.GetBlockByTag<IPolicyBlock>(policyId, tag);
            return new MessageResponse({ id: block.uuid });
        });

        this.getPolicyMessages(PolicyEvents.GET_TAG_BLOCK_MAP, policyId, async () => {
            return new MessageResponse(Object.fromEntries(PolicyComponentsUtils.GetTagBlockMap(policyId)));
        });

        this.getPolicyMessages(PolicyEvents.GET_POLICY_NAVIGATION, policyId, async (msg: any) => {
            const { user } = msg;
            const userFull = await this.getUser(policyInstance, user);
            const navigation = PolicyComponentsUtils.GetNavigation<IPolicyNavigationStep[]>(policyId, userFull);
            return new MessageResponse(navigation);
        });

        this.getPolicyMessages(PolicyEvents.GET_BLOCK_PARENTS, policyId, async (msg: any) => {
            const { blockId } = msg;
            const block = PolicyComponentsUtils.GetBlockByUUID<IPolicyInterfaceBlock>(blockId);
            let tmpBlock: IPolicyBlock = block;
            const parents = [block.uuid];
            while (tmpBlock.parent) {
                parents.push(tmpBlock.parent.uuid);
                tmpBlock = tmpBlock.parent;
            }
            return new MessageResponse(parents);
        });

        this.getPolicyMessages(PolicyEvents.MRV_DATA, policyId, async (msg: any) => {
            const { data } = msg;

            // <-- Record
            await RecordUtils.RecordExternalData(policyId, data);
            // Record -->

            for (const block of PolicyComponentsUtils.ExternalDataBlocks.values()) {
                if (block.policyId === policyId) {
                    await (block as any).receiveData(data);
                }
            }
            return new MessageResponse({});
        });

        this.getPolicyMessages(PolicyEvents.MRV_DATA_CUSTOM, policyId, async (msg: any) => {
            const { data } = msg;

            // <-- Record
            await RecordUtils.RecordExternalData(policyId, data.data);
            // Record -->

            const block = PolicyComponentsUtils.GetBlockByTag(policyId, data.blockTag);
            if (block && (block.policyId === policyId)) {
                await (block as any).receiveData(data.data);
            }
            return new MessageResponse({});
        });

        this.getPolicyMessages(PolicyEvents.CREATE_VIRTUAL_USER, policyId, async (msg: any) => {
            const { did, data } = msg;
            await RecordUtils.RecordCreateUser(policyId, did, data);
            return new MessageResponse({});
        });

        this.getPolicyMessages(PolicyEvents.SET_VIRTUAL_USER, policyId, async (msg: any) => {
            const { did } = msg;
            await RecordUtils.RecordSetUser(policyId, did);
            return new MessageResponse({});
        });

        this.getPolicyMessages(PolicyEvents.REFRESH_MODEL, policyId, async () => {
            await DataBaseHelper.orm.em.fork().refresh(policy);
            return new MessageResponse(policy);
        });
    }

    /**
     * Init record events
     */
    async initRecordEvents(policyId: string): Promise<void> {
        this.getPolicyMessages(PolicyEvents.START_RECORDING, policyId, async (msg: any) => {
            const result = await RecordUtils.StartRecording(policyId);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.STOP_RECORDING, policyId, async (msg: any) => {
            const result = await RecordUtils.StopRecording(policyId);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.GET_RECORD_STATUS, policyId, async (msg: any) => {
            const result = RecordUtils.GetRecordStatus(policyId);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.GET_RECORDED_ACTIONS, policyId, async (msg: any) => {
            const result = await RecordUtils.GetRecordedActions(policyId);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.RUN_RECORD, policyId, async (msg: any) => {
            const { records, results, options } = msg;
            const result = await RecordUtils.RunRecord(policyId, records, results, options);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.STOP_RUNNING, policyId, async (msg: any) => {
            const result = await RecordUtils.StopRunning(policyId);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.GET_RECORD_RESULTS, policyId, async (msg: any) => {
            const result = await RecordUtils.GetRecordResults(policyId);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.FAST_FORWARD, policyId, async (msg: any) => {
            const options = msg;
            const result = await RecordUtils.FastForward(policyId, options);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.RECORD_RETRY_STEP, policyId, async (msg: any) => {
            const options = msg;
            const result = await RecordUtils.RetryStep(policyId, options);
            return new MessageResponse(result);
        });

        this.getPolicyMessages(PolicyEvents.RECORD_SKIP_STEP, policyId, async (msg: any) => {
            const options = msg;
            const result = await RecordUtils.SkipStep(policyId, options);
            return new MessageResponse(result);
        });
    }

    /**
     * Init restore
     */
    async initPolicyRestore(policyId: string): Promise<void> {
        const controller = new PolicyBackup(policyId);
        await controller.init();
        await controller.save();

        const controller1 = new PolicyRestore(policyId);
        await controller1.restore(
            `VERSION: 1.0.0
DATE: 2025-03-20T14:47:44.523Z
TYPE: backup
COLLECTION: VC
SIZE: 1
HASH: 13bdf609edd917a554d22d4571f06100
{"type":"Set","id":"67c1db24ed765be4723f4d1f","data":{"owner":"did:hedera:testnet:9W9hXhmAFy1WAiQKNy7xozGEMXwPMwuc1p5YUgvGQGsL_0.0.5463437","hash":"GKPmVXpNYf4BeKSd1kuuQxKP1ViTqiC17bkZriJHjRrN","type":"POLICY","policyId":"67b72b3e42a26886c86a4e92","hederaStatus":"NEW","signature":0,"option":{"status":"NEW"},"document":"eyJpZCI6InVybjp1dWlkOmI5NTYyMzgyLWFlZjMtNDkwNC05ZTVhLWM2ZDI5OWVkY2Y2OCIsInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiXSwiaXNzdWVyIjoiZGlkOmhlZGVyYTp0ZXN0bmV0OjlXOWhYaG1BRnkxV0FpUUtOeTd4b3pHRU1Yd1BNd3VjMXA1WVVndkdRR3NMXzAuMC41NDYzNDM3IiwiaXNzdWFuY2VEYXRlIjoiMjAyNS0wMi0yOFQxNTo0OTo1Ni4wMzFaIiwiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiLCJpcGZzOi8vYmFma3JlaWRleHl4cHhqZXJ5anBvYjJzbXZzaGpieWlzYzQ0cXd6Nnh3amE0b3lzNXFvaXFmbmJ0aWEiXSwiY3JlZGVudGlhbFN1YmplY3QiOlt7Im5hbWUiOiJpUmVjXzRfMTczOTg4ODMyMzg2NiIsImRlc2NyaXB0aW9uIjoiaVJlYyBEZXNjcmlwdGlvbiIsInRvcGljRGVzY3JpcHRpb24iOiJpUmVjIERlc2NyaXB0aW9uIiwidmVyc2lvbiI6IjEuMC4wIiwicG9saWN5VGFnIjoiVGFnXzE3NDAwNTcyNzc1MTEiLCJvd25lciI6ImRpZDpoZWRlcmE6dGVzdG5ldDo5VzloWGhtQUZ5MVdBaVFLTnk3eG96R0VNWHdQTXd1YzFwNVlVZ3ZHUUdzTF8wLjAuNTQ2MzQzNyIsImNpZCI6ImJhZmtyZWlnZGszbnNueDRsaTdrb2hldWpibGE3NDZ3d3dheHR2a2VzcW83cG9rcG83cml1b2pibWc0IiwidXJsIjoiaXBmczovL2JhZmtyZWlnZGszbnNueDRsaTdrb2hldWpibGE3NDZ3d3dheHR2a2VzcW83cG9rcG83cml1b2pibWc0IiwidXVpZCI6IjgxZjcxYTkzLWMzZDUtNDY1Yy1iZDgzLTAwYzAxNTRiZTNmMiIsIm9wZXJhdGlvbiI6IlBVQkxJU0giLCJAY29udGV4dCI6WyJpcGZzOi8vYmFma3JlaWRleHl4cHhqZXJ5anBvYjJzbXZzaGpieWlzYzQ0cXd6Nnh3amE0b3lzNXFvaXFmbmJ0aWEiXSwiaWQiOiJ1cm46dXVpZDoxNzQwNzU3Nzg2LjcyMzExNzAwMCIsInR5cGUiOiJQb2xpY3kifV0sInByb29mIjp7InR5cGUiOiJFZDI1NTE5U2lnbmF0dXJlMjAxOCIsImNyZWF0ZWQiOiIyMDI1LTAyLTI4VDE1OjQ5OjU2WiIsInZlcmlmaWNhdGlvbk1ldGhvZCI6ImRpZDpoZWRlcmE6dGVzdG5ldDo5VzloWGhtQUZ5MVdBaVFLTnk3eG96R0VNWHdQTXd1YzFwNVlVZ3ZHUUdzTF8wLjAuNTQ2MzQzNyNkaWQtcm9vdC1rZXkiLCJwcm9vZlB1cnBvc2UiOiJhc3NlcnRpb25NZXRob2QiLCJqd3MiOiJleUpoYkdjaU9pSkZaRVJUUVNJc0ltSTJOQ0k2Wm1Gc2MyVXNJbU55YVhRaU9sc2lZalkwSWwxOS4uOXFsMnA4bUpDVnBDcmR0U0FGZ2xVSU5fN2h6TS1LY1BPUW5yZ0VrN0xROE44TWlTNFFRaGo0Sk5raDFDaVpXTmtnbjhMMXBBX2txQkZTajdYNUR5QncifX0="}}`
        );
        await controller1.restore(
            `VERSION: 1.0.0
DATE: 2025-03-20T14:55:33.739Z
TYPE: diff
COLLECTION: VC
SIZE: 2
HASH: 62615523b7a53856018d1c5a7e41ffe3
{"type":"Create","id":"67dc2c1aa610b71a49735495","data":{"owner":"did:hedera:testnet:GRE6dwt1nnfmi46SGmjf1yYbJ3HHp6xwDjgfHszYcGgL_0.0.5463437","hash":"7DVKbL35MxifZo4UMKdAmDoMGLNL599KwTSk6hVjSLoV","hederaStatus":"NEW","signature":0,"type":"user-role","policyId":"67b72b3e42a26886c86a4e92","tag":"choose_role","schema":"#UserRole","messageId":"1742482456.271357000","topicId":"0.0.5638398","relationships":null,"group":null,"option":{"status":"NEW"},"document":"eyJpZCI6InVybjp1dWlkOjk2NjEyMjE2LTY0OTEtNGMyNy05ZGFmLWRlOTg0OWUyY2UwOCIsInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiXSwiaXNzdWVyIjoiZGlkOmhlZGVyYTp0ZXN0bmV0OkdSRTZkd3Qxbm5mbWk0NlNHbWpmMXlZYkozSEhwNnh3RGpnZkhzelljR2dMXzAuMC41NDYzNDM3IiwiaXNzdWFuY2VEYXRlIjoiMjAyNS0wMy0yMFQxNDo1NDowOC45NzZaIiwiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiLCJpcGZzOi8vYmFma3JlaWRxenhqcXlqYzVsbWlhNWV1cGQ0d2JwbXJhMmt2eHAzdndrM2xreGhmNHlhb3M3NzVhYWEiXSwiY3JlZGVudGlhbFN1YmplY3QiOlt7InJvbGUiOiJSZWdpc3RyYW50IiwidXNlcklkIjoiZGlkOmhlZGVyYTp0ZXN0bmV0OkdSRTZkd3Qxbm5mbWk0NlNHbWpmMXlZYkozSEhwNnh3RGpnZkhzelljR2dMXzAuMC41NDYzNDM3IiwicG9saWN5SWQiOiI2N2I3MmIzZTQyYTI2ODg2Yzg2YTRlOTIiLCJncm91cE93bmVyIjoiZGlkOmhlZGVyYTp0ZXN0bmV0OkdSRTZkd3Qxbm5mbWk0NlNHbWpmMXlZYkozSEhwNnh3RGpnZkhzelljR2dMXzAuMC41NDYzNDM3IiwiZ3JvdXBOYW1lIjoiUmVnaXN0cmFudCIsIkBjb250ZXh0IjpbImlwZnM6Ly9iYWZrcmVpZHF6eGpxeWpjNWxtaWE1ZXVwZDR3YnBtcmEya3Z4cDN2d2szbGt4aGY0eWFvczc3NWFhYSJdLCJpZCI6InVybjp1dWlkOjk2NjEyMjE2LTY0OTEtNGMyNy05ZGFmLWRlOTg0OWUyY2UwOCIsInR5cGUiOiJVc2VyUm9sZSJ9XSwicHJvb2YiOnsidHlwZSI6IkVkMjU1MTlTaWduYXR1cmUyMDE4IiwiY3JlYXRlZCI6IjIwMjUtMDMtMjBUMTQ6NTQ6MDlaIiwidmVyaWZpY2F0aW9uTWV0aG9kIjoiZGlkOmhlZGVyYTp0ZXN0bmV0OkdSRTZkd3Qxbm5mbWk0NlNHbWpmMXlZYkozSEhwNnh3RGpnZkhzelljR2dMXzAuMC41NDYzNDM3I2RpZC1yb290LWtleSIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsImp3cyI6ImV5SmhiR2NpT2lKRlpFUlRRU0lzSW1JMk5DSTZabUZzYzJVc0ltTnlhWFFpT2xzaVlqWTBJbDE5Li5UNFpWZ1JNR1Iyc3JJeDFWUHRkdVdVNjhFSEZZbThBWkVNaUREM0lPY0psZmlQUmFhX045QktNNE9lV0FsQ0E1Y25sa3hTTWU5eTk3Tm1PSmhQRmdEZyJ9fQ=="}}
{"type":"Create","id":"67dc2c35a610b71a497354a2","data":{"owner":"did:hedera:testnet:GRE6dwt1nnfmi46SGmjf1yYbJ3HHp6xwDjgfHszYcGgL_0.0.5463437","hash":"5NYE5Yup8f4c5ciUqu4rqa44T7hzTipnr7zBwDLiR35o","document":"eyJpZCI6InVybjp1dWlkOmY4NWI5MDI3LTdmYWUtNDkxZC1iMTlkLTA1OWIyYzRhODQyZSIsInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiXSwiaXNzdWVyIjoiZGlkOmhlZGVyYTp0ZXN0bmV0OkdSRTZkd3Qxbm5mbWk0NlNHbWpmMXlZYkozSEhwNnh3RGpnZkhzelljR2dMXzAuMC41NDYzNDM3IiwiaXNzdWFuY2VEYXRlIjoiMjAyNS0wMy0yMFQxNDo1NDoyNi4yNzBaIiwiQGNvbnRleHQiOlsiaHR0cHM6Ly93d3cudzMub3JnLzIwMTgvY3JlZGVudGlhbHMvdjEiLCJpcGZzOi8vYmFma3JlaWZzYmdmanNzaHk2enJlN2VqZm94MnVuaTVuM2JjZGZtdWthY3M2NWFxMmkzNHpqbWJ2dGEiXSwiY3JlZGVudGlhbFN1YmplY3QiOlt7ImZpZWxkMSI6eyJ0eXBlIjoiZTYyNDM3MTgtMzU3Yy00NWM3LTkyODYtNzAwNWRkYWIxN2EyJjEuMC4wIiwiQGNvbnRleHQiOlsiaXBmczovL2JhZmtyZWlmc2JnZmpzc2h5NnpyZTdlamZveDJ1bmk1bjNiY2RmbXVrYWNzNjVhcTJpMzR6am1idnRhIl19LCJmaWVsZDIiOnsidHlwZSI6IjdhNDM5YzAwLTYzM2ItNDljNy05Zjg4LTMwMmE5NTFmYTIzYSYxLjAuMCIsIkBjb250ZXh0IjpbImlwZnM6Ly9iYWZrcmVpZnNiZ2Zqc3NoeTZ6cmU3ZWpmb3gydW5pNW4zYmNkZm11a2FjczY1YXEyaTM0emptYnZ0YSJdfSwiZmllbGQzIjp7InR5cGUiOiIwZDVjZWQ5Yy04M2IwLTRmMGItYTY0MS05OTk4NjA4MWNlNTAmMS4wLjAiLCJAY29udGV4dCI6WyJpcGZzOi8vYmFma3JlaWZzYmdmanNzaHk2enJlN2VqZm94MnVuaTVuM2JjZGZtdWthY3M2NWFxMmkzNHpqbWJ2dGEiXX0sInBvbGljeUlkIjoiNjdiNzJiM2U0MmEyNjg4NmM4NmE0ZTkyIiwiQGNvbnRleHQiOlsiaXBmczovL2JhZmtyZWlmc2JnZmpzc2h5NnpyZTdlamZveDJ1bmk1bjNiY2RmbXVrYWNzNjVhcTJpMzR6am1idnRhIl0sImlkIjoiZGlkOmhlZGVyYTp0ZXN0bmV0OkdSRTZkd3Qxbm5mbWk0NlNHbWpmMXlZYkozSEhwNnh3RGpnZkhzelljR2dMXzAuMC41NDYzNDM3IiwidHlwZSI6IjFmZGE4ZDg0LTcwODEtNGY3NS1iODk5LWY3NjVhZGVlNzVmZiYxLjAuMCJ9XSwicHJvb2YiOnsidHlwZSI6IkVkMjU1MTlTaWduYXR1cmUyMDE4IiwiY3JlYXRlZCI6IjIwMjUtMDMtMjBUMTQ6NTQ6MjZaIiwidmVyaWZpY2F0aW9uTWV0aG9kIjoiZGlkOmhlZGVyYTp0ZXN0bmV0OkdSRTZkd3Qxbm5mbWk0NlNHbWpmMXlZYkozSEhwNnh3RGpnZkhzelljR2dMXzAuMC41NDYzNDM3I2RpZC1yb290LWtleSIsInByb29mUHVycG9zZSI6ImFzc2VydGlvbk1ldGhvZCIsImp3cyI6ImV5SmhiR2NpT2lKRlpFUlRRU0lzSW1JMk5DSTZabUZzYzJVc0ltTnlhWFFpT2xzaVlqWTBJbDE5Li5BVUdzc1RCa0NVYXlSemZMZjloT09oT0syWjlsblJlTllJNlhqRHgtSzlVLTMwaXJQcnItMnlTNGxGR2FDbzg5VWRGMElyc1JwTC1ZMGtXSDlfRlREdyJ9fQ==","documentFields":["id","credentialSubject.id","credentialSubject.0.id","credentialSubject.0.field1.field0","credentialSubject.0.field2.field0","credentialSubject.0.field4.field0","credentialSubject.0.field4.field1","credentialSubject.0.field4.field4","credentialSubject.0.field4.field5","credentialSubject.0.field4.field7","credentialSubject.0.field6","credentialSubject.0.field8","credentialSubject.0.field7","issuanceDate","credentialSubject.0.ref","verifiableCredential.1.credentialSubject.0.date","verifiableCredential.1.credentialSubject.0.tokenId","verifiableCredential.0.credentialSubject.0.field1","credentialSubject.0.field3.field0"],"hederaStatus":"ISSUE","signature":0,"type":"registrant","policyId":"67b72b3e42a26886c86a4e92","tag":"create_application(db)","option":{"status":"Waiting for approval"},"schema":"#1fda8d84-7081-4f75-b899-f765adee75ff&1.0.0","messageId":"1742482484.539181000","topicId":"0.0.5752131","relationships":null,"accounts":{"default":"0.0.5096739"},"group":"947fef67-655a-4aee-81b1-da172dd814ab","messageHash":"29VbFZV9gBAejKRvfQEnkyu4RUb1YTc8jAnsRPXeed5d","messageIds":["1742482484.539181000"]}}`
        );
    }

    /**
     * Generate policy instance from config
     * @param policy
     * @param skipRegistration
     * @param policyValidator
     * @param logger
     */
    public async generate(
        policy: Policy,
        skipRegistration: boolean,
        policyValidator: PolicyValidator,
        logger: PinoLogger
    ): Promise<IPolicyBlock | { type: 'error', message: string }> {
        if (!policy || (typeof policy !== 'object')) {
            throw new Error('Policy was not exist');
        }

        const policyId: string = policy.id?.toString() || PolicyComponentsUtils.GenerateNewUUID();

        try {
            if (await policyValidator.build(policy)) {
                await policyValidator.validate();
            }

            const { tools } = await PolicyComponentsUtils.RegeneratePolicy(policy);

            const components = new ComponentsService(policy, policyId);
            await components.registerPolicy(policy);
            for (const tool of tools) {
                await components.registerTool(tool);
            }

            const {
                rootInstance,
                allInstances
            } = await PolicyComponentsUtils.BuildBlockTree(policy, policyId, components);
            await components.registerRoot(rootInstance);

            if (!skipRegistration) {
                await PolicyComponentsUtils.RegisterPolicyInstance(policyId, policy, components);
                await PolicyComponentsUtils.RegisterBlockTree(allInstances);
                this.models.set(policyId, rootInstance);
            }
            await this.initPolicyEvents(policyId, rootInstance, policy);
            await this.initRecordEvents(policyId);
            await this.initPolicyRestore(policyId);

            await PolicyComponentsUtils.RegisterNavigation(policyId, policy.policyNavigation);

            return rootInstance;
        } catch (error) {
            await logger.error(`Error build policy ${error}`, ['POLICY', policy.name, policyId.toString()]);
            policyValidator.addError(typeof error === 'string' ? error : error.message);
            return {
                type: 'error',
                message: error.message
            };
        }
    }

    public async destroyModel(policyId: string, logger: PinoLogger): Promise<void> {
        try {
            await RecordUtils.DestroyRecording(policyId);
            await RecordUtils.DestroyRunning(policyId);
            await PolicyComponentsUtils.UnregisterBlocks(policyId);
            await PolicyComponentsUtils.UnregisterPolicy(policyId);
            this.models.delete(policyId);
        } catch (error) {
            await logger.error(`Error destroy policy ${error}`, ['POLICY', policyId.toString()]);
        }
    }


    /**
     * Regenerate IDs
     * @param block
     */
    public regenerateIds(block: any) {
        block.id = GenerateUUIDv4();
        if (Array.isArray(block.children)) {
            for (const child of block.children) {
                this.regenerateIds(child);
            }
        }
    }

    /**
     * Get root
     * @param policyId
     */
    public getRoot(policyId: any): IPolicyInterfaceBlock {
        const model = this.models.get(policyId) as IPolicyInterfaceBlock;
        if (!model) {
            throw new Error('Unexisting policy');
        }
        return model;
    }
}
