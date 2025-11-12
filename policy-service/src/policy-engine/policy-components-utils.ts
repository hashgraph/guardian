import {
    EventActor,
    EventCallback,
    PolicyBlockFullArgumentList,
    PolicyBlockMap,
    PolicyInputEventType,
    PolicyLink,
    PolicyOutputEventType,
    PolicyTagMap
} from './interfaces/index.js';
import { BlockType, GenerateUUIDv4, IUser, LocationType, ModuleStatus, PolicyEvents, PolicyHelper } from '@guardian/interfaces';
import {
    ActionType,
    AnyBlockType,
    IPolicyBlock,
    IPolicyContainerBlock,
    IPolicyInstance,
    IPolicyInterfaceBlock,
    IPolicyNavigation,
    IPolicyNavigationStep,
    ISerializedBlock,
    ISerializedBlockExtend
} from './policy-engine.interface.js';
import { DatabaseServer, MessageError, MessageResponse, Policy, PolicyAction, PolicyComment, PolicyDiscussion, PolicyRoles, PolicyTool, Users } from '@guardian/common';
import { STATE_KEY } from './helpers/constants.js';
import { GetBlockByType } from './blocks/get-block-by-type.js';
import { GetOtherOptions } from './helpers/get-other-options.js';
import { GetBlockAbout } from './blocks/index.js';
import { PolicyUser, VirtualUser } from './policy-user.js';
import { ExternalEvent } from './interfaces/external-event.js';
import { BlockTreeGenerator } from './block-tree-generator.js';
import { PolicyNavigationMap } from './interfaces/block-state.js';
import { ComponentsService } from './helpers/components-service.js';
import { PolicyBackupService, PolicyRestoreService } from './restore-service.js';
import { PolicyActionsService } from './actions-service.js';
import { PolicyActionsUtils } from './policy-actions/utils.js';
import { PolicyUtils } from './helpers/utils.js';

/**
 * Policy tag helper
 */
export class TagHelper {
    /**
     * Parent tag
     */
    private readonly parent: string;

    /**
     * Root tag
     */
    private readonly root: string;

    constructor(parent?: string, root?: string) {
        this.parent = parent;
        this.root = root;
    }

    /**
     * Get new tag
     * @param oldTag
     */
    public getTag(oldTag: string): string {
        if (!this.parent || !oldTag) {
            return oldTag;
        }
        if (oldTag === this.root) {
            return this.parent;
        }
        return `${this.parent}:${oldTag}`;
    }
}

/**
 * Policy id helper
 */
export class IdHelper {
    /**
     * Ids
     */
    private readonly list: Set<string>;

    constructor() {
        this.list = new Set<string>();
    }

    /**
     * Get new id
     * @param oldId
     */
    public getId(oldId: string): string {
        if (oldId && !this.list.has(oldId)) {
            this.list.add(oldId);
            return oldId;
        }
        let uuid: string;
        do {
            uuid = GenerateUUIDv4();
        } while (this.list.has(uuid));
        this.list.add(uuid);
        return uuid;
    }
}

/**
 * Policy action map type
 */
export type PolicyActionMap = Map<string, Map<PolicyInputEventType, EventCallback<any>>>

/**
 * Update Event
 * @param blocks
 * @param user
 */
export function updateBlockEvent(blocks: string[], user: PolicyUser): void {
    const type = 'update';
    new BlockTreeGenerator().sendMessage(PolicyEvents.BLOCK_UPDATE_BROADCAST, { type, data: [blocks, user.toJson()] }, false);
}

/**
 * Error Event
 * @param blocks
 * @param user
 */
export function errorBlockEvent(blockType: string, message: any, user: PolicyUser): void {
    const type = 'error';
    new BlockTreeGenerator().sendMessage(PolicyEvents.BLOCK_UPDATE_BROADCAST, { type, data: [blockType, message, user.toJson()] }, false);
}

/**
 * Info Event
 * @param blocks
 * @param user
 */
export function infoBlockEvent(user: PolicyUser, policy: Policy): void {
    const type = 'update-user';
    new BlockTreeGenerator().sendMessage(PolicyEvents.BLOCK_UPDATE_BROADCAST, { type, data: [user.toJson(), policy] }, false);
}

/**
 * External Event
 * @param blocks
 * @param user
 */
export function externalBlockEvent(event: ExternalEvent<any>): void {
    const type = 'external';
    new BlockTreeGenerator().sendMessage(PolicyEvents.BLOCK_UPDATE_BROADCAST, { type, data: [event] }, false);
}

export function requestNotificationEvent(row: PolicyAction): void {
    new BlockTreeGenerator().sendMessage(PolicyEvents.REQUEST_UPDATE_BROADCAST, {
        id: row.id,
        type: row.type,
        accountId: row.accountId,
        policyId: row.policyId,
        status: row.status
    }, false);
};

export function restoreNotificationEvent(policyId: string): void {
    new BlockTreeGenerator().sendMessage(PolicyEvents.RESTORE_UPDATE_BROADCAST, {
        policyId
    }, false);
};

/**
 * Policy component utils
 */
export class PolicyComponentsUtils {
    /**
     * Block update timeout
     */
    private static readonly _blockUpdateTimeoutMap: Map<string, any> = new Map<
        string,
        any
    >();

    /**
     * Update block map
     */
    private static readonly _updateBlockMap: Map<string, Set<string>> = new Map<
        string,
        Set<string>
    >();

    /**
     * Block update function
     */
    public static BlockUpdateFn = (block: IPolicyBlock, user: PolicyUser) => {
        const did = user?.did;
        if (!did || !block?.uuid) {
            return;
        }

        let blocksToUpdate = PolicyComponentsUtils._updateBlockMap.get(did);
        if (!blocksToUpdate) {
            blocksToUpdate = new Set<string>();
            PolicyComponentsUtils._updateBlockMap.set(did, blocksToUpdate);
        }
        blocksToUpdate.add(block?.uuid);

        if (!PolicyComponentsUtils._blockUpdateTimeoutMap.has(did)) {
            PolicyComponentsUtils._blockUpdateTimeoutMap.set(
                did,
                setTimeout(() => {
                    updateBlockEvent(
                        PolicyComponentsUtils.getParentBlocksToUpdate(
                            block?.policyInstance?.config,
                            blocksToUpdate
                        ),
                        user
                    );
                    PolicyComponentsUtils._blockUpdateTimeoutMap.delete(did);
                    blocksToUpdate.clear();
                }, 2000)
            );
        }
    };
    /**
     * Returns blocks to update
     * @param root Root
     * @param blocksToUpdate Blocks to update
     * @param result Result
     * @returns
     */
    private static getParentBlocksToUpdate(
        root: any,
        blocksToUpdate: Set<string>
    ): string[] {
        const stack: any[] = [root];
        const result = [];
        while (stack.length > 0) {
            const block = stack.pop();
            if (blocksToUpdate.has(block?.id)) {
                result.push(block?.id);
            } else if (Array.isArray(block?.children)) {
                stack.push(...block.children);
            }
        }
        return result;
    }

