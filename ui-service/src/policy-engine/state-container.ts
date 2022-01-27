import {PolicyBlockMap, PolicyTagMap} from '@policy-engine/interfaces';
import {PolicyRole, UserRole} from 'interfaces';
import {IAuthUser} from '../auth/auth.interface';
import {GenerateUUIDv4} from './helpers/uuidv4';
import {IPolicyBlock, IPolicyInterfaceBlock} from './policy-engine.interface';
import {getMongoRepository} from 'typeorm';
import {Policy} from '@entity/policy';

export class StateContainer {
    private static ExternalDataBlocks: Map<string, IPolicyBlock> = new Map();
    private static PolicyBlockMapObject: PolicyBlockMap = new Map();
    private static PolicyTagMapObject: Map<string, PolicyTagMap> = new Map();
    private static BlockSubscriptions: Map<string, Map<string, Function[]>> = new Map();

    public static UpdateFn: Function;

    /**
     * Method for inject maps into block instance
     * @param policyId
     * @constructor
     */
    public static BlockComponentStaff(policyId: string) {
        return {
            get blockMap(): PolicyBlockMap {
                return StateContainer.PolicyBlockMapObject;
            },
            get tagMap(): PolicyTagMap {
                return StateContainer.PolicyTagMapObject.get(policyId);
            }
        }
    }

    /**
     * Register dependency
     * @param tag {string}
     * @param fn {Function}
     */
    public static RegisterDependencyCallback(tag: string, policyId: string, fn: Function): void {
        let policyTagsMap: Map<string, Function[]>;

        if (!StateContainer.BlockSubscriptions.has(policyId)) {
            policyTagsMap = new Map();
            StateContainer.BlockSubscriptions.set(policyId, policyTagsMap);
        } else {
            policyTagsMap = StateContainer.BlockSubscriptions.get(policyId);
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
        } while (StateContainer.PolicyBlockMapObject.has(uuid));
        return uuid;
    }

    /**
     * Register new block instance in policy
     * @param policyId
     * @param component
     * @constructor
     */
    public static RegisterComponent(policyId: string, component: IPolicyBlock): void {
        StateContainer.PolicyBlockMapObject.set(component.uuid, component);
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
            StateContainer.ExternalDataBlocks.set(component.uuid, component);
        }

        const componentRef = component as any;
        for (let dep of componentRef.dependencies) {
            StateContainer.RegisterDependencyCallback(dep, policyId,(user) => {
                console.log('Update block', component);
                component.updateBlock({}, user, '');
            })
        }
    }

    public static CallDependencyCallbacks(tag: string, policyId: string, user: any): void {
        if (StateContainer.BlockSubscriptions.has(policyId) && StateContainer.BlockSubscriptions.get(policyId).has(tag)) {
            for (let fn of StateContainer.BlockSubscriptions.get(policyId).get(tag)) {
                fn(user);
            }
        }
    }

    /**
     * Run policy block instance action when external data income
     * @param data
     */
    public static async ReceiveExternalData(data: any): Promise<void> {
        for (let block of StateContainer.ExternalDataBlocks.values()) {
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
        return StateContainer.PolicyBlockMapObject.has(uuid);
    }

    /**
     * Check if user role has permission for block
     * @param uuid
     * @param role
     * @param user
     */
    public static IfHasPermission(uuid: string, role: PolicyRole, user: IAuthUser | null): boolean {
        return StateContainer.PolicyBlockMapObject.get(uuid).hasPermission(role, user);
    }

    /**
     * Get block instance by uuid
     * @param uuid
     */
    public static GetBlockByUUID<T extends (IPolicyInterfaceBlock | IPolicyBlock)>(uuid: string): T {
        return StateContainer.PolicyBlockMapObject.get(uuid) as T;
    }

    /**
     * Get block instance by tag
     * @param policyId
     * @param tag
     */
    public static GetBlockByTag(policyId: string, tag: string): IPolicyBlock {
        return StateContainer.PolicyBlockMapObject.get(this.PolicyTagMapObject.get(policyId).get(tag));
    }
}
