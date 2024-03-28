/**
 * Task type
 */
export enum WorkerTaskType {
    GET_FILE = 'get-file',
    ADD_FILE = 'add-file',
    SEND_HEDERA = 'send-hedera',
    GENERATE_DEMO_KEY = 'generate-demo-key',
    GET_USER_BALANCE = 'get-user-balance',
    GET_ACCOUNT_INFO = 'get-account-info',
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
    callback: (data: any, error: any) => void;
}
