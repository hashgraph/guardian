/**
 * Task type
 */
export enum WorkerTaskType {
    GET_FILE = 'get-file',
    ADD_FILE = 'add-file',
    DELETE_CID = 'delete-cid',
    SEND_HEDERA = 'send-hedera',
    CREATE_ACCOUNT = 'create-account',
    GET_USER_BALANCE = 'get-user-balance',
    GET_USER_BALANCE_REST = 'get-user-balance-rest',
    GET_ACCOUNT_INFO = 'get-account-info',
    GET_ACCOUNT_INFO_REST = 'get-account-info-rest',
    GET_ACCOUNT_TOKENS_REST = 'get-account-tokens-info-rest',
    CREATE_TOKEN = 'create-token',
    UPDATE_TOKEN = 'update-token',
    DELETE_TOKEN = 'delete-token',
    ASSOCIATE_TOKEN = 'associate-token',
    GRANT_KYC_TOKEN = 'grant-kyc-token',
    FREEZE_TOKEN = 'freeze-token',
    WIPE_TOKEN = 'wipe-token',
    MINT_NFT = 'mint-nft',
    MINT_FT = 'mint-ft',
    TRANSFER_NFT = 'transfer-nft',
    TRANSFER_FT = 'transfer-ft',
    NEW_TOPIC = 'new-topic',
    CHECK_ACCOUNT = 'check-account',
    GET_TOPIC_MESSAGE = 'get-topic-message',
    GET_TOPIC_MESSAGES = 'get-topic-messages',
    GET_TOPIC_MESSAGE_BY_INDEX = 'get-topic-message-by-index',
    GET_TOPIC_MESSAGE_CHUNKS = 'get-topic-message-chunks',
    CREATE_CONTRACT = 'create-contract',
    CREATE_CONTRACT_V2 = 'create-contract-v2',
    CONTRACT_CALL = 'contract-call',
    CONTRACT_QUERY = 'contract-query',
    CUSTOM_CONTRACT_CALL = 'custom-contract-call',
    CUSTOM_CONTRACT_QUERY = 'custom-contract-query',
    GET_CONTRACT_INFO = 'get-contract-info',
    GET_USER_NFTS_SERIALS = 'get-user-nfts-serials',
    GET_TOKEN_NFTS = 'get-token-nfts',
    HTTP_REQUEST = 'http-request',
    GET_TOKEN_INFO = 'get-token-info',
    GET_CONTRACT_EVENTS = 'get-contract-events',
    GET_TRANSACTIONS = 'get-transaction',
    ANALYTICS_SEARCH_POLICIES = 'analytics-search-policies',
    ANALYTICS_GET_INDEXER_AVAILABILITY = 'analytics-get-indexer-availability',
    ANALYTICS_GET_RETIRE_DOCUMENTS = 'analytics-get-retire-documents'
}

/**
 * Worker Request
 */
export interface IWorkerRequest {
    /**
     * Minimum priority
     */
    minPriority: number;

    /**
     * Maximum priority
     */
    maxPriority: number;

    /**
     * Task timeout
     */
    taskTimeout: number;
}

/**
 * Task interface
 */
export interface ITask {
    /**
     * UserId
     */
    userId?: string | null | undefined;

    /**
     * Task ID
     */
    taskId?: string;

    /**
     * Attempts
     */
    attempts?: number;

    /**
     * Is retryable task
     */
    isRetryableTask?: boolean;

    /**
     * Task ID
     */
    id?: string;

    /**
     * Task priority
     */
    priority?: number;

    /**
     * Task type
     */
    type: WorkerTaskType;

    /**
     * Task data
     */
    data: any;

    /**
     * Sent
     */
    sent?: boolean;

    /**
     * attempt
     */
    attempt?: number

    /**
     * UserId
     */
    interception?: string | null | undefined;
}

/**
 * Task result
 */
export interface ITaskResult {
    /**
     * Task ID
     */
    id: string;
    /**
     * Result data
     */
    data?: any;
    /**
     * Task error
     */
    error?: any;
    /**
     * Is timeout error
     */
    isTimeoutError?: boolean;
}

/**
 * Active task interface
 */
export interface IActiveTask {
    /**
     * Task
     */
    task: ITask;
    /**
     * Number of repetitions
     */
    number: number;
    /**
     * Ready callback
     * @param data
     */
    callback: (data: any, error: any, isTimeoutError?: boolean) => void;
}

/**
 * Task options
 */
export interface ITaskOptions {
    /**
     * Default value = 10
     */
    priority?: number,
    /**
     * Default value = 0
     */
    attempts?: number,
    /**
     * Default value = true
     */
    registerCallback?: boolean,
    /**
     * Default value = null
     */
    interception?: string | boolean,
    /**
     * Default value = null
     */
    userId?: string,
}