    /**
     * Block error function
     */
    public static async BlockErrorFn(blockType: string, message: any, user: PolicyUser) {
        errorBlockEvent(blockType, message, user);
    };
    /**
     * Update user info function
     */
    public static async UpdateUserInfoFn(user: PolicyUser, policy: Policy) {
        infoBlockEvent(user, policy);
    };
    /**
     * External Event function
     */
    public static async ExternalEventFn(event: ExternalEvent<any>) {
        externalBlockEvent(event);
    };

    /**
     * Block ID list
     * policyId -> Blocks
     * @private
     */
    private static readonly BlockIdListByPolicyId: Map<string, string[]> =
        new Map();
    /**
     * External data blocks map
     * Block UUID -> Block component
     * @private
     */
    public static readonly ExternalDataBlocks: Map<string, IPolicyBlock> =
        new Map();
    /**
     * Block map
     * Block UUID -> Block component
     * @private
     */
    private static readonly BlockByBlockId: PolicyBlockMap = new Map();
    /**
     * Block tag map
     * policyId -> Block tag -> Block UUID
     * @private
     */
    private static readonly TagMapByPolicyId: Map<string, PolicyTagMap> =
        new Map();
    /**
     * Block navigation map
     * policyId -> Block tag -> Block UUID
     * @private
     */
    private static readonly NavigationMapByPolicyId: Map<string, PolicyNavigationMap> =
        new Map();
    /**
     * Policy actions map
     * policyId -> blockId -> EventName -> Function
     * @private
     */
    private static readonly ActionMapByPolicyId: Map<string, PolicyActionMap> =
        new Map();

    /**
     * Policy Instance map
     * policyId -> PolicyInstance
     * @private
     */
    private static readonly PolicyById: Map<string, IPolicyInstance> =
        new Map();

    /**
     * Document cache fieldsmap
     * policyId -> fields
     * @private
     */
    private static readonly DocumentCacheFieldsMap: Map<string, Set<string>> =
        new Map();

    /**
     * Policy Internal Events
     * policyId -> eventType -> callback
     * @private
     */
    private static readonly InternalListeners: Map<
        string,
        Map<string, Function[]>
    > = new Map();

    /**
     * Backup Controllers
     * policyId -> PolicyBackup
     * @private
     */
    private static readonly BackupControllers: Map<string, PolicyBackupService> = new Map();

    /**
     * Restore Controllers
     * policyId -> PolicyRestore
     * @private
     */
    private static readonly RestoreControllers: Map<string, PolicyRestoreService> = new Map();

    /**
     * Actions Controllers
     * policyId -> PolicyActions
     * @private
     */
    private static readonly ActionsControllers: Map<string, PolicyActionsService> = new Map();

    /**
     * Get document cache fields
     * @param policyId Policy identifier
     * @returns Fields
     */
    public static getDocumentCacheFields(policyId: string) {
        let cache = PolicyComponentsUtils.DocumentCacheFieldsMap.get(policyId);
        if (!cache) {
            cache = new Set<string>(['id', 'credentialSubject.id', 'credentialSubject.0.id']);
            PolicyComponentsUtils.DocumentCacheFieldsMap.set(policyId, cache);
        }
        return cache;
    }

    /**
     * Log events
     * @param text
     * @private
     */
    private static logEvents(text: string) {
        if (process.env.EVENTS_LOG) {
            console.info('EVENTS_LOG:', text);
        }
    }

    /**
     * Register action
     * @param target
     * @param eventType
     * @param fn
     */
    public static RegisterAction(
        target: IPolicyBlock,
        eventType: PolicyInputEventType,
        fn: EventCallback<any>
    ): void {
        const policyId = target.policyId;
        const blockUUID = target.uuid;

        let actionMap: PolicyActionMap;
        if (PolicyComponentsUtils.ActionMapByPolicyId.has(policyId)) {
            actionMap = PolicyComponentsUtils.ActionMapByPolicyId.get(policyId);
        } else {
            actionMap = new Map();
            PolicyComponentsUtils.ActionMapByPolicyId.set(policyId, actionMap);
        }

        let callbackMap: Map<PolicyInputEventType, EventCallback<any>>;
        if (actionMap.has(blockUUID)) {
            callbackMap = actionMap.get(blockUUID);
        } else {
            callbackMap = new Map();
            actionMap.set(blockUUID, callbackMap);
        }

        callbackMap.set(eventType, fn);
    }

    /**
     * Create link
     * @param sourceBlock
     * @param outputName
     * @param targetBlock
     * @param inputName
     * @param actor
     */
    public static CreateLink<T>(
        sourceBlock: IPolicyBlock,
        outputName: PolicyOutputEventType,
        targetBlock: IPolicyBlock,
        inputName: PolicyInputEventType,
        actor: EventActor
    ): PolicyLink<T> {
        if (!sourceBlock || !targetBlock) {
            return null;
        }
        if (
            PolicyComponentsUtils.ActionMapByPolicyId.has(targetBlock.policyId)
        ) {
            const policyMap = PolicyComponentsUtils.ActionMapByPolicyId.get(targetBlock.policyId);
            if (policyMap.has(targetBlock.uuid)) {
                const blockMap = policyMap.get(targetBlock.uuid);
                switch (targetBlock.blockType) {
                    case 'module': {
                        if (blockMap.has(PolicyInputEventType.ModuleEvent)) {
                            const fn = blockMap.get(PolicyInputEventType.ModuleEvent);
                            return new PolicyLink(
                                inputName,
                                outputName,
                                sourceBlock,
                                targetBlock,
                                actor,
                                fn
                            );
                        }
                        break;
                    }
                    case 'tool': {
                        if (blockMap.has(PolicyInputEventType.ToolEvent)) {
                            const fn = blockMap.get(PolicyInputEventType.ToolEvent);
                            return new PolicyLink(
                                inputName,
                                outputName,
                                sourceBlock,
                                targetBlock,
                                actor,
                                fn
                            );
                        }
                        break;
                    }
                    default: {
                        if (blockMap.has(inputName)) {
                            const fn = blockMap.get(inputName);
                            return new PolicyLink(
                                inputName,
                                outputName,
                                sourceBlock,
                                targetBlock,
                                actor,
                                fn
                            );
                        }
                        break;
                    }
                }
            }
        }
        return null;
    }

