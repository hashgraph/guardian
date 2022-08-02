/**
 * Policy engine events
 */
export enum PolicyEngineEvents {
    RECEIVE_EXTERNAL_DATA = 'receive-external-data',
    POLICY_IMPORT_MESSAGE_PREVIEW = 'policy-import-message-preview',
    POLICY_IMPORT_MESSAGE_PREVIEW_ASYNC = 'policy-import-message-preview-async',
    POLICY_IMPORT_FILE_PREVIEW = 'policy-import-file-preview',
    CREATE_POLICIES = 'create-policies',
    CREATE_POLICIES_ASYNC = 'create-policies-async',
    SAVE_POLICIES = 'save-policies',
    PUBLISH_POLICIES = 'publish-policies',
    PUBLISH_POLICIES_ASYNC = 'publish-policies-async',
    VALIDATE_POLICIES = 'validate-policies',
    POLICY_BLOCKS = 'get-policy-blocks',
    GET_BLOCK_DATA = 'get-block-data',
    GET_BLOCK_DATA_BY_TAG = 'get-block-data-by-tag',
    SET_BLOCK_DATA = 'set-block-data',
    BLOCK_BY_TAG = 'get-block-by-tag',
    POLICY_EXPORT_FILE = 'policy-export-file',
    POLICY_EXPORT_MESSAGE = 'policy-export-message',
    POLICY_IMPORT_FILE = 'policy-import-file',
    POLICY_IMPORT_FILE_ASYNC = 'policy-import-file-async',
    POLICY_IMPORT_MESSAGE = 'policy-import-message',
    POLICY_IMPORT_MESSAGE_ASYNC = 'policy-import-message-async',
    GET_POLICIES = 'get-policies',
    GET_POLICY = 'get-policy',
    GET_BLOCK_PARENTS = 'get-block-parents',
    BLOCK_ABOUT = 'block-about'
}
