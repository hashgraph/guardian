import { EventActor, EventCallback, PolicyBlockFullArgumentList, PolicyBlockMap, PolicyInputEventType, PolicyLink, PolicyOutputEventType, PolicyTagMap } from '@policy-engine/interfaces';
import { GenerateUUIDv4, PolicyEvents, PolicyType } from '@guardian/interfaces';
import { AnyBlockType, IPolicyBlock, IPolicyContainerBlock, IPolicyInstance, IPolicyInterfaceBlock, ISerializedBlock, ISerializedBlockExtend } from './policy-engine.interface';
import { DatabaseServer, Policy } from '@guardian/common';
import { STATE_KEY } from '@policy-engine/helpers/constants';
import { GetBlockByType } from '@policy-engine/blocks/get-block-by-type';
import { GetOtherOptions } from '@policy-engine/helpers/get-other-options';
import { GetBlockAbout } from '@policy-engine/blocks';
import { IPolicyUser } from './policy-user';
import { ExternalEvent } from './interfaces/external-event';
import { BlockTreeGenerator } from '@policy-engine/block-tree-generator';

/**
 * Policy action map type
 */
export type PolicyActionMap = Map<string, Map<PolicyInputEventType, EventCallback<any>>>

/**
 * BlockUpdateFunction
 * @param type
 * @param args
 */