    /**
     * Register link
     * @param source
     * @param output
     * @param target
     * @param input
     * @param actor
     */
    public static RegisterLink(
        source: IPolicyBlock,
        output: PolicyOutputEventType,
        target: IPolicyBlock,
        input: PolicyInputEventType,
        actor: EventActor
    ): void {
        if (!source || !target) {
            PolicyComponentsUtils.logEvents(
                `link error: ${source?.uuid}(${source?.tag})(${output}) -> ${target?.uuid}(${target?.tag})(${input})`
            );
            return;
        }
        const link = PolicyComponentsUtils.CreateLink(
            source,
            output,
            target,
            input,
            actor
        );
        if (link) {
            link.source.addSourceLink(link);
            link.target.addTargetLink(link);
            PolicyComponentsUtils.logEvents(
                `link registered: ${source?.uuid}(${source?.tag})(${output}) -> ${target?.uuid}(${target?.tag})(${input})`
            );
        } else {
            PolicyComponentsUtils.logEvents(
                `link error: ${source?.uuid}(${source?.tag})(${output}) -> ${target?.uuid}(${target?.tag})(${input})`
            );
        }
    }

    /**
     * Return new uniq id for block
     */
    public static GenerateNewUUID(): string {
        let uuid: string;
        do {
            uuid = GenerateUUIDv4();
        } while (PolicyComponentsUtils.BlockByBlockId.has(uuid));
        return uuid;
    }

    /**
     * Register new block instance in policy
     * @param policyId
     * @param component
     */
    private static RegisterComponent(
        policyId: string,
        component: IPolicyBlock
    ): void {
        PolicyComponentsUtils.BlockByBlockId.set(component.uuid, component);
        let tagMap: PolicyTagMap;
        if (!PolicyComponentsUtils.TagMapByPolicyId.has(policyId)) {
            tagMap = new Map();
            PolicyComponentsUtils.TagMapByPolicyId.set(policyId, tagMap);
        } else {
            tagMap = PolicyComponentsUtils.TagMapByPolicyId.get(policyId);
        }

        let blockList: string[];
        if (!PolicyComponentsUtils.BlockIdListByPolicyId.has(policyId)) {
            blockList = [];
            PolicyComponentsUtils.BlockIdListByPolicyId.set(
                policyId,
                blockList
            );
        } else {
            blockList = PolicyComponentsUtils.BlockIdListByPolicyId.get(policyId);
        }
        blockList.push(component.uuid);

        if (component.tag) {
            if (tagMap.has(component.tag)) {
                throw new Error(
                    `Block with tag ${component.tag} already exist`
                );
            }
            tagMap.set(component.tag, component.uuid);
        }
        if (component.blockClassName === 'ExternalData') {
            PolicyComponentsUtils.ExternalDataBlocks.set(
                component.uuid,
                component
            );
        }
    }

    /**
     * Build block instance
     * @param policy
     * @param policyId
     * @param block
     * @param parent
     * @param components
     * @param allInstances
     */
    public static async BuildInstance(
        policy: Policy | PolicyTool,
        policyId: string,
        block: ISerializedBlock,
        parent: IPolicyBlock,
        components: ComponentsService,
        allInstances: IPolicyBlock[]
    ): Promise<IPolicyBlock> {
        const {
            blockType,
            options,
            children,
            otherOptions
        } = await PolicyComponentsUtils.GetInstanceParams(block, parent);
        const blockConstructor = GetBlockByType(blockType) as any;
        const blockInstance = new blockConstructor(
            options.id,
            options.defaultActive,
            options.tag,
            options.permissions,
            options._parent,
            otherOptions,
            components
        );
        blockInstance.setPolicyInstance(policyId, policy);
        blockInstance.setPolicyOwner(policy.owner);
        blockInstance.setTopicId(policy.topicId);

        PolicyComponentsUtils.RegisterVariables(blockInstance);

        allInstances.push(blockInstance);

        if (Array.isArray(children)) {
            for (const child of children) {
                await PolicyComponentsUtils.BuildInstance(
                    policy,
                    policyId,
                    child,
                    blockInstance,
                    components,
                    allInstances
                );
            }
        }

        return blockInstance;
    }

    /**
     * Get block instance options
     * @param block
     * @param parent
     */
    public static async GetInstanceParams(
        block: ISerializedBlock,
        parent: IPolicyBlock
    ) {
        const { blockType, children, ...params }: ISerializedBlockExtend = block;
        if (parent) {
            params._parent = parent;
        }
        let options = params as any;
        if (options.options) {
            options = Object.assign(options, options.options);
        }
        if (!options.id) {
            options.id = PolicyComponentsUtils.GenerateNewUUID();
        }

        const otherOptions = GetOtherOptions(options as PolicyBlockFullArgumentList);

        return { blockType, options, children, otherOptions };
    }

    /**
     * Build block instances tree
     * @param policy
     * @param policyId
     * @param allInstances
     */
    public static async BuildBlockTree(
        policy: Policy,
        policyId: string,
        components: ComponentsService,
    ) {
        const allInstances: IPolicyBlock[] = [];
        const configObject = policy.config as ISerializedBlock;
        const rootInstance = await PolicyComponentsUtils.BuildInstance(
            policy,
            policyId,
            configObject,
            null,
            components,
            allInstances
        ) as IPolicyInterfaceBlock;
        return { rootInstance, allInstances };
    }

