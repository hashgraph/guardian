/**
 * Policy events
 */
export enum PolicyEvents {
    GET_FREE_POLICY_SERVICES = 'get-free-policy-services',
    POLICY_SERVICE_FREE_STATUS = 'policy-service-free-status',
    GENERATE_POLICY = 'policy-event-generate-policy',
    POLICY_READY = 'policy-event-policy-ready',
    DELETE_POLICY = 'policy-event-delete-policy',
    VALIDATE_POLICY = 'policy-event-validate-policy',
    GET_BLOCK_DATA = 'policy-event-get-block-data',
    GET_BLOCK_DATA_BY_TAG = 'policy-event-get-block-data-by-tag',
    SET_BLOCK_DATA = 'policy-event-set-block-data',
    SET_BLOCK_DATA_BY_TAG = 'policy-event-set-block-data-by-tag',
    GET_ROOT_BLOCK_DATA = 'policy-event-get-root-block-data',
    GET_POLICY_GROUPS = 'policy-event-get-policy-groups',
    SELECT_POLICY_GROUP = 'policy-event-select-policy-groups',
    BLOCK_BY_TAG = 'policy-event-block-by-tag',
    GET_BLOCK_PARENTS = 'policy-event-get-block-parents',
    BLOCK_UPDATE_BROADCAST = 'policy-event-block-update-broadcast',
    MRV_DATA = 'policy-event-mrv-data',
    GET_BLOCK_ABOUT = 'policy-event-get-block-about',
    CHECK_IF_ALIVE = 'check-if-alive'
}