export function blockUpdate(type: string, ...args) {
    new BlockTreeGenerator().sendMessage(PolicyEvents.BLOCK_UPDATE_BROADCAST, { type, args });
}

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
    public static BlockUpdateFn = (block: IPolicyBlock, user: IPolicyUser) => {
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
                    blockUpdate(
                        'update',
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
    public static BlockErrorFn: (
        blockType: string,
        message: any,
        user: IPolicyUser
    ) => Promise<void> = async (...args) => {
        blockUpdate('error', ...args);
    };
    /**
     * Update user info function
     */
    public static UpdateUserInfoFn: (
        user: IPolicyUser,
        policy: Policy
    ) => Promise<void> = async (...args) => {
        blockUpdate('update-user', ...args);
    };
    /**
     * External Event function
     */
    public static ExternalEventFn: (
        event: ExternalEvent<any>
    ) => Promise<void> = async (...args) => {
        blockUpdate('external', ...args);
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
     * Get document cache fields
     * @param policyId Policy identifier
     * @returns Fields
     */
    public static getDocumentCacheFields(policyId: string) {
        let cache = PolicyComponentsUtils.DocumentCacheFieldsMap.get(policyId);
        if (!cache) {
            cache = new Set<string>();
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
     * @constructor
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
     * @constructor
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
            const policyMap = PolicyComponentsUtils.ActionMapByPolicyId.get(
                targetBlock.policyId
            );
            if (policyMap.has(targetBlock.uuid)) {
                const blockMap = policyMap.get(targetBlock.uuid);

                if (targetBlock.blockType === 'module') {
                    if (blockMap.has(PolicyInputEventType.ModuleEvent)) {
                        const fn = blockMap.get(
                            PolicyInputEventType.ModuleEvent
                        );
                        return new PolicyLink(
                            inputName,
                            outputName,
                            sourceBlock,
                            targetBlock,
                            actor,
                            fn
                        );
                    }
                } else {
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
     * @constructor
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
     * @constructor
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
            blockList =
                PolicyComponentsUtils.BlockIdListByPolicyId.get(policyId);
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
     * @param allInstances
     * @constructor
     */
    public static BuildInstance(
        policy: Policy,
        policyId: string,
        block: ISerializedBlock,
        parent: IPolicyBlock,
        allInstances: IPolicyBlock[]
    ): IPolicyBlock {
        const { blockType, children, ...params }: ISerializedBlockExtend =
            block;

        if (parent) {
            params._parent = parent;
        }

        let options = params as any;
        if (options.options) {
            options = Object.assign(options, options.options);
        }
        const blockConstructor = GetBlockByType(blockType) as any;
        const blockInstance = new blockConstructor(
            options.id || PolicyComponentsUtils.GenerateNewUUID(),
            options.defaultActive,
            options.tag,
            options.permissions,
            options._parent,
            GetOtherOptions(options as PolicyBlockFullArgumentList)
        );
        blockInstance.setPolicyInstance(policyId, policy);
        blockInstance.setPolicyOwner(policy.owner);
        blockInstance.setTopicId(policy.topicId);
        blockInstance.registerVariables();

        allInstances.push(blockInstance);

        if (children && children.length) {
            for (const child of children) {
                PolicyComponentsUtils.BuildInstance(
                    policy,
                    policyId,
                    child,
                    blockInstance,
                    allInstances
                );
            }
        }

        return blockInstance;
    }

    /**
     * Build block instances tree
     * @param policy
     * @param policyId
     * @param allInstances
     * @constructor
     */
    public static BuildBlockTree(
        policy: Policy,
        policyId: string,
        allInstances: IPolicyBlock[]
    ): IPolicyInterfaceBlock {
        const configObject = policy.config as ISerializedBlock;
        const model = PolicyComponentsUtils.BuildInstance(
            policy,
            policyId,
            configObject,
            null,
            allInstances
        );

        return model as any;
    }

    /**
     * Register policy instance
     *
     * @param policyId
     * @param policy
     * @constructor
     */
    public static async RegisterPolicyInstance(
        policyId: string,
        policy: Policy
    ) {
        const dryRun = policy.status === PolicyType.DRY_RUN ? policyId : null;
        const databaseServer = new DatabaseServer(dryRun);
        const policyInstance: IPolicyInstance = {
            policyId,
            dryRun,
            databaseServer,
            isMultipleGroup: !!policy.policyGroups?.length,
            instanceTopicId: policy.instanceTopicId,
            synchronizationTopicId: policy.synchronizationTopicId,
            owner: policy.owner,
        };
        PolicyComponentsUtils.PolicyById.set(policyId, policyInstance);
    }

    /**
     * Register block instances tree
     * @param allInstances
     * @constructor
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
     * Unregister blocks
     * @param policyId
     * @constructor
     */
    public static async UnregisterBlocks(policyId: string) {
        const blockList =
            PolicyComponentsUtils.BlockIdListByPolicyId.get(policyId);
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
     * @constructor
     */
    public static async UnregisterPolicy(policyId: string) {
        PolicyComponentsUtils.PolicyById.delete(policyId);
    }

    /**
     * Register default events
     * @param instance
     * @constructor
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
            const parent = instance.parent as IPolicyContainerBlock;
            PolicyComponentsUtils.RegisterLink(
                instance,
                PolicyOutputEventType.RefreshEvent,
                parent,
                PolicyInputEventType.RefreshEvent,
                EventActor.EventInitiator
            );
        }
        if (instance.parent?.blockType === 'interfaceStepBlock') {
            PolicyComponentsUtils.RegisterLink(
                instance,
                PolicyOutputEventType.ReleaseEvent,
                instance.parent,
                PolicyInputEventType.ReleaseEvent,
                EventActor.EventInitiator
            );
        }
    }

    /**
     * Register custom events
     * @param instance
     * @constructor
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
    public static GetBlockByUUID<
        T extends IPolicyInterfaceBlock | IPolicyBlock
    >(uuid: string): T {
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
        const uuid =
            PolicyComponentsUtils.TagMapByPolicyId.get(policyId).get(tag);
        return PolicyComponentsUtils.BlockByBlockId.get(uuid) as T;
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
     */
    public static async GetGroups(
        policy: IPolicyInstance,
        user: IPolicyUser
    ): Promise<any[]> {
        return await policy.databaseServer.getGroupsByUser(
            policy.policyId,
            user.did,
            {
                fields: ['uuid', 'role', 'groupLabel', 'groupName', 'active'],
            }
        );
    }

    /**
     * Select Policy Group
     * @param policy
     * @param user
     * @param uuid
     */
    public static async SelectGroup(
        policy: IPolicyInstance,
        user: IPolicyUser,
        uuid: string
    ): Promise<void> {
        await policy.databaseServer.setActiveGroup(
            policy.policyId,
            user.did,
            uuid
        );
    }

    /**
     * Get Policy Full Info
     * @param policy
     * @param did
     */
    public static async GetPolicyInfo(
        policy: Policy,
        did: string
    ): Promise<Policy> {
        const result: any = policy;
        if (policy && did) {
            result.userRoles = [];
            result.userGroups = [];
            result.userRole = null;
            result.userGroup = null;

            const policyId = policy.id.toString();
            if (policy.status === PolicyType.DRY_RUN) {
                const activeUser = await DatabaseServer.getVirtualUser(
                    policyId
                );
                if (activeUser) {
                    did = activeUser.did;
                }
            }

            if (policy.owner === did) {
                result.userRoles.push('Administrator');
                result.userRole = 'Administrator';
            }

            const dryRun =
                policy.status === PolicyType.DRY_RUN ? policyId : null;
            const db = new DatabaseServer(dryRun);
            const groups = await db.getGroupsByUser(policyId, did, {
                fields: ['uuid', 'role', 'groupLabel', 'groupName', 'active'],
            });
            for (const group of groups) {
                if (group.active !== false) {
                    result.userRoles.push(group.role);
                    result.userRole = group.role;
                    result.userGroup = group;
                }
            }

            result.userGroups = groups;
            if (policy.status === PolicyType.PUBLISH) {
                const multiPolicy = await DatabaseServer.getMultiPolicy(
                    policy.instanceTopicId,
                    did
                );
                result.multiPolicyStatus = multiPolicy?.type;
            }
        } else {
            result.userRoles = ['No role'];
            result.userGroups = [];
            result.userRole = 'No role';
            result.userGroup = null;
        }

        if (!result.userRole) {
            result.userRoles = ['No role'];
            result.userRole = 'No role';
        }

        return result;
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
    public static GetModule<T>(block: any): T {
        if (!block || !block._parent) {
            return null;
        }
        if (block._parent.blockType === 'module') {
            return block._parent;
        }
        return PolicyComponentsUtils.GetModule(block._parent);
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
}
