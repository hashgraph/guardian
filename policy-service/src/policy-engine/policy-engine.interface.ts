import { BlockCacheType, EventConfig, IPolicyEvent, PolicyOutputEventType } from './interfaces/index.js';
import { DatabaseServer, Policy } from '@guardian/common';
import { PolicyUser, UserCredentials } from './policy-user.js';
import { ComponentsService } from './helpers/components-service.js';
import { LocationType, PolicyAvailability, PolicyStatus } from '@guardian/interfaces';
import { IDebugContext } from './block-engine/block-result.js';

/**
 * Policy roles interface
 */
export enum ActionType {
    COMMON = 'COMMON',
    LOCAL = 'LOCAL',
    REMOTE = 'REMOTE'
}

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
     * Policy message id
     */
    messageId: string;
    /**
     * Policy owner
     */
    policyOwner: string;
    /**
     * Policy instance
     */
    policyInstance: Policy;
    /**
     * Topic id
     */
    topicId: string;
    /**
     * Block about
     */
    about?: string;
    /**
     * Action location
     */
    actionType?: LocationType;
    /**
     * Block permissions
     */
    readonly permissions: string[];
    /**
     * Block variables
     */
    readonly variables: any[];
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
     * Database Server
     */
    readonly components: ComponentsService;

    /**
     * Dry-run
     */
    readonly dryRun: string;

    /**
     * Policy status
     */
    readonly policyStatus: PolicyStatus;

    /**
     * Policy availability
     */
    readonly policyAvailability: PolicyAvailability;

    /**
     * Policy location
     */
    readonly locationType: LocationType;

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
    setPolicyInstance(policyId: string, policy: Policy): void;

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
    checkDataStateDiffer?: (user: PolicyUser) => boolean

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
    updateBlock(state: any, user: PolicyUser, tag: string, userId: string | null): any;

    /**
     * Check permissions
     * @param role
     * @param user
     */
    hasPermission(user: PolicyUser | null): any;

    /**
     * Check Permission and Active
     * @param user
     */
    isAvailable(user: PolicyUser): Promise<boolean>;

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
     * Is child active
     * @param child
     * @param user
     */
    isChildActive(child: AnyBlockType, user: PolicyUser): boolean;

    /**
     * Is block active
     * @param user
     */
    isActive(user: PolicyUser): boolean;

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
     * Write debug to log
     * @param message
     */
    debug(message: any): void;

    /**
     * Save and update debug context
     * @param context
     */
    debugContext(context: IDebugContext): Promise<IDebugContext>;

    /**
     * Trigger events
     * @param eventType
     * @param user
     * @param data
     */
    triggerEvents<T>(
        eventType: PolicyOutputEventType | string,
        user: PolicyUser,
        data: T
    ): void;

    /**
     * Trigger event sync
     * @param eventType
     * @param user
     * @param data
     */
    triggerEventSync<T>(
        eventType: PolicyOutputEventType | string,
        user: PolicyUser,
        data: T
    ): Promise<any>;

    /**
     * Trigger event
     * @param event
     * @param user
     * @param data
     */
    triggerEvent<T>(
        event: IPolicyEvent<T>,
        user: PolicyUser,
        data: T
    ): void;

    /**
     * Create backup
     */
    backup(): void

    /**
     * Save block state
     */
    saveState(): Promise<void>;

    /**
     * Restore block state
     */
    restoreState(): Promise<void>;

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
    updateDataState(user: PolicyUser, state: any): boolean;

    /**
     * Join GET Data
     * @param {IPolicyDocument | IPolicyDocument[]} data
     * @param {PolicyUser} user
     * @param {AnyBlockType} parent
     */
    joinData<T extends IPolicyDocument | IPolicyDocument[]>(
        data: T,
        user: PolicyUser,
        parent: AnyBlockType
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

    /**
     * Get Cache
     * @param {string} name - variable name
     * @param {PolicyUser | string} [user] - user DID
     * @returns {T} - variable value
     */
    getCache<T>(name: string, user?: PolicyUser | string): Promise<T>;

    /**
     * Set Cache
     * @param {BlockCacheType} type - variable size
     * @param {string} name - variable name
     * @param {T} value - variable value
     * @param {PolicyUser | string} [user] - user DID
     */
    setCache<T>(
        type: BlockCacheType,
        name: string,
        value: T,
        user?: PolicyUser | string
    ): Promise<void>;

    /**
     * Set Cache
     * @param {string} name - variable name
     * @param {T} value - variable value
     * @param {PolicyUser | string} [user] - user DID
     * @protected
     */
    setShortCache<T>(
        name: string,
        value: T,
        user?: PolicyUser | string
    ): Promise<void>;

    /**
     * Set Cache (Big value)
     * @param {string} name - variable name
     * @param {T} value - variable value
     * @param {PolicyUser | string} [user] - user DID
     * @protected
     */
    setLongCache<T>(
        name: string,
        value: T,
        user?: PolicyUser | string
    ): Promise<void>;
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
    setData(user: PolicyUser | null, data: any, type?: ActionType): Promise<any>;

    /**
     * Get block data
     * @param user
     * @param uuid
     * @param queryParams
     */
    getData(user: PolicyUser | null, uuid: string, queryParams?: any): Promise<any>;

    /**
     * Update data state
     * @param user
     * @param data
     */
    updateDataState(user: PolicyUser, data: any): boolean;
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
    getData(user: PolicyUser | null, uuid: string, queryParams?: any): Promise<any>;

    /**
     * Change step
     * @param user
     * @param data
     * @param target
     */
    changeStep(user: PolicyUser, data: any, target: IPolicyBlock): Promise<void>;

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
    getData(user: PolicyUser | null, uuid: string, queryParams?: any): Promise<any>;

    /**
     * Get child filter addons
     */
    getChildFiltersAddons(): IPolicyBlock[];

    /**
     * Get filters from sources
     * @param user Policy user
     */
    getGlobalSourcesFilters(user: PolicyUser): Promise<{
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
    getSources(user: PolicyUser, globalFilters: any, paginationData: any, countResult?: boolean): Promise<any[] | number>;

    /**
     * Get global sources
     * @param user
     * @param paginationData
     * @param countResult
     * @param opts
     */
    getGlobalSources(user: PolicyUser, paginationData: any, countResult?: boolean, opts?: { savepointIds?: string[] }): Promise<any[] | number>;

    /**
     * Get common addons
     */
    getCommonAddons(): IPolicyBlock[];

    /**
     * On addon event
     * @param user
     * @param tag
     * @param documentId
     * @param handler
     */
    onAddonEvent(
        user: PolicyUser,
        tag: string,
        documentId: string,
        handler: (
            document: any
        ) => Promise<IPolicyEventState> | IPolicyEventState
    ): Promise<void>;
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
    setData(user: PolicyUser | null, data: any, type?: ActionType): Promise<any>;

    /**
     * Get block data
     * @param user
     * @param uuid
     * @param queryParams
     */
    getData(user: PolicyUser | null, uuid: string, queryParams?: any): Promise<any>;

    /**
     * Set filter state
     * @param user
     * @param data
     */
    setFilterState(user: PolicyUser | null, data: any): Promise<void>;

    /**
     * Get sources
     * @param user
     * @param globalFilters
     */
    getSources(user: PolicyUser, globalFilters: any): any;

    /**
     * Get from source
     * @param user
     * @param globalFilters
     * @param countResult
     * @param otherOptions
     */
    getFromSource(user: PolicyUser, globalFilters: any, countResult?: boolean, otherOptions?: any): any;

    /**
     * Get filters
     * @param user
     */
    getFilters(user: PolicyUser): Promise<{ [key: string]: string }>;

    /**
     * Set filters
     * @param filters
     * @param user
     */
    setFilters(filters: { [key: string]: string }, user: PolicyUser): void

    /**
     * Get block state
     * @param user
     */
    getState(user: PolicyUser): any;

    /**
     * Set block state
     * @param user
     * @param state
     */
    setState(user: PolicyUser, state: any): Promise<void>;

    /**
     * Get selective attributes addons
     */
    getSelectiveAttributes(): IPolicyAddonBlock[];

    /**
     * Set strict filters
     */
    setFiltersStrict(user: PolicyUser | null, data: any): Promise<void>;

    /**
     * Restore filters
     */
    resetFilters(user: PolicyUser): Promise<void>;

    /**
     * Restore pagination
     * @param user
     */
    resetPagination(user: PolicyUser): Promise<void>;
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
    run(scope: any, user: PolicyUser): Promise<any>;

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
    run(
        fieldsResult: any[],
        mapVariables: any
    ): Promise<[documentsNotFound: boolean, resultFields: any]>;

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
     * Is block active
     */
    isBlockActive(user: PolicyUser): Promise<boolean>;

    /**
     * Get block data
     * @param user
     */
    getData(user: PolicyUser): Promise<any>;

    /**
     * Ste block data
     * @param user
     * @param _data
     */
    setData(user: PolicyUser, _data: any): Promise<any>;

    /**
     * Get sources
     * @param user
     */
    getSources(user: PolicyUser): Promise<any[]>
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
 * Policy token block interface
 */
export interface IPolicyTokenBlock extends IPolicyBlock {
    /**
     * Get addons
     */
    getAddons(): IPolicyTokenAddon[];
}

/**
 * Policy token addon interface
 */
export interface IPolicyTokenAddon extends IPolicyBlock {
    /**
     * Run logic
     * @param scope
     */
    run(scope: any, root: UserCredentials, user: PolicyUser): Promise<any>;
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
    | IPolicyTokenBlock
    | IPolicyTokenAddon
    | IPolicyRequestBlock
    | IPolicyValidatorBlock;

/**
 * Policy document
 */
export interface IPolicyDBDocument<T> {
    /**
     * id
     */
    id?: string;
    /**
     * id
     */
    _id?: any;
    /**
     * DID
     */
    did?: string;
    /**
     * Policy id
     */
    policyId?: string;
    /**
     * Block Tag
     */
    tag?: string;
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
    messageId?: string;
    /**
     * Topic Id
     */
    topicId?: string;
    /**
     * Message History
     */
    messageIds?: string[];
    /**
     * Hedera Status
     */
    hederaStatus?: any;
    /**
     * status
     */
    status?: any;
    /**
     * Hash
     */
    hash?: string;
    /**
     * Hedera Hash
     */
    messageHash?: string;
    /**
     * Relationships
     */
    relationships?: string[];
    /**
     * Type
     */
    type?: string;
    /**
     * Schema
     */
    schema?: string;
    /**
     * Accounts
     */
    accounts?: any;
    /**
     * Options
     */
    option?: any;
    /**
     * Signature
     */
    signature?: any;
    /**
     * Ref
     */
    documentFields?: string[];
    /**
     * Tokens
     */
    tokens?: any;
    /**
     * comment
     */
    comment?: string;
    /**
     * Document instance
     */
    document?: T;

    /**
     * Document instance
     */
    encryptedDocument?: string;

    /**
     * Token identifier
     */
    tokenId?: string;

    /**
     * Is edited
     */
    edited?: boolean;

    /**
     * Is Draft
     */
    draft?: boolean;

    /**
     * Draft ID
     */
    draftId?: string;

    /**
     * Parent document
     */
    draftRef?: string;

    /**
     * Parent message
     */
    startMessageId?: string;

    /**
     * Relayer Account
     */
    relayerAccount?: string;

    /**
     * Last VC Version
     */
    oldVersion?: boolean;
    /**
     * Parent message
     */
    initId?: string;
}

/**
 * Policy document
 */
export interface IPolicyDocument extends IPolicyDBDocument<any> {
    /**
     * Ref
     */
    ref?: any;
    /**
     * blocks
     */
    blocks?: any;
    /**
     * blocks
     */
    target?: any;
    /**
     * sourceTag
     */
    __sourceTag__?: string;
}

/**
 * Policy event
 */
export interface IPolicyEventState {
    /**
     * Data
     */
    data: IPolicyDocument | IPolicyDocument[];

    /**
     * Result
     */
    old?: IPolicyDocument | IPolicyDocument[];

    /**
     * Result
     */
    result?: IPolicyDocument | IPolicyDocument[];

    /**
     * Source
     */
    source?: IPolicyDocument | IPolicyDocument[];
}

/**
 * Policy instance
 */
export interface IPolicyInstance {
    /**
     * Policy id
     */
    readonly policyId: string;

    /**
     * Dry-run
     */
    readonly dryRun: string;

    /**
     * Is Multiple Group
     */
    readonly isMultipleGroup: boolean;

    /**
     * Policy Instance Topic Id
     */
    readonly instanceTopicId: string;

    /**
     * Synchronization Topic Id
     */
    readonly synchronizationTopicId: string;

    /**
     * Policy Owner
     */
    readonly owner: string;

    /**
     * Policy Owner
     */
    readonly policyOwner: string;

    /**
     * Policy Owner
     */
    readonly components: ComponentsService;

    /**
     * Policy Status
     */
    readonly policyStatus: PolicyStatus;

    /**
     * Policy location
     */
    readonly locationType: LocationType;
}

/**
 * Navigation
 */
export interface IPolicyNavigation {
    /**
     * Data
     */
    role: string;
    /**
     * Data
     */
    steps: IPolicyNavigationStep[];
}

/**
 * Navigation Step
 */
export interface IPolicyNavigationStep {
    /**
     * Data
     */
    uuid: string;
    /**
     * Data
     */
    name: string;
    /**
     * Data
     */
    block: string;
    /**
     * Data
     */
    level: number;
}

/**
 * Block get data
 */
export interface IPolicyGetData {
    /**
     * Block ID
     */
    id: string;
    /**
     * Block Type
     */
    blockType: string;
    /**
     * Action Type
     */
    actionType: LocationType;
    /**
     * Readonly
     */
    readonly: boolean;

    [x: string]: any;

    draftDocument?: any;
}
