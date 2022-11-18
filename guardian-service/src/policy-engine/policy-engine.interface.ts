import { PolicyRole } from '@guardian/interfaces';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyOutputEventType } from '@policy-engine/interfaces';
import { EventConfig, IPolicyEvent } from './interfaces';
import { DatabaseServer } from '@database-modules';
import { IPolicyUser } from './policy-user';

/**
 * Policy roles interface
 */
export interface IPolicyRoles {
    [policyId: string]: string;
}

/**
 * Serialized block
 */
export interface ISerializedBlock {
    /**
     * Block type
     */
    blockType: string;
    /**
     * Default active
     */
    defaultActive: boolean;
    /**
     * block tag
     */
    tag?: string;
    /**
     * Block permissions
     */
    permissions: string[];
    /**
     * Block UUID
     */
    uuid?: string;
    /**
     * Block children
     */
    children?: ISerializedBlock[];
}

/**
 * Serialized block extended fields
 */
export interface ISerializedBlockExtend extends ISerializedBlock {
    /**
     * Parent block
     */
    _parent?: IPolicyBlock;
}

/**
 * Policy block interface
 */
export interface IPolicyBlock {
    /**
     * Parent block
     */
    parent?: AnyBlockType;
    /**
     * Block children
     */
    children?: AnyBlockType[];
    /**
     * Block type
     */
    blockType?: string;
    /**
     * Block UUID
     */
    uuid?: string;
    /**
     * Block tag
     */
    tag?: string | null;
    /**
     * Is common block
     */
    commonBlock?: boolean;
    /**
     * Is default active
     */
    defaultActive?: boolean;
    /**
     * Block options
     */
    options: any;
    /**
     * Block class name
     */
    blockClassName: string;
    /**
     * Policy id
     */
    policyId: string;
    /**
     * Policy owner
     */
    policyOwner: string;
    /**
     * Policy instance
     */
    policyInstance: any;
    /**
     * Topic id
     */
    topicId: string;
    /**
     * Block about
     */
    about?: string;

    /**
     * Block actions
     */
    readonly actions: any[];
    /**
     * Output actions
     */
    readonly outputActions: any[];
    /**
     * Block events
     */
    readonly events: EventConfig[];

    /**
     * Next block
     */
    readonly next: IPolicyBlock;

    /**
     * Database Server
     */
    readonly databaseServer: DatabaseServer;

    /**
     * Dry-run
     */
    readonly dryRun: string;

    /**
     * If policy contain multiple groups
     */
    readonly isMultipleGroups: boolean;

    /**
     * Set policy owner
     * @param did
     */
    setPolicyOwner(did: string): void;

    /**
     * Set policy instance
     * @param policyId
     * @param policy
     */
    setPolicyInstance(policyId: string, policy: any): void;

    /**
     * Set topic id
     * @param id
     */
    setTopicId(id: string): void;

    /**
     * Get child
     * @param uuid
     */
    getChild(uuid: string): IPolicyBlock;

    /**
     * Get child index
     * @param uuid
     */
    getChildIndex(uuid: string): number;

    /**
     * Get next child
     * @param uuid
     */
    getNextChild(uuid: string): IPolicyBlock;

    /**
     * Get data state diff
     * @param user
     */
    checkDataStateDiffer?: (user: IPolicyUser) => boolean

    /**
     * Serialize block options
     */
    serialize(): ISerializedBlock;

    /**
     * Update block
     * @param state
     * @param user
     * @param tag
     */
    updateBlock(state: any, user: IPolicyUser, tag?: string): any;

    /**
     * Check permissions
     * @param role
     * @param user
     */
    hasPermission(role: PolicyRole | null, user: IPolicyUser | null): any;

    /**
     * Check Permission and Active
     * @param user
     */
    isAvailable(user: IPolicyUser): Promise<boolean>;

    /**
     * Register child
     * @param child
     */
    registerChild(child: IPolicyBlock): void;

    /**
     * Block destructor
     */
    destroy(): void;

    /**
     * Validate block options
     * @param resultsContainer
     */
    validate(resultsContainer: PolicyValidationResultsContainer): Promise<void>;

    /**
     * Is child active
     * @param child
     * @param user
     */
    isChildActive(child: AnyBlockType, user: IPolicyUser): boolean;

    /**
     * Is block active
     * @param user
     */
    isActive(user: IPolicyUser): boolean;

    /**
     * Write message to log
     * @param message
     */
    log(message: string): void;

    /**
     * Write error to log
     * @param message
     */
    error(message: string): void;

    /**
     * Write warn to log
     * @param message
     */
    warn(message: string): void;

