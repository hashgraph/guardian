import {
    PolicyBlockFullArgumentList,
    PolicyBlockMap,
    PolicyTagMap,
    EventActor,
    PolicyLink,
    PolicyInputEventType,
    EventCallback,
    PolicyOutputEventType
} from '@policy-engine/interfaces';
import { PolicyRole, GenerateUUIDv4 } from '@guardian/interfaces';
import { IAuthUser } from '@guardian/common';
import { AnyBlockType, IPolicyBlock, IPolicyContainerBlock, IPolicyInterfaceBlock, ISerializedBlock, ISerializedBlockExtend } from './policy-engine.interface';
import { getMongoRepository } from 'typeorm';
import { Policy } from '@entity/policy';
import { STATE_KEY } from '@policy-engine/helpers/constants';
import { GetBlockByType } from '@policy-engine/blocks/get-block-by-type';
import { GetOtherOptions } from '@policy-engine/helpers/get-other-options';
import { GetBlockAbout } from '@policy-engine/blocks';

/**
 * Policy action map type
 */
export type PolicyActionMap = Map<string, Map<PolicyInputEventType, EventCallback<any>>>

/**
 * Policy component utils
 */
export class PolicyComponentsUtils {
    /**
     * Block update function
     */
    public static BlockUpdateFn: (uuid: string, state: any, user: IAuthUser, tag?: string) => Promise<void>;
    /**
     * Block error function
     */
    public static BlockErrorFn: (blockType: string, message: any, user: IAuthUser) => Promise<void>;
    /**
     * Update user info function
     */
    public static UpdateUserInfoFn: (user: IAuthUser, policy: Policy) => Promise<void>;

    /**
     * External data blocks map
     * @private
     */
    private static readonly ExternalDataBlocks: Map<string, IPolicyBlock> = new Map();
    /**
     * UUID -> block map
     * @private
     */
    private static readonly BlockByUUIDMap: PolicyBlockMap = new Map();
    /**
     * Block tag -> UUID map
     * @private
     */
    private static readonly BlockUUIDByTagMap: Map<string, PolicyTagMap> = new Map();
    /**
     * Policy actions map
     * @private
     */
    private static readonly PolicyAction: Map<string, PolicyActionMap> = new Map();

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
    public static RegisterAction(target: any, eventType: PolicyInputEventType, fn: EventCallback<any>): void {
        const policyId = target.policyId;
        const targetId = target.uuid;

        let policyMap: PolicyActionMap;
        if (PolicyComponentsUtils.PolicyAction.has(policyId)) {
            policyMap = PolicyComponentsUtils.PolicyAction.get(policyId);
        } else {
            policyMap = new Map();
            PolicyComponentsUtils.PolicyAction.set(policyId, policyMap);
        }

        let targetMap: Map<PolicyInputEventType, EventCallback<any>>;
        if (policyMap.has(targetId)) {
            targetMap = policyMap.get(targetId);
        } else {
            targetMap = new Map();
            policyMap.set(targetId, targetMap);
        }

        targetMap.set(eventType, fn);
    }

