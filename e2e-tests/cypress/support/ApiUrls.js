const API = {
    ApiServer: `http://localhost:${Cypress.env("portApi")}/`,
    ApiIndexer: `http://localhost:${Cypress.env("portIndexer")}/`,

    //Accounts
    Accounts: "accounts/",
    AccountsLogin: "accounts/login/",
    ChangePassword: "accounts/change-password/",
    AccessToken: "accounts/access-token/",
    RootAuthorities: "accounts/root-authorities",
    Installer: "accounts/installer",
    StandartRegistries:"accounts/standard-registries",
    StandardRegistriesAggregated:"accounts/standard-registries/aggregated",
    Balance: "accounts/balance",
    AccountRegister: "accounts/register",
    AccountSession: "accounts/session",

    //Analytics
    PolicyCompare: "analytics/compare/policies/",
    SchemaCompare: "analytics/compare/schemas/",
    ModuleCompare: "analytics/compare/modules/",
    ToolCompare: "analytics/compare/tools/",
    PolicySearch: "analytics/search/policies/",
    BlockSearch: "analytics/search/blocks/",

    //Profiles
    Profiles: "profiles/",

    //Tokens
    ListOfTokens: "tokens/",

    //Contracts
    ListOfContracts: "contracts/",
    ImportContracts: "contracts/import/",
    ContractPermissions: "permissions/",
    ListOfPairs: "contracts/pairs/",
    RetireRequests: "contracts/retire/requests/",
    WipeRequests: "contracts/wipe/requests/",
    RetireContract: "contracts/retire/",
    WipeContract: "contracts/wipe/",
    PoolContract: "pools/",
    Retire: "retire/",
    RetirePools: "contracts/retire/pools/",
    ManagerRole: "manager/",
    WiperRole: "wiper/",
    AdminRole: "admin/",
    SyncPools: "pools/sync",

    //Modules
    ListOfAllModules: "modules/",
    ListOfModules: "modules/menu/",
    ExportMessage: "export/message/",
    ImportMessage: "import/message/",
    ImportFile: "import/file/",

    //Logs
    Logs: "logs",
    LogsAttributes: "logs/attributes/",

    //Schemas
    PolicySchemas: "schemas?category=POLICY",
    Schemas: "schemas/",
    Schema: "schema/",
    SchemasSystem: "schemas/system/",
    SchemasSystemEntity: "schemas/system/entity/",
    SchemaImportMsgPreview: "schemas/import/message/preview",
    SchemaImportFilePreview: "schemas/import/file/preview",
    SchemaImport: "schemas/import/",
    SchemasType: "schemas/type",

    //Tools
    Tools: "tools",
    ToolsImportMsg: "tools/import/message",

    //TrustChains
    Trustchains: "trust-chains/",
    TrustChainBlock: "tag/trustChainBlock/blocks/",

    //Settings
    SettingsEnv: "settings/environment",
    SettingsAbout: "settings/about",

    //External
    External: "external",

    //ipfs
    IPFSFile: "ipfs/file/",
    IPFS: "ipfs/",

    //Demo
    RandomKey: "demo/random-key",
    RegUsers: "demo/registered-users",

    //Policies
    Policies: "policies/",
    Draft: "draft/",
    PolicisImportMsg: "policies/import/message/",
    PolicisImportMsgPush: "policies/push/import/message/",
    PolicisImportFile: "policies/import/file/",
    PolicisImportMsgPreview: "policies/import/message/preview",
    PolicisImportMsgPreviewPush: "policies/push/import/message/preview",
    PolicyGroups: "groups/",
    DryRun: "dry-run/",
    DryRunUser: "dry-run/user/",
    DryRunLogin: "dry-run/login/",
    ChooseRegistrantRole: "tag/choose_role/blocks/",
    CreateApplication: "tag/create_application/blocks",
    WaitForApproveApplication: "tag/wait_for_approve",
    DeviceGrid: "tag/devices_grid",
    IssueRequestGrid: "tag/issue_requests_grid",
    GetApplications: "tag/registrants_grid/blocks",
    ApproveApplication: "tag/approve_registrant_btn/blocks",
    ApproveRegistrantBtn: "tag/approve_registrant_btn",
    CreateDevice: "tag/create_device_form/blocks",
    GetDevices: "tag/approve_devices_grid/blocks",
    ApproveDevice: "tag/approve_device_btn/blocks",
    GetDeviceIssue: "tag/devices_grid/blocks",
    GetIssues: "tag/issue_requests_grid(evident)/blocks",
    ApproveIssueRequestsBtn: "tag/approve_issue_requests_btn/blocks",
    CreateIssue: "tag/create_issue_request_form/blocks",
    Categories: "methodologies/categories/",

    //Records
    Record: "record/",
    RecordStatus: "status/",
    RecordStart: "recording/start/",
    RecordStop: "recording/stop/",
    RecordActions: "recording/actions/",
    RunningStart: "running/start/",
    RunningStop: "running/stop/",
    RecordResults: "running/results/",
    RecordDetails: "running/details/",
    RecordFastForward: "running/fast-forward/",
    RecordRetry: "running/retry/",
    RecordSkip: "running/skip/",

    //Artifacts
    Artifacts: "artifacts/",

    //Tags
    Tags: "tags/",
    ApproveApplicationTag: "tag/approve_registrant_btn/",
    RegistrantGrid: "tag/registrants_grid/",
    CreateDeviceTag: "tag/create_device_form/",
    DeviceApproveGrid: "tag/approve_devices_grid/",
    ApproveDeviceTag: "tag/approve_device_btn/",
    CreateIssueTag: "tag/create_issue_request_form/",
    IssueGrid: "tag/issue_requests_grid(evident)/",
    ApproveIssueTag: "tag/approve_issue_requests_btn/",
    GetTokenAmountTag: "tag/vp_grid/",

    //General
    ExportCSV: "export?type=csv",
    ExportFile: "export/file",
    Async: "push/",
    Publish: "publish/",
    Blocks: "blocks/",
    Approve: "approve/",
    Reject: "reject/",
    Cancel: "cancel/",
    Requests: "requests/",
    Disable: "disable/",
    Enable: "enable/",
    Preview: "preview/",
    Validate: "validate/",
    Users: "users/",
    Assign: "assign/",
    Test: "test/",
    Start: "start/",
    Config: "config/",

    //Indexer
    IndexerRegistries: "entities/registries/",
    IndexerUsers: "entities/registry-users/",

    IndexerDIDs: "entities/did-documents/",
    IndexerVCs: "entities/vc-documents/",
    IndexerVPs: "entities/vp-documents/",
    IndexerStatisticVCs: "entities/statistic-documents/",
    IndexerLabelVPs: "entities/label-documents/",
    
    IndexerPolicies: "entities/policies/",
    IndexerTools: "entities/tools/",
    IndexerModules: "entities/modules/",
    IndexerSchemas: "entities/schemas/",
    IndexerTokens: "entities/tokens/",
    IndexerRoles: "entities/roles/",
    IndexerStatistics: "entities/statistics/",
    IndexerLabels: "entities/labels/",
    IndexerFormulas: "entities/formulas/",
    
    IndexerNFTs: "entities/nfts/",
    IndexerTopics: "entities/topics/",
    IndexerContracts: "entities/contracts/",

    //Worker tasks
    WorkerTasks: "worker-tasks/",

    //Themes
    Themes: "themes/",

    //Branding
    Branding: "branding/",

    //Notifications
    Notifications: "notifications/",
    NewNotifications: "notifications/new/",
    Progresses: "notifications/progresses/",
    ReadAll: "notifications/read/all/",
    DeleteNotification: "notifications/delete/",

    //Wizard
    WizardPolicy: "wizard/policy/",
    WizardPolicyAsync: "wizard/push/policy/",
    Wizard: "wizard/",
};
export default API;