    /**
     * Trigger events
     * @param eventType
     * @param user
     * @param data
     */
    triggerEvents(eventType: PolicyOutputEventType, user?: IPolicyUser, data?: any): void;

    /**
     * Trigger event
     * @param event
     * @param user
     * @param data
     */
    triggerEvent(event: any, user?: IPolicyUser, data?: any): void;

    /**
     * Save block state
     */
    saveState(): Promise<void>;

    /**
     * Before init callback
     */
    beforeInit(): Promise<void>;

    /**
     * After init callback
     */
    afterInit(): Promise<void>;

    /**
     * Add source link
     * @param link
     */
    addSourceLink(link: any): void;

    /**
     * Add target link
     * @param link
     */
    addTargetLink(link: any): void;

    /**
     * Run block action
     * @param event
     */
    runAction(event: IPolicyEvent<any>): Promise<any>;

    /**
     * Update State
     * @param user
     * @param state
     */
    updateDataState(user: IPolicyUser, state: any): boolean;

    /**
     * Join GET Data
     * @param {IPolicyDocument | IPolicyDocument[]} data
     * @param {IPolicyUser} user
     * @param {AnyBlockType} parent
     */
    joinData<T extends IPolicyDocument | IPolicyDocument[]>(
        data: T, user: IPolicyUser, parent: AnyBlockType
    ): Promise<T>;

    /**
     * Add Internal Event Listener
     * @param type
     */
    addInternalListener(type: string, callback: Function): void;

    /**
     * Trigger Internal Event
     * @param type
     * @param data
     */
    triggerInternalEvent(type: string, data: any): void;
}

/**
 * Policy interface block interface
 */
export interface IPolicyInterfaceBlock extends IPolicyBlock {
    /**
     * Set block content
     * @param content
     */
    setContent(content: string): void;

    /**
     * Set block data
     * @param user
     * @param data
     */
    setData(user: IPolicyUser | null, data: any): Promise<any>;

    /**
     * Get block data
     * @param user
     * @param uuid
     * @param queryParams
     */
    getData(user: IPolicyUser | null, uuid: string, queryParams?: any): Promise<any>;

    /**
     * Update data state
     * @param user
     * @param data
     */
    updateDataState(user: IPolicyUser, data: any): boolean;
}

/**
 * Policy container block
 */
export interface IPolicyContainerBlock extends IPolicyBlock {
    /**
     * Get block data
     * @param user
     * @param uuid
     * @param queryParams
     */
    getData(user: IPolicyUser | null, uuid: string, queryParams?: any): Promise<any>;

    /**
     * Change step
     * @param user
     * @param data
     * @param target
     */
    changeStep(user: IPolicyUser, data: any, target: IPolicyBlock): Promise<void>;

    /**
     * Is last block active
     * @param target
     */
    isLast(target: IPolicyBlock): boolean;

    /**
     * Is cyclic
     */
    isCyclic(): boolean;

    /**
     * Get last block
     */
    getLast(): IPolicyBlock;

    /**
     * Get first block
     */
    getFirst(): IPolicyBlock;
}

/**
 * Policy datasource block interface
 */
export interface IPolicySourceBlock extends IPolicyBlock {
    /**
     * Get block data
     * @param user
     * @param uuid
     * @param queryParams
     */
    getData(user: IPolicyUser | null, uuid: string, queryParams?: any): Promise<any>;

    /**
     * Get child filter addons
     */
    getChildFiltersAddons(): IPolicyBlock[];

    /**
     * Get filters from sources
     * @param user Policy user
     */
    getGlobalSourcesFilters(user: IPolicyUser): Promise<{
        /**
         * Sources filters
         */
        filters: any,
        /**
         * Source data type
         */
        dataType: string
    }>;

    /**
     * Get filter addons
     */
    getFiltersAddons(): IPolicyBlock[];

    /**
     * Get sources
     * @param user
     * @param globalFilters
     * @param paginationData
     * @param countResult
     */
    getSources(user: IPolicyUser, globalFilters: any, paginationData: any, countResult?: boolean): Promise<any[] | number>;

    /**
     * Get global sources
     * @param user
     * @param paginationData
     * @param countResult
     */
    getGlobalSources(user: IPolicyUser, paginationData: any, countResult?: boolean): Promise<any[] | number>;

    /**
     * Get common addons
     */
    getCommonAddons(): IPolicyBlock[];
}

/**
 * Policy addon block interface
 */
export interface IPolicyAddonBlock extends IPolicyBlock {
    /**
     * Filters container
     */
    filters: { [key: string]: { [key: string]: string } };

    /**
     * Set block data
     * @param user
     * @param data
     */
    setData(user: IPolicyUser | null, data: any): Promise<any>;