    /**
     * Build block instances tree
     * @param policy
     * @param policyId
     * @param allInstances
     */
    public static async RegeneratePolicy(
        policy: Policy | PolicyTool
    ) {
        const configObject = policy.config as ISerializedBlock;
        const tools: PolicyTool[] = [];
        const tagHelper = new TagHelper();
        const idHelper = new IdHelper();
        await PolicyComponentsUtils.RegeneratePolicyComponents(
            configObject,
            tools,
            tagHelper,
            idHelper
        );
        policy.config = configObject;
        return { policy, tools };
    }

    /**
     * Regenerate policy components
     * @param block
     * @param tools
     * @param tagHelper
     */
    public static async RegeneratePolicyComponents(
        block: any,
        tools: PolicyTool[],
        tagHelper: TagHelper,
        idHelper: IdHelper
    ): Promise<void> {
        block.id = idHelper.getId(block.id);
        PolicyComponentsUtils.RegenerateTags(block, tagHelper);
        if (block.blockType === BlockType.Tool) {
            block.children = [];
            const tool = await DatabaseServer.getTool({
                status: { $in: [ModuleStatus.PUBLISHED, ModuleStatus.DRY_RUN] },
                messageId: block.messageId,
                hash: block.hash
            });
            if (tool && tool.config) {
                tagHelper = new TagHelper(block.tag, tool.config.tag);

                block.variables = tool.config.variables || [];
                block.inputEvents = tool.config.inputEvents || [];
                block.outputEvents = tool.config.outputEvents || [];
                block.children = tool.config.children || [];

                const events = block.events || [];
                const innerEvents = tool.config.events || [];
                for (const event of innerEvents) {
                    event.target = tagHelper.getTag(event.target);
                    event.source = tagHelper.getTag(event.source);
                }
                block.events = [
                    ...events,
                    ...innerEvents
                ];

                tools.push(tool);
            }
        }
        if (Array.isArray(block.children)) {
            for (const child of block.children) {
                await PolicyComponentsUtils.RegeneratePolicyComponents(
                    child,
                    tools,
                    tagHelper,
                    idHelper
                );
            }
        }
    }

    /**
     * Regenerate tags
     * @param block
     * @param tagHelper
     */
    public static RegenerateTags(block: any, tagHelper: TagHelper): void {
        block.tag = tagHelper.getTag(block.tag);
        if (Array.isArray(block.events)) {
            for (const event of block.events) {
                event.target = tagHelper.getTag(event.target);
                event.source = tagHelper.getTag(event.source);
            }
        }
        if (Array.isArray(block.uiMetaData?.fields)) {
            for (const field of block.uiMetaData.fields) {
                if (field.bindGroup) {
                    field.bindGroup = tagHelper.getTag(field.bindGroup);
                }
                if (field.bindBlock) {
                    field.bindBlock = tagHelper.getTag(field.bindBlock);
                }
                if (field.bindBlocks) {
                    field.bindBlocks = field.bindBlocks.map(item => tagHelper.getTag(item));
                }
            }
        }
        if (block.finalBlocks) {
            block.finalBlocks = tagHelper.getTag(block.finalBlocks);
        }
        if (block.errorFallbackTag) {
            block.errorFallbackTag = tagHelper.getTag(block.errorFallbackTag);
        }
    }

    /**
     * Register policy instance
     *
     * @param policyId
     * @param policy
     */
    public static async RegisterPolicyInstance(
        policyId: string,
        policy: Policy,
        components: ComponentsService
    ) {
        const dryRun = PolicyHelper.isDryRunMode(policy) ? policyId : null;
        const policyInstance: IPolicyInstance = {
            policyId,
            dryRun,
            components,
            isMultipleGroup: !!policy.policyGroups?.length,
            instanceTopicId: policy.instanceTopicId,
            synchronizationTopicId: policy.synchronizationTopicId,
            owner: policy.owner,
            policyOwner: policy.owner,
            policyStatus: policy.status,
            locationType: policy.locationType
        };
        PolicyComponentsUtils.PolicyById.set(policyId, policyInstance);
    }

    /**
     * Register block instances tree
     * @param allInstances
     */
    public static async RegisterBlockTree(allInstances: IPolicyBlock[]) {
        for (const instance of allInstances) {
            PolicyComponentsUtils.RegisterComponent(
                instance.policyId,
                instance
            );

            for (const event of instance.actions) {
                PolicyComponentsUtils.RegisterAction(
                    instance,
                    event[0],
                    event[1]
                );
            }

            await instance.beforeInit();
        }

        for (const instance of allInstances) {
            await instance.afterInit();
            await PolicyComponentsUtils.RegisterDefaultEvent(instance);
            await PolicyComponentsUtils.RegisterCustomEvent(instance);
        }
    }

    /**
     * Register policy instance
     *
     * @param policyId
     * @param policy
     * @constructor
     */
    public static async RegisterNavigation(
        policyId: string,
        navigation: IPolicyNavigation[]
    ) {
        const map: PolicyNavigationMap = new Map<string, IPolicyNavigationStep[]>();
        PolicyComponentsUtils.NavigationMapByPolicyId.set(policyId, map);
        if (Array.isArray(navigation)) {
            navigation.forEach(nav => {
                if (Array.isArray(nav.steps)) {
                    nav.steps.forEach((step: IPolicyNavigationStep) => {
                        step.uuid = PolicyComponentsUtils.TagMapByPolicyId.get(policyId).get(step.block);
                    });
                }
                map.set(nav.role, nav.steps);
            });
        }
    }

    /**
     * Unregister blocks
     * @param policyId
     */
    public static async UnregisterBlocks(policyId: string) {
        const blockList = PolicyComponentsUtils.BlockIdListByPolicyId.get(policyId);
        for (const uuid of blockList) {
            const component = PolicyComponentsUtils.BlockByBlockId.get(uuid);
            if (component) {
                component.destroy();
            }
            PolicyComponentsUtils.ExternalDataBlocks.delete(uuid);
            PolicyComponentsUtils.BlockByBlockId.delete(uuid);
        }
        PolicyComponentsUtils.TagMapByPolicyId.delete(policyId);
        PolicyComponentsUtils.ActionMapByPolicyId.delete(policyId);
        PolicyComponentsUtils.InternalListeners.delete(policyId);
    }

