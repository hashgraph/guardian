import {PolicyBlockMap, PolicyTagMap} from '@policy-engine/interfaces';
import {UserRole} from 'interfaces';
import {IAuthUser} from '../auth/auth.interface';
import {GenerateUUIDv4} from './helpers/uuidv4';
import {IPolicyBlock, IPolicyInterfaceBlock} from './policy-engine.interface';
import {getMongoRepository} from 'typeorm';
import {Policy} from '@entity/policy';

export class StateContainer {
    private static ExternalDataBlocks: Map<string, IPolicyBlock> = new Map();
    private static PolicyBlockMapObject: PolicyBlockMap = new Map();
    private static PolicyTagMapObject: Map<string, PolicyTagMap> = new Map();
    private static PolicyStateObject: Map<string, any> = new Map();
    private static PolicyStateSubscriptions: Map<string, Function[]> = new Map();
    // private static BlockConstructorsMap: {[key: string]: NewableFunction} = BlockConstructors;

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
     */
    public static IfHasPermission(uuid: string, role: UserRole): boolean {
        return StateContainer.PolicyBlockMapObject.get(uuid).hasPermission(role);
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
    public static GetBlockByTag<T extends (IPolicyInterfaceBlock | IPolicyBlock) = IPolicyBlock>(policyId: string, tag: string): T {
        return StateContainer.PolicyBlockMapObject.get(this.PolicyTagMapObject.get(policyId).get(tag)) as T;
    }

    /**
     * Set new state for block
     * @param uuid
     * @param state
     * @param user
     * @param tag
     * @param noUpdate
     */
    public static async SetBlockState(uuid: string, state: any, user: IAuthUser, tag: string, noUpdate?: boolean): Promise<void> {
        let curState = StateContainer.PolicyStateObject.get(uuid) || {};
        const block = StateContainer.GetBlockByUUID(uuid);

        if (block.commonBlock) {
            curState = state;
        } else {
            curState[user.username] = state;
        }

        if (!noUpdate) {
            block.parent.updateBlock(state, user, tag);
        }
        this.PolicyStateObject.set(uuid, curState);
    }


    /**
     * Get block state
     * @param uuid
     * @param user
     */
    public static GetBlockState(uuid: string, user: IAuthUser): any {
        const block = StateContainer.PolicyBlockMapObject.get(uuid);
        const state = StateContainer.PolicyStateObject.get(uuid);

        if (block.commonBlock) {
            return state || {isActive: block.defaultActive};
        } else {
            return state && state[user.username] || {isActive: block.defaultActive};
        }
    }

    public static InitStateSubscriptions(): void {
        for (let b of StateContainer.PolicyBlockMapObject.values()) {
            b.registerSubscriptions();
        }
    }
}