    /**
     * Get block data
     * @param user
     * @param uuid
     * @param queryParams
     */
    getData(user: IPolicyUser | null, uuid: string, queryParams?: any): Promise<any>;

    /**
     * Get sources
     * @param user
     * @param globalFilters
     */
    getSources(user: IPolicyUser, globalFilters: any): any;

    /**
     * Get from source
     * @param user
     * @param globalFilters
     * @param countResult
     * @param otherOptions
     */
    getFromSource(user: IPolicyUser, globalFilters: any, countResult?: boolean, otherOptions?: any): any;

    /**
     * Get filters
     * @param user
     */
    getFilters(user: IPolicyUser): Promise<{ [key: string]: string }>;

    /**
     * Set filters
     * @param filters
     * @param user
     */
    setFilters(filters: { [key: string]: string }, user: IPolicyUser): void

    /**
     * Get block state
     * @param user
     */
    getState(user: IPolicyUser): any;
}

/**
 * Policy calculate block interface
 */
export interface IPolicyCalculateBlock extends IPolicyBlock {
    /**
     * Get addons
     */
    getAddons(): IPolicyCalculateAddon[];
}

/**
 * Policy calculate addon interface
 */
export interface IPolicyCalculateAddon extends IPolicyBlock {
    /**
     * Run logic
     * @param scope
     */
    run(scope: any, user: IPolicyUser): Promise<any>;

    /**
     * Get variables
     * @param variables
     */
    getVariables(variables: any): any;

    /**
     * Evaluate
     * @param formula
     * @param scope
     */
    evaluate(formula: string, scope: any): any;

    /**
     * Parse formula
     * @param formula
     */
    parse(formula: string): boolean;
}

/**
 * Policy report block interface
 */
export interface IPolicyReportBlock extends IPolicyBlock {
    /**
     * Get items
     */
    getItems(): IPolicyReportItemBlock[];
}

/**
 * Report item block interface
 */
export interface IPolicyReportItemBlock extends IPolicyBlock {
    /**
     * Run logic
     * @param fieldsResult
     * @param mapVariables
     */
    run(fieldsResult: any[], mapVariables: any): Promise<any>;

    /**
     * Get items
     */
    getItems(): IPolicyReportItemBlock[];
}

/**
 * Policy request block interface
 */
export interface IPolicyRequestBlock extends IPolicyBlock {
    /**
     * Get block data
     * @param user
     */
    getData(user: IPolicyUser): Promise<any>;

    /**
     * Ste block data
     * @param user
     * @param _data
     */
    setData(user: IPolicyUser, _data: any): Promise<any>;

    /**
     * Get sources
     * @param user
     */
    getSources(user: IPolicyUser): Promise<any[]>
}

/**
 * Policy Validator block interface
 */
export interface IPolicyValidatorBlock extends IPolicyBlock {
    /**
     * Run block logic
     * @param event
     * @returns error
     */
    run(event: IPolicyEvent<any>): Promise<string>;
}

/**
 * Any block type
 */
export type AnyBlockType =
    IPolicyBlock
    | IPolicyInterfaceBlock
    | IPolicyContainerBlock
    | IPolicySourceBlock
    | IPolicyAddonBlock
    | IPolicyCalculateBlock
    | IPolicyCalculateAddon
    | IPolicyRequestBlock
    | IPolicyValidatorBlock;

/**
 * Policy document
 */
export interface IPolicyDocument {
    /**
     * Policy id
     */
    policyId?: string;
    /**
     * Block Tag
     */
    tag?: string;
    /**
     * Document instance
     */
    document?: any;
    /**
     * Document owner
     */
    owner?: string;
    /**
     * Group (Group UUID)
     */
    group?: string;
    /**
     * Assigned To
     */
    assignedTo?: string;
    /**
     * Assigned To
     */
    assignedToGroup?: string;
    /**
     * Message Id
     */
    messageId?: string,
    /**
     * Topic Id
     */
    topicId?: string,
    /**
     * Other fields
     */
    [x: string]: any;
}

/**
 * Policy document
 */
export interface IPolicyState<T> {
    /**
     * Data
     */
    data: T;
}

/**
 * Policy document
 */
export type IPolicyEventState = IPolicyState<IPolicyDocument | IPolicyDocument[]>;

/**
 * Policy instance
 */
export interface IPolicyInstance {
    /**
     * Policy id
     */
    readonly policyId?: string;

    /**
     * Dry-run
     */
    readonly dryRun: string;

    /**
     * Database Server
     */
    readonly databaseServer: DatabaseServer;

    /**
     * Is Multiple Group
     */
    readonly isMultipleGroup: boolean;

    /**
     * Policy Instance Topic Id
     */
    readonly instanceTopicId?: string
}