    /**
     * Unregister blocks
     * @param policyId
     */
    public static async UnregisterPolicy(policyId: string) {
        PolicyComponentsUtils.PolicyById.delete(policyId);
    }

    /**
     * Register default events
     * @param instance
     * @private
     */
    private static async RegisterDefaultEvent(instance: IPolicyBlock) {
        if (!instance.options.stopPropagation) {
            PolicyComponentsUtils.RegisterLink(
                instance,
                PolicyOutputEventType.RunEvent,
                instance.next,
                PolicyInputEventType.RunEvent,
                EventActor.EventInitiator
            );
        }
        if (instance.parent?.blockClassName === 'ContainerBlock') {
            PolicyComponentsUtils.RegisterLink(
                instance,
                PolicyOutputEventType.RefreshEvent,
                instance.parent as IPolicyContainerBlock,
                PolicyInputEventType.RefreshEvent,
                EventActor.EventInitiator
            );
        }
        if (instance.parent?.blockType === 'interfaceStepBlock') {
            PolicyComponentsUtils.RegisterLink(
                instance,
                PolicyOutputEventType.ReleaseEvent,
                instance.parent as IPolicyContainerBlock,
                PolicyInputEventType.ReleaseEvent,
                EventActor.EventInitiator
            );
        }
    }

    /**
     * Register custom events
     * @param instance
     * @private
     */
    private static async RegisterCustomEvent(instance: IPolicyBlock) {
        for (const event of instance.events) {
            if (!event.disabled) {
                if (event.source === instance.tag) {
                    const target =
                        PolicyComponentsUtils.GetBlockByTag<IPolicyBlock>(
                            instance.policyId,
                            event.target
                        );
                    PolicyComponentsUtils.RegisterLink(
                        instance,
                        event.output,
                        target,
                        event.input,
                        event.actor
                    );
                } else if (event.target === instance.tag) {
                    const source =
                        PolicyComponentsUtils.GetBlockByTag<IPolicyBlock>(
                            instance.policyId,
                            event.source
                        );
                    PolicyComponentsUtils.RegisterLink(
                        source,
                        event.output,
                        instance,
                        event.input,
                        event.actor
                    );
                } else {
                    const target =
                        PolicyComponentsUtils.GetBlockByTag<IPolicyBlock>(
                            instance.policyId,
                            event.target
                        );
                    const source =
                        PolicyComponentsUtils.GetBlockByTag<IPolicyBlock>(
                            instance.policyId,
                            event.source
                        );
                    PolicyComponentsUtils.RegisterLink(
                        source,
                        event.output,
                        target,
                        event.input,
                        event.actor
                    );
                }
            }
        }
    }

    /**
     * Run policy block instance action when external data income
     * @param data
     */
    public static async ReceiveExternalData(data: any): Promise<void> {
        const policy = await DatabaseServer.getPolicyByTag(data?.policyTag);
        if (policy) {
            const policyId = policy.id.toString();
            for (const block of PolicyComponentsUtils.ExternalDataBlocks.values()) {
                if (block.policyId === policyId) {
                    await (block as any).receiveData(data);
                }
            }
        } else {
            console.log(`ExternalData: policy not found (${data?.policyTag})`);
        }
    }

    /**
     * Check if id already registered
     * @param uuid
     */
    public static IfUUIDRegistered(uuid: string): boolean {
        return PolicyComponentsUtils.BlockByBlockId.has(uuid);
    }

    /**
     * Get block instance by uuid
     * @param uuid
     */
    public static GetBlockByUUID<T extends IPolicyInterfaceBlock | IPolicyBlock>(uuid: string): T {
        return PolicyComponentsUtils.BlockByBlockId.get(uuid) as T;
    }

    /**
     * Get block instance by tag
     * @param policyId
     * @param tag
     */
    public static GetBlockByTag<T extends IPolicyInterfaceBlock | IPolicyBlock>(
        policyId: string,
        tag: string
    ): T {
        const uuid = PolicyComponentsUtils.TagMapByPolicyId.get(policyId).get(tag);
        return PolicyComponentsUtils.BlockByBlockId.get(uuid) as T;
    }

    /**
     * Get tag block map
     * @param policyId Policy identifier
     * @returns Tag block map
     */
    public static GetTagBlockMap(policyId: string) {
        return PolicyComponentsUtils.TagMapByPolicyId.get(policyId);
    }

    /**
     * Get navigation
     * @param policyId
     * @param role
     */
    public static GetNavigation<T extends IPolicyNavigationStep[]>(
        policyId: string,
        user: PolicyUser
    ): T {
        if (!PolicyComponentsUtils.PolicyById.has(policyId)) {
            throw new Error('The policy does not exist');
        }
        if (!PolicyComponentsUtils.NavigationMapByPolicyId.has(policyId)) {
            return null;
        }
        const navMap = PolicyComponentsUtils.NavigationMapByPolicyId.get(policyId);
        if (!user.role) {
            if (user.isAdmin) {
                return navMap.get('OWNER') as T;
            } else {
                return navMap.get('NO_ROLE') as T;
            }
        } else {
            return navMap.get(user.role) as T;
        }
    }

    /**
     * Get block instance by tag
     * @param policyId
     */
    public static GetPolicyInstance(policyId: string): IPolicyInstance {
        if (!PolicyComponentsUtils.PolicyById.has(policyId)) {
            throw new Error('The policy does not exist');
        }
        return PolicyComponentsUtils.PolicyById.get(policyId);
    }

    /**
     * Return block state fields
     * @param target
     */
    public static GetStateFields(target: any): any {
        return target[STATE_KEY];
    }

    /**
     * Return block instance reference
     * @param obj
     */
    public static GetBlockRef<T extends AnyBlockType>(obj: any): T {
        return obj as T;
    }

    /**
     * Return block options object
     * @param obj
     */
    public static GetBlockUniqueOptionsObject(obj: any): {
        [key: string]: any;
    } {
        return obj.options;
    }

    /**
     * Get block about
     */
    public static GetBlockAbout(): any {
        return GetBlockAbout();
    }

