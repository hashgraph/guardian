import {
    PolicyBlockConstructorParams,
    PolicyBlockFullArgumentList,
    PolicyBlockMap,
    PolicyTagMap,
    IPolicyEvent,
    PolicyLink,
    PolicyEventType,
    EventCallback
} from '@policy-engine/interfaces';
import { PolicyRole } from 'interfaces';
import { IAuthUser } from '@auth/auth.interface';
import { GenerateUUIDv4 } from './helpers/uuidv4';
import { AnyBlockType, IPolicyBlock, IPolicyInterfaceBlock, ISerializedBlock, ISerializedBlockExtend } from './policy-engine.interface';
import { getMongoRepository } from 'typeorm';
import { Policy } from '@entity/policy';
import { STATE_KEY } from '@policy-engine/helpers/constants';
import { GetBlockByType } from '@policy-engine/blocks/get-block-by-type';
import { GetOtherOptions } from '@policy-engine/helpers/get-other-options';

export type PolicyActionMap = Map<string, Map<PolicyEventType, EventCallback<any>>>

export class PolicyComponentsUtils {
    public static BlockUpdateFn: (uuid: string, state: any, user: IAuthUser, tag?: string) => void;
    public static BlockErrorFn: (blockType: string, message: any, user: IAuthUser) => void;

    private static ExternalDataBlocks: Map<string, IPolicyBlock> = new Map();
    private static BlockByUUIDMap: PolicyBlockMap = new Map();
    private static BlockUUIDByTagMap: Map<string, PolicyTagMap> = new Map();
    private static PolicyAction: Map<string, PolicyActionMap> = new Map();

    public static RegisterAction(target: any, eventType: PolicyEventType, fn: EventCallback<any>): void {
        const policyId = target.policyId;
        const targetTag = target.tag;

        let policyMap: PolicyActionMap;
        if (PolicyComponentsUtils.PolicyAction.has(policyId)) {
            policyMap = PolicyComponentsUtils.PolicyAction.get(policyId);
        } else {
            policyMap = new Map();
            PolicyComponentsUtils.PolicyAction.set(policyId, policyMap);
        }

        let targetMap: Map<PolicyEventType, EventCallback<any>>;
        if (policyMap.has(targetTag)) {
            targetMap = policyMap.get(targetTag);
        } else {
            targetMap = new Map();
            policyMap.set(targetTag, targetMap);
        }

        targetMap.set(eventType, fn);
    }

    public static CreateLink<T>(eventType: PolicyEventType, source: IPolicyBlock, targetTag: string): PolicyLink<T> {
        if (PolicyComponentsUtils.PolicyAction.has(source.policyId)) {
            const policyMap = PolicyComponentsUtils.PolicyAction.get(source.policyId);
            if (policyMap.has(targetTag)) {
                const blockMap = policyMap.get(targetTag);
                if (blockMap.has(eventType)) {
                    const fn = blockMap.get(eventType);
                    const target = PolicyComponentsUtils.GetBlockByTag(source.policyId, targetTag);
                    return new PolicyLink(eventType, source, target, fn);
                }
            }
        }
        return null;
    }

    public static RegisterLink(eventType: PolicyEventType, source: IPolicyBlock, targetTag: string): void {
        const link = PolicyComponentsUtils.CreateLink(eventType, source, targetTag);
        if (link) {
            link.source.addSourceLink(link);
            link.target.addTargetLink(link);
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
        if (!this.BlockUUIDByTagMap.has(policyId)) {
            tagMap = new Map();
            this.BlockUUIDByTagMap.set(policyId, tagMap);
        } else {
            tagMap = this.BlockUUIDByTagMap.get(policyId);
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
            options.dependencies,
            options._parent,
            GetOtherOptions(options as PolicyBlockFullArgumentList)
        );
        blockInstance.setPolicyId(policyId);
        blockInstance.setPolicyOwner(policy.owner);
        blockInstance.setPolicyInstance(policy);

        allInstances.push(blockInstance);

        if (children && children.length) {
            for (let child of children) {
                PolicyComponentsUtils.BuildInstance(
                    policy, policyId, child, blockInstance, allInstances
                );
            }
        }

        return blockInstance;
    }

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

    public static async RegisterBlockTree(
        allInstances: IPolicyBlock[],
    ) {
            for (let instance of allInstances) {
                PolicyComponentsUtils.RegisterComponent(instance.policyId, instance);

                for (let event of (instance as any).prototype.actions) {
                    PolicyComponentsUtils.RegisterAction(instance, event[0], event[1]);
                }

                await instance.beforeInit();
            }

            for (let instance of allInstances) {
                await instance.afterInit();

                if (instance.options.events) {
                    for (let event of instance.options.events) {
                        PolicyComponentsUtils.RegisterLink(event.type, instance, event.target);
                    }
                }

                for (let dep of (instance as any).dependencies) {
                    const source = PolicyComponentsUtils.GetBlockByTag(instance.policyId, dep);
                    PolicyComponentsUtils.RegisterLink(PolicyEventType.DependencyEvent, source, instance.tag);
                }
                if (instance.parent?.blockClassName === 'ContainerBlock') {
                    PolicyComponentsUtils.RegisterLink(PolicyEventType.DependencyEvent, instance, instance.parent.tag);
                }

            }
    }

    /**
     * Run policy block instance action when external data income
     * @param data
     */
    public static async ReceiveExternalData(data: any): Promise<void> {
        for (let block of PolicyComponentsUtils.ExternalDataBlocks.values()) {
            const policy = await getMongoRepository(Policy).findOne({ policyTag: data.policyTag });
            if (policy.id.toString() === (block as any).policyId) {
                await (block as any).receiveData(data);
            }
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
    public static GetBlockByTag(policyId: string, tag: string): IPolicyBlock {
        return PolicyComponentsUtils.BlockByUUIDMap.get(this.BlockUUIDByTagMap.get(policyId).get(tag));
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
}