    /**
     * Create link
     * @param source
     * @param output
     * @param target
     * @param input
     * @param actor
     * @constructor
     */
    public static CreateLink<T>(
        source: IPolicyBlock,
        output: PolicyOutputEventType,
        target: IPolicyBlock,
        input: PolicyInputEventType,
        actor: EventActor
    ): PolicyLink<T> {
        if (!source || !target) {
            return null;
        }
        if (PolicyComponentsUtils.PolicyAction.has(source.policyId)) {
            const policyMap = PolicyComponentsUtils.PolicyAction.get(source.policyId);
            if (policyMap.has(target.uuid)) {
                const blockMap = policyMap.get(target.uuid);
                if (blockMap.has(input)) {
                    const fn = blockMap.get(input);
                    return new PolicyLink(input, output, source, target, actor, fn);
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
            PolicyComponentsUtils.logEvents(`link error: ${source?.uuid}(${source?.tag})(${output}) -> ${target?.uuid}(${target?.tag})(${input})`);
            return;
        }
        const link = PolicyComponentsUtils.CreateLink(source, output, target, input, actor);
        if (link) {
            link.source.addSourceLink(link);
            link.target.addTargetLink(link);
            PolicyComponentsUtils.logEvents(`link registered: ${source?.uuid}(${source?.tag})(${output}) -> ${target?.uuid}(${target?.tag})(${input})`);
        } else {
            PolicyComponentsUtils.logEvents(`link error: ${source?.uuid}(${source?.tag})(${output}) -> ${target?.uuid}(${target?.tag})(${input})`);
        }
    }

    /**
     * Return new uniq id for block
     */
    public static GenerateNewUUID(): string {
        let uuid: string;
        do {
            uuid = GenerateUUIDv4();
        } while (PolicyComponentsUtils.BlockByUUIDMap.has(uuid));
        return uuid;
    }

    /**
     * Register new block instance in policy
     * @param policyId
     * @param component
     * @constructor
     */
    private static RegisterComponent(policyId: string, component: IPolicyBlock): void {
        PolicyComponentsUtils.BlockByUUIDMap.set(component.uuid, component);
        let tagMap: PolicyTagMap;
        if (!PolicyComponentsUtils.BlockUUIDByTagMap.has(policyId)) {
            tagMap = new Map();
            PolicyComponentsUtils.BlockUUIDByTagMap.set(policyId, tagMap);
        } else {
            tagMap = PolicyComponentsUtils.BlockUUIDByTagMap.get(policyId);
        }
        if (component.tag) {
            if (tagMap.has(component.tag)) {
                throw new Error(`Block with tag ${component.tag} already exist`);
            }
            tagMap.set(component.tag, component.uuid);
        }
        if (component.blockClassName === 'ExternalData') {
            PolicyComponentsUtils.ExternalDataBlocks.set(component.uuid, component);
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
        const { blockType, children, ...params }: ISerializedBlockExtend = block;

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
        blockInstance.setPolicyId(policyId);
        blockInstance.setPolicyOwner(policy.owner);
        blockInstance.setPolicyInstance(policy);
        blockInstance.setTopicId(policy.topicId);

        allInstances.push(blockInstance);

        if (children && children.length) {
            for (const child of children) {
                PolicyComponentsUtils.BuildInstance(
                    policy, policyId, child, blockInstance, allInstances
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
            policy, policyId, configObject, null, allInstances
        );

        return model as any;
    }

    /**
     * Register block instances tree
     * @param allInstances
     * @constructor
     */
    public static async RegisterBlockTree(allInstances: IPolicyBlock[]) {
        for (const instance of allInstances) {
            PolicyComponentsUtils.RegisterComponent(instance.policyId, instance);

            for (const event of instance.actions) {
                PolicyComponentsUtils.RegisterAction(instance, event[0], event[1]);
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
     * Register default events
     * @param instance
     * @constructor
     * @private
     */
    private static async RegisterDefaultEvent(instance: IPolicyBlock) {
        if (!instance.options.stopPropagation) {
            PolicyComponentsUtils.RegisterLink(
                instance, PolicyOutputEventType.RunEvent,
                instance.next, PolicyInputEventType.RunEvent,
                EventActor.EventInitiator
            );
        }
        if (instance.parent?.blockClassName === 'ContainerBlock') {
            const parent = instance.parent as IPolicyContainerBlock;
            PolicyComponentsUtils.RegisterLink(
                instance, PolicyOutputEventType.RefreshEvent,
                parent, PolicyInputEventType.RefreshEvent,
                EventActor.EventInitiator
            );
        }
        if (instance.parent?.blockType === 'interfaceStepBlock') {
            PolicyComponentsUtils.RegisterLink(
                instance, PolicyOutputEventType.RunEvent,
                instance.parent, PolicyInputEventType.ReleaseEvent,
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
                    const target = PolicyComponentsUtils.GetBlockByTag<IPolicyBlock>(instance.policyId, event.target);
                    PolicyComponentsUtils.RegisterLink(instance, event.output, target, event.input, event.actor);
                } else if (event.target === instance.tag) {
                    const source = PolicyComponentsUtils.GetBlockByTag<IPolicyBlock>(instance.policyId, event.source);
                    PolicyComponentsUtils.RegisterLink(source, event.output, instance, event.input, event.actor);
                } else {
                    const target = PolicyComponentsUtils.GetBlockByTag<IPolicyBlock>(instance.policyId, event.target);
                    const source = PolicyComponentsUtils.GetBlockByTag<IPolicyBlock>(instance.policyId, event.source);
                    PolicyComponentsUtils.RegisterLink(source, event.output, target, event.input, event.actor);
                }
            }
        }
    }

    /**
     * Run policy block instance action when external data income
     * @param data
     */
    public static async ReceiveExternalData(data: any): Promise<void> {
        const policy = await getMongoRepository(Policy).findOne({ policyTag: data?.policyTag });
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
        return PolicyComponentsUtils.BlockByUUIDMap.has(uuid);
    }

    /**
     * Check if user role has permission for block
     * @param uuid
     * @param role
     * @param user
     */
    public static IfHasPermission(uuid: string, role: PolicyRole, user: IAuthUser | null): boolean {
        const block = PolicyComponentsUtils.BlockByUUIDMap.get(uuid);
        return block.hasPermission(role, user);
    }

    /**
     * Get block instance by uuid
     * @param uuid
     */
    public static GetBlockByUUID<T extends (IPolicyInterfaceBlock | IPolicyBlock)>(uuid: string): T {
        return PolicyComponentsUtils.BlockByUUIDMap.get(uuid) as T;
    }

    /**
     * Get block instance by tag
     * @param policyId
     * @param tag
     */
    public static GetBlockByTag<T extends (IPolicyInterfaceBlock | IPolicyBlock)>(policyId: string, tag: string): T {
        const uuid = PolicyComponentsUtils.BlockUUIDByTagMap.get(policyId).get(tag);
        return PolicyComponentsUtils.BlockByUUIDMap.get(uuid) as T;
    }

    /**
     * Return block state fields
     * @param target
     */
    public static GetStateFields(target): any {
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
    public static GetBlockUniqueOptionsObject(obj: any): { [key: string]: any } {
        return obj.options;
    }

    /**
     * Get block about
     */
    public static GetBlockAbout(): any {
        return GetBlockAbout();
    }

    /**
     * Check Permission
     * @param block
     * @param user
     * @param userRole
     */
    public static CheckPermission(block: AnyBlockType, user: IAuthUser, userRole: PolicyRole): boolean {
        if (block) {
            return (block.isActive(user) && PolicyComponentsUtils.IfHasPermission(block.uuid, userRole, user));
        } else {
            return false;
        }
    }

    /**
     * Check Permission Tree
     * @param block
     * @param user
     * @param userRole
     */
    public static CheckPermissionTree(block: AnyBlockType, user: IAuthUser, userRole: PolicyRole): boolean {
        if (PolicyComponentsUtils.CheckPermission(block, user, userRole)) {
            if (block.parent) {
                return PolicyComponentsUtils.CheckPermissionTree(block.parent, user, userRole);
            } else {
                return true;
            }
        } else {
            return false;
        }
    }

    /**
     * Get User Role
     * @param policyId
     * @param user
     */
    public static async GetUserRole(policyId: string, user: IAuthUser): Promise<PolicyRole> {
        const currentPolicy = await getMongoRepository(Policy).findOne(policyId);

        if (user && currentPolicy && typeof currentPolicy.registeredUsers === 'object') {
            return currentPolicy.registeredUsers[user.did];
        }

        return null;
    }

    /**
     * Set User Role
     * @param policyId
     * @param user
     * @param role
     */
    public static async SetUserRole(policyId: string, user: IAuthUser, role: PolicyRole): Promise<Policy> {
        const currentPolicy = await getMongoRepository(Policy).findOne(policyId);

        if (typeof currentPolicy.registeredUsers !== 'object') {
            currentPolicy.registeredUsers = {};
        }

        currentPolicy.registeredUsers[user?.did] = role;

        const result = await getMongoRepository(Policy).save(currentPolicy);

        return result;
    }

    /**
     * Get User Role List
     * @param policy
     * @param did
     */
    public static GetUserRoleList(policy: Policy, did: string): PolicyRole[] {
        const userRoles: string[] = [];
        if (policy && did) {
            if (policy.owner === did) {
                userRoles.push('Administrator');
            }
            if (policy.registeredUsers && policy.registeredUsers[did]) {
                userRoles.push(policy.registeredUsers[did]);
            }
        }
        if (!userRoles.length) {
            userRoles.push('The user does not have a role');
        }
        return userRoles;
    }

    /**
     * Get User Role By Policy
     * @param policy
     * @param user
     */
    public static GetUserRoleByPolicy(policy: Policy, user: IAuthUser): PolicyRole {
        if (user && policy && typeof policy.registeredUsers === 'object') {
            return policy.registeredUsers[user.did];
        }
        return null;
    }

    /**
     * Get All Registered Users
     * @param policyId
     */
    public static async GetAllRegisteredUsers(policyId: string): Promise<[string, string][]> {
        const policy = await getMongoRepository(Policy).findOne(policyId);
        if (policy && typeof policy.registeredUsers === 'object') {
            return Object.entries(policy.registeredUsers)
        }
        return [];
    }
}