    /**
     * Get Policy Groups
     * @param policy
     * @param user
     * @param savepointIds
     */
    public static async GetGroups(
        policy: IPolicyInstance | IPolicyInterfaceBlock,
        user: PolicyUser,
        savepointIds?: string[]
    ): Promise<PolicyRoles[]> {
        return await policy.components.databaseServer.getGroupsByUser(
            policy.policyId,
            user.did,
            {
                fields: ['uuid', 'role', 'groupLabel', 'groupName', 'active'],
                savepointIds,
            }
        );
    }

    /**
     * Add Internal Event Listener
     * @param type
     */
    public static AddInternalListener(
        type: string,
        policyId: string,
        callback: Function
    ) {
        let policyMap = PolicyComponentsUtils.InternalListeners.get(policyId);
        if (!policyMap) {
            policyMap = new Map();
            PolicyComponentsUtils.InternalListeners.set(policyId, policyMap);
        }
        let listeners = policyMap.get(type);
        if (!listeners) {
            listeners = [];
            policyMap.set(type, listeners);
        }
        listeners.push(callback);
    }

    /**
     * Trigger Internal Event
     * @param type
     * @param data
     */
    public static async TriggerInternalEvent(
        type: string,
        policyId: string,
        data: any
    ): Promise<void> {
        const policyMap = PolicyComponentsUtils.InternalListeners.get(policyId);
        if (policyMap) {
            const listeners = policyMap.get(type);
            if (listeners) {
                for (const callback of listeners) {
                    await callback(data);
                }
            }
        }
    }

    /**
     * Get Parent Module
     * @param block
     */
    public static GetModule<T>(block: AnyBlockType): T {
        if (!block || !block.parent) {
            return null;
        }
        if (block.parent.blockType === 'module') {
            return block.parent as T;
        }
        if (block.parent.blockType === 'tool') {
            return block.parent as T;
        }
        return PolicyComponentsUtils.GetModule(block.parent);
    }

