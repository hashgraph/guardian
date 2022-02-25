import {
    PolicyBlockConstructorParams,
    PolicyBlockFullArgumentList,
    PolicyBlockMap,
    PolicyTagMap
} from '@policy-engine/interfaces';
import {PolicyRole, UserRole} from 'interfaces';
import {IAuthUser} from '@auth/auth.interface';
import {GenerateUUIDv4} from './helpers/uuidv4';
import {AnyBlockType, IPolicyBlock, IPolicyInterfaceBlock} from './policy-engine.interface';
import {getMongoRepository} from 'typeorm';
import {Policy} from '@entity/policy';
import {STATE_KEY} from '@policy-engine/helpers/constants';
import {GetBlockByType} from '@policy-engine/blocks/get-block-by-type';
import {GetOtherOptions} from '@policy-engine/helpers/get-other-options';

export class PolicyComponentsStuff {
    private static ExternalDataBlocks: Map<string, IPolicyBlock> = new Map();
    private static PolicyBlockMapObject: PolicyBlockMap = new Map();
    private static PolicyTagMapObject: Map<string, PolicyTagMap> = new Map();
    private static BlockSubscriptions: Map<string, Map<string, Function[]>> = new Map();

    public static UpdateFn: Function;

    /**
     * Register dependency
     * @param tag {string}
     * @param fn {Function}
     */
    public static RegisterDependencyCallback(tag: string, policyId: string, fn: Function): void {
        let policyTagsMap: Map<string, Function[]>;

        if (!PolicyComponentsStuff.BlockSubscriptions.has(policyId)) {
            policyTagsMap = new Map();
            PolicyComponentsStuff.BlockSubscriptions.set(policyId, policyTagsMap);
        } else {
            policyTagsMap = PolicyComponentsStuff.BlockSubscriptions.get(policyId);
        }

        let subscriptionsArray: Function[];
        if (!Array.isArray(policyTagsMap.get(tag))) {
            subscriptionsArray = [];
            policyTagsMap.set(tag, subscriptionsArray);
        } else {
            subscriptionsArray = policyTagsMap.get(tag);
        }

        subscriptionsArray.push(fn);
    }

    /**
     * Return new uniq id for block
     */
    public static GenerateNewUUID(): string {
        let uuid: string;
        do {
            uuid = GenerateUUIDv4();
        } while (PolicyComponentsStuff.PolicyBlockMapObject.has(uuid));
        return uuid;
    }

    /**
     * Register new block instance in policy
     * @param policyId
     * @param component
     * @constructor
     */
    public static RegisterComponent(policyId: string, component: IPolicyBlock): void {
        PolicyComponentsStuff.PolicyBlockMapObject.set(component.uuid, component);
        let tagMap;
        if (!this.PolicyTagMapObject.has(policyId)) {
            tagMap = new Map();
            this.PolicyTagMapObject.set(policyId, tagMap);
        } else {
            tagMap = this.PolicyTagMapObject.get(policyId);
        }
        if (component.tag) {
            if (tagMap.has(component.tag)) {
                throw new Error(`Block with tag ${component.tag} already exist`);
            }
            tagMap.set(component.tag, component.uuid);
        }
        if (component.blockClassName === 'ExternalData') {
            PolicyComponentsStuff.ExternalDataBlocks.set(component.uuid, component);
        }

        const componentRef = component as any;
        for (let dep of componentRef.dependencies) {
            PolicyComponentsStuff.RegisterDependencyCallback(dep, policyId,(user) => {
                component.updateBlock({}, user, '');
            })
        }
    }

    /**
     * Call callbacks of all dependency blocks
     * @param tag
     * @param policyId
     * @param user
     */
    public static CallDependencyCallbacks(tag: string, policyId: string, user: any): void {
        if (PolicyComponentsStuff.BlockSubscriptions.has(policyId) && PolicyComponentsStuff.BlockSubscriptions.get(policyId).has(tag)) {
            for (let fn of PolicyComponentsStuff.BlockSubscriptions.get(policyId).get(tag)) {
                fn(user);
            }
        }
    }

    /**
     * Run policy block instance action when external data income
     * @param data
     */
    public static async ReceiveExternalData(data: any): Promise<void> {
        for (let block of PolicyComponentsStuff.ExternalDataBlocks.values()) {
            const policy = await getMongoRepository(Policy).findOne({policyTag: data.policyTag});
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
        return PolicyComponentsStuff.PolicyBlockMapObject.has(uuid);
    }

    /**
     * Check if user role has permission for block
     * @param uuid
     * @param role
     * @param user
     */
    public static IfHasPermission(uuid: string, role: PolicyRole, user: IAuthUser | null): boolean {
        const block = PolicyComponentsStuff.PolicyBlockMapObject.get(uuid);
        return block.isActive(user) && block.hasPermission(role, user);
    }

    /**
     * Get block instance by uuid
     * @param uuid
     */
    public static GetBlockByUUID<T extends (IPolicyInterfaceBlock | IPolicyBlock)>(uuid: string): T {
        return PolicyComponentsStuff.PolicyBlockMapObject.get(uuid) as T;
    }

    /**
     * Get block instance by tag
     * @param policyId
     * @param tag
     */
    public static GetBlockByTag(policyId: string, tag: string): IPolicyBlock {
        return PolicyComponentsStuff.PolicyBlockMapObject.get(this.PolicyTagMapObject.get(policyId).get(tag));
    }

    /**
     * Return block state fields
     * @param target
     */
    public static GetStateFields(target): Object {
        return target[STATE_KEY];
    }

    /**
     * Configure new block instance
     * @param policyId
     * @param blockType
     * @param options
     * @param skipRegistration
     */
    public static ConfigureBlock(policyId: string, blockType: string,
                                   options: Partial<PolicyBlockConstructorParams>,
                                   skipRegistration?: boolean): any {
        if (options.options) {
            options = Object.assign(options, options.options);
        }
        const blockConstructor = GetBlockByType(blockType) as any;
        const instance = new blockConstructor(
            options.id || PolicyComponentsStuff.GenerateNewUUID(),
            options.defaultActive,
            options.tag,
            options.permissions,
            options.dependencies,
            options._parent,
            GetOtherOptions(options as PolicyBlockFullArgumentList)
        );
        if (!skipRegistration) {
            PolicyComponentsStuff.RegisterComponent(policyId, instance);
        }
        return instance;
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