    /**
     * Replace Value by path
     * @param block
     * @param path
     * @param newValue
     */
    public static ReplaceObjectValue(
        data: any,
        path: string,
        newValue: Function
    ): void {
        try {
            const keys = path.split('.');
            let value = data;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (value) {
                    value = value[key];
                } else {
                    return;
                }
            }
            if (value) {
                const lastKey = keys[keys.length - 1];
                value[lastKey] = newValue(value[lastKey]);
            }
        } catch (error) {
            return;
        }
    }

    /**
     * Register Variables
     * @param block
     */
    public static RegisterVariables(block: AnyBlockType): void {
        const modules = PolicyComponentsUtils.GetModule<any>(block);
        if (!modules) {
            return;
        }

        for (let index = 0; index < block.permissions.length; index++) {
            block.permissions[index] = modules.getVariables(block.permissions[index], 'Role');
        }

        for (const variable of block.variables) {
            PolicyComponentsUtils.ReplaceObjectValue(
                block,
                variable.path,
                (value: any) => {
                    return modules.getVariables(value, variable.type);
                }
            );
        }
    }

    /**
     * Get policy components
     * @param policyId
     */
    public static GetPolicyComponents(policyId: string): ComponentsService | null {
        if (PolicyComponentsUtils.PolicyById.has(policyId)) {
            return PolicyComponentsUtils.PolicyById.get(policyId).components;
        }
        return null;
    }

    /**
     * Get user by account
     * @param account
     * @param instance
     */
    public static async GetPolicyUserByAccount(
        account: string,
        instance: IPolicyInstance | AnyBlockType,
        userId: string | null
    ): Promise<PolicyUser> {
        if (!account) {
            return null;
        }

        const regUser = await (new Users()).getUserByAccount(account, userId);
        if (!regUser || !regUser.did) {
            return null;
        }

        const userFull = new PolicyUser(regUser, instance);
        const groups = await instance
            .components
            .databaseServer
            .getGroupsByUser(instance.policyId, userFull.did);
        for (const group of groups) {
            if (group.active !== false) {
                return userFull.setCurrentGroup(group);
            }
        }
        return userFull;
    }

    /**
     * Get user by name
     * @param username
     * @param instance
     * @param userId
     * @param savepointIds
     */
    public static async GetPolicyUserByName(
        username: string,
        instance: IPolicyInstance | AnyBlockType,
        userId: string | null,
        savepointIds?: string[],
    ): Promise<PolicyUser> {
        if (!username) {
            return null;
        }

        const regUser = await (new Users()).getUser(username, userId);
        if (!regUser || !regUser.did) {
            return null;
        }

        let userFull: PolicyUser;
        const virtual = !!instance.dryRun;
        if (virtual) {
            const virtualUser = await DatabaseServer.getVirtualUser(instance.policyId);
            userFull = new VirtualUser(virtualUser || regUser, instance);
        } else {
            userFull = new PolicyUser(regUser, instance);
        }

        const groups = await instance
            .components
            .databaseServer
            .getGroupsByUser(instance.policyId, userFull.did, {
                savepointIds,
            });
        for (const group of groups) {
            if (group.active !== false) {
                return userFull.setCurrentGroup(group);
            }
        }
        return userFull;
    }

    public static async GetPolicyUserByDID(
        did: string,
        groupUUID: string,
        instance: IPolicyInstance | AnyBlockType,
        userId: string | null
    ): Promise<PolicyUser> {
        const virtual = !!instance.dryRun;
        let userFull: PolicyUser;
        if (virtual) {
            userFull = new VirtualUser({ did }, instance);
        } else {
            const regUser = await (new Users()).getUserById(did, userId);
            if (regUser) {
                userFull = new PolicyUser(regUser, instance);
            } else {
                userFull = new PolicyUser(did, instance);
            }
        }

        if (groupUUID) {
            const group = await instance
                .components
                .databaseServer
                .getUserInGroup(instance.policyId, did, groupUUID);
            return userFull.setCurrentGroup(group);
        } else if (!userFull.isAdmin) {
            const group = await instance
                .components
                .databaseServer
                .getActiveGroupByUser(instance.policyId, did);
            return userFull.setCurrentGroup(group);
        } else {
            return userFull;
        }
    }

    public static async GetPolicyUserByGroup(
        group: PolicyRoles,
        instance: IPolicyInstance | AnyBlockType,
        userId: string | null
    ): Promise<PolicyUser> {
        const virtual = !!instance.dryRun;
        let userFull: PolicyUser;
        if (virtual) {
            userFull = new VirtualUser(group, instance);
        } else {
            const regUser = await (new Users()).getUserById(group.did, userId);
            if (regUser) {
                userFull = new PolicyUser(regUser, instance);
            } else {
                userFull = new PolicyUser(group.did, instance);
            }
        }
        return userFull.setCurrentGroup(group);
    }

    public static async GetVirtualUser(
        did: string,
        instance: IPolicyInstance | AnyBlockType
    ): Promise<PolicyUser> {
        const userFull = new VirtualUser({ did }, instance);
        const groups = await instance
            .components
            .databaseServer
            .getGroupsByUser(instance.policyId, userFull.did);
        for (const group of groups) {
            if (group.active !== false) {
                return userFull.setCurrentGroup(group);
            }
        }
        return userFull;
    }

    public static async GetActiveVirtualUser(
        instance: IPolicyInstance | AnyBlockType
    ): Promise<PolicyUser> {
        const virtualUser = await DatabaseServer.getVirtualUser(instance.policyId);
        if (virtualUser) {
            const userFull = new VirtualUser(virtualUser, instance);
            const group = await instance
                .components
                .databaseServer
                .getActiveGroupByUser(instance.policyId, userFull.did);
            return userFull.setCurrentGroup(group);
        }
        return null;
    }

    /**
     * Register Backup Controller
     * @param policyId
     */
    public static RegisterBackupService(policyId: string, controller: PolicyBackupService) {
        PolicyComponentsUtils.BackupControllers.set(policyId, controller);
    }

    /**
     * Register Restore Controller
     * @param policyId
     */
    public static RegisterRestoreService(policyId: string, controller: PolicyRestoreService) {
        PolicyComponentsUtils.RestoreControllers.set(policyId, controller);
    }

    /**
     * Register Actions Controller
     * @param policyId
     */
    public static RegisterActionsService(policyId: string, controller: PolicyActionsService) {
        PolicyComponentsUtils.ActionsControllers.set(policyId, controller);
    }

    /**
     * Unregister Backup Controller
     * @param policyId
     */
    public static UnregisterBackupService(policyId: string) {
        PolicyComponentsUtils.BackupControllers.delete(policyId);
    }

    /**
     * Unregister Restore Controller
     * @param policyId
     */
    public static UnregisterRestoreService(policyId: string) {
        PolicyComponentsUtils.RestoreControllers.delete(policyId);
    }

    /**
     * Unregister Actions Controller
     * @param policyId
     */
    public static UnregisterActionsService(policyId: string) {
        PolicyComponentsUtils.ActionsControllers.delete(policyId);
    }

    /**
     * Create new diff
     * @param policyId
     */
    public static backup(policyId: string) {
        if (PolicyComponentsUtils.BackupControllers.has(policyId)) {
            PolicyComponentsUtils.BackupControllers.get(policyId).backup();
        }
    }

    /**
     * Create new diff
     * @param policyId
     */
    public static async backupKeys(
        policyId: string,
        options: {
            comments: {
                discussion?: string,
                user?: string,
            }
        }
    ) {
        if (PolicyComponentsUtils.BackupControllers.has(policyId)) {
            await PolicyComponentsUtils.BackupControllers.get(policyId).backupKeys(options);
        }
    }

    public static async restoreState(policyId: string) {
        const blockList = PolicyComponentsUtils.BlockIdListByPolicyId.get(policyId);
        for (const uuid of blockList) {
            const component = PolicyComponentsUtils.BlockByBlockId.get(uuid);
            if (component) {
                await component.restoreState();
            }
        }
    }

    public static async isAvailableGetData(
        block: IPolicyInterfaceBlock | null,
        user: PolicyUser
    ): Promise<MessageError<any> | null> {
        if (!block) {
            return new MessageError('Block Unavailable', 503);
        }
        if (!(await block.isAvailable(user))) {
            return new MessageError('Block Unavailable', 503);
        }
        if (typeof block.getData !== 'function') {
            return new MessageError('Block is not supporting get data functions', 500);
        }
        return null;
    }

    public static async blockGetData(
        block: IPolicyInterfaceBlock,
        user: PolicyUser,
        params: any
    ): Promise<MessageResponse<any>> {
        const result = await block.getData(user, block.uuid, params);
        return new MessageResponse(result);
    }

    public static async isAvailableSetData(
        block: IPolicyInterfaceBlock | null,
        user: PolicyUser
    ): Promise<MessageError<any> | null> {
        if (!block) {
            return new MessageError('Block Unavailable', 503);
        }
        if (!(await block.isAvailable(user))) {
            return new MessageError('Block Unavailable', 503);
        }
        if (typeof block.setData !== 'function') {
            return new MessageError('Block is not supporting set data functions', 500);
        }
        return null;
    }

    private static async _blockSetDataLocal(
        block: IPolicyInterfaceBlock,
        user: PolicyUser,
        data: any
    ): Promise<MessageResponse<any> | MessageError<any>> {
        const result = await block.setData(user, data, ActionType.COMMON);
        return new MessageResponse(result);
    }

    private static async _blockSetDataRemote(
        block: IPolicyInterfaceBlock,
        user: PolicyUser,
        data: any
    ): Promise<MessageResponse<any> | MessageError<any>> {
        const controller = PolicyComponentsUtils.ActionsControllers.get(block.policyId);
        if (controller) {
            const result = await controller.sendAction(block, user, data);
            return new MessageResponse(result);
        } else {
            return new MessageError('Invalid policy controller', 500);
        }
    }

    private static async _blockSetDataCustom(
        block: IPolicyInterfaceBlock,
        user: PolicyUser,
        data: any
    ): Promise<MessageResponse<any> | MessageError<any>> {
        const _data = await block.setData(user, data, ActionType.LOCAL);
        const controller = PolicyComponentsUtils.ActionsControllers.get(block.policyId);
        if (controller) {
            const result = await controller.sendAction(block, user, _data);
            return new MessageResponse(result);
        } else {
            return new MessageError('Invalid policy controller', 500);
        }
    }

    private static async _checkRelayerAccount(
        ref: IPolicyInterfaceBlock,
        user: PolicyUser,
        data: any
    ): Promise<string> {
        if (!data.relayerAccount || ref.dryRun) {
            return;
        }

        if (![
            'requestVcDocumentBlock',
            'requestVcDocumentBlockAddon',
            'externalDataBlock'
        ].includes(ref.blockType)) {
            return;
        }

        const relayerAccountConfig = data.relayerAccount;

        const balance = await PolicyUtils.checkAccountBalance(relayerAccountConfig, user.userId);
        if (balance === false) {
            return 'The relayer account has insufficient balance.';
        }

        if (balance === null) {
            return `Invalid relayer account.`;
        }

        let relayerAccount: any;
        if (typeof relayerAccountConfig === 'string') {
            relayerAccount = await (new Users()).getUserRelayerAccount(user.did, relayerAccountConfig, user.userId);
        } else {
            relayerAccount = await (new Users()).createRelayerAccount({ did: user.did, id: user.userId }, relayerAccountConfig, user.userId);
        }
        if (!relayerAccount) {
            return `Invalid relayer account.`;
        }

        if (ref.locationType === LocationType.REMOTE) {
            await PolicyComponentsUtils._sendRelayerAccount(ref, user, relayerAccount);
        }

        data.relayerAccount = relayerAccount.account;
    }

    private static async _sendRelayerAccount(
        ref: IPolicyInterfaceBlock,
        user: PolicyUser,
        relayerAccount: any
    ): Promise<void> {
        const userId = user.userId;
        const relayerAccountKey = await PolicyUtils.loadRelayerAccount(user.did, relayerAccount.account, ref, userId);
        relayerAccount.key = relayerAccountKey.hederaAccountKey;
        await PolicyActionsUtils.setRelayerAccount({ ref, user, relayerAccount, userId });
    }

    public static async blockSetData(
        block: IPolicyInterfaceBlock,
        user: PolicyUser,
        data: any
    ): Promise<MessageResponse<any> | MessageError<any>> {
        const error = await PolicyComponentsUtils._checkRelayerAccount(block, user, data);
        if (error) {
            return new MessageError(error, 500);
        }
        if (block.actionType === LocationType.LOCAL) {
            //Action - local, policy - local|remote, user - local|remote
            return await PolicyComponentsUtils._blockSetDataLocal(block, user, data);
        } else {
            //Action - custom, policy - local|remote, user - remote
            if (user.location === LocationType.REMOTE) {
                return new MessageError('Invalid action for remote user', 503);
            }
            if (block.locationType === LocationType.REMOTE) {
                if (block.actionType === LocationType.CUSTOM) {
                    //Action - custom, policy - remote, user - local
                    return await PolicyComponentsUtils._blockSetDataCustom(block, user, data);
                } else {
                    //Action - remote, policy - remote, user - local
                    return await PolicyComponentsUtils._blockSetDataRemote(block, user, data);
                }
            } else {
                //Action - custom | remote, policy - local, user - local
                return await PolicyComponentsUtils._blockSetDataLocal(block, user, data);
            }
        }
    }

    public static async selectGroup(
        policyInstance: IPolicyInterfaceBlock,
        user: PolicyUser,
        uuid: string
    ): Promise<MessageResponse<any> | MessageError<any>> {
        if (policyInstance.policyInstance?.locationType === LocationType.LOCAL) {
            const result = policyInstance.components.selectGroup(user, uuid) as any;
            return new MessageResponse(result);
        }

        if (user.location === LocationType.REMOTE) {
            return new MessageError('Invalid action for remote user', 503);
        }

        if (policyInstance.locationType === LocationType.REMOTE) {
            const controller = PolicyComponentsUtils.ActionsControllers.get(policyInstance.policyId);
            if (controller) {
                const result = await controller.selectGroup(user, uuid);
                return new MessageResponse(result);
            } else {
                return new MessageError('Invalid policy controller', 500);
            }
        } else {
            const result = policyInstance.components.selectGroup(user, uuid) as any;
            return new MessageResponse(result);
        }
    }

    public static isAvailableReceiveData(block: IPolicyInterfaceBlock | IPolicyBlock | null, policyId: string): boolean {
        if (!block) {
            return false;
        }
        if (typeof (block as any).receiveData !== 'function') {
            return false;
        }
        if (block.policyId !== policyId) {
            return false;
        }
        return true;
    }

    public static async blockReceiveData(block: IPolicyInterfaceBlock | IPolicyBlock, data: any): Promise<any> {
        return await (block as any).receiveData(data);
    }

    public static getActionsController(policyId: string) {
        const controller = PolicyComponentsUtils.ActionsControllers.get(policyId);
        if (controller) {
            return controller;
        } else {
            throw new MessageError('Invalid policy controller', 500);
        }
    }

    /**
     * Policy request notifications
     */
    public static async sentRequestNotification(row: PolicyAction) {
        requestNotificationEvent(row);
    };

    /**
     * Policy restore notifications
     */
    public static async sentRestoreNotification(policyId: string) {
        restoreNotificationEvent(policyId);
    };

    public static async createPolicyDiscussion(
        policy: IPolicyInstance | AnyBlockType,
        policyId: string,
        discussion: PolicyDiscussion,
        user: IUser,
    ) {
        if (policy.locationType === LocationType.REMOTE) {
            const policyUser = await PolicyComponentsUtils.GetPolicyUserByName(user?.username, policy, user.id);
            const userId = policyUser.userId;
            return await PolicyActionsUtils.createPolicyDiscussion({ policyId, user: policyUser, discussion, userId });
        } else {
            const options = {
                comments: {
                    discussion: discussion.id
                }
            }
            await PolicyComponentsUtils.backupKeys(policyId, options);
            PolicyComponentsUtils.backup(policyId);
            return discussion;
        }
    }

    public static async createPolicyComment(
        policy: IPolicyInstance | AnyBlockType,
        policyId: string,
        comment: PolicyComment,
        user: IUser,
    ) {
        if (policy.locationType === LocationType.REMOTE) {
            const policyUser = await PolicyComponentsUtils.GetPolicyUserByName(user?.username, policy, user.id);
            const userId = policyUser.userId;
            return await PolicyActionsUtils.createPolicyComment({ policyId, user: policyUser, comment, userId });
        } else {
            PolicyComponentsUtils.backup(policyId);
            return comment;
        }
    }
}
