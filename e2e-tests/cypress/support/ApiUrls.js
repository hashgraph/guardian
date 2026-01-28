const API = {
    ApiServer: `http://localhost:${Cypress.env("portApi")}/`,
    ApiIndexer: `http://localhost:${Cypress.env("portIndexer")}/`,
    ApiMGS: `https://dev.guardianservice.app/api/v1/`,


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
    Key: "keys/",

    //Tokens
    ListOfTokens: "tokens/",

    //Contracts
    ListOfContracts: "contracts/",
    ImportContracts: "contracts/import/",
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
    SchemasWithSubSchemas: "schema-with-sub-schemas/",
    Topic: "topic/",

    //Tools
    Tools: "tools/",
    ToolsImportMsg: "tools/import/message",
    ToolsImportFile: "tools/import/file",
    ToolsAsBlock: "tools/menu/all",

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
    DryRunRestart: "dry-run/restart/",
    ChooseRegistrantRole: "tag/choose_role/blocks/",
    ChooseRole: "tag/Choose_Roles/blocks/",
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
    ProjectBtn: "tag/add_project_bnt/blocks",
    AddProj: "tag/add_project/blocks",
    ProjectGridPP: "tag/project_grid_pp/blocks",
    ProjectGridPP2: "tag/project_grid_pp_2/blocks",
    WaitForApproveVVB: "tag/wait_for_approve/blocks",
    CreateVVB: "tag/create_new_vvb/blocks",
    NewVVB: "tag/new_VVB/blocks",
    VVBGrid: "tag/vvb_grid_verra/blocks",
    ProjGridVVB: "tag/project_grid_verra/blocks",
    ApproveDocs: "tag/approve_documents_btn/blocks",
    AssignVVB: "tag/assign_vvb/blocks",
    ProjGridVVB2: "tag/project_grid_vvb/blocks",
    ApproveProjBtn: "tag/approve_project_btn/blocks",
    AddReportBtn: "tag/add_report_bnt/blocks",
    ReportGridPP: "tag/report_grid_pp/blocks",
    ReportGridVVB: "tag/report_grid_vvb/blocks",
    ApproveReportBtn: "tag/approve_report_btn/blocks",
    ReportGridVerra: "tag/report_grid_verra/blocks",
    AssignVVBMR: "tag/assign_vvb_mr/blocks",
    MintTokenVerra: "tag/mint_token_verra/blocks",
    Categories: "methodologies/categories/",
    AddValidationReport: "tag/add_new_validation_report/blocks",
    AddVerificationReport: "tag/add_verification_report/blocks",
    ValidationReportsVerra: "tag/validation_reports_verra/blocks",
    VerificationReportsVerra: "tag/verification_reports_verra/blocks",
    ApproveValidationReportBtn: "tag/approve_validation_report_btn/blocks",
    RegWorkflowSteps: "tag/registrants_workflow_steps/blocks",
    Savepoint: "savepoints/",
    SavepointDelete: "savepoints/delete",

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
    ArtifactsFiles: "artifacts/files/",

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
    Reload: "reload/",
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
    Roles: "roles/",
    Permissions: "permissions/",
    Default: "default/",
    Relationships: "relationships/",
    Documents: "documents/",
    Import: "import/",
    Info: "info/",

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

    //Formulas
    Formulas: "formulas/",
    Data: "data/",

    //Policy Labels
    PolicyLabels: "policy-labels/",

    //External policies
    ExternalPolicy: "external-policies/",
    ExternalPolicyRequests: "external-policies/requests/",

    //Permissions
    UsersPermissions: "permissions/users/",

    //Relayer-accounts
    RelayerAccounts: "relayer-accounts/",

    //MGS
    //Tenants
    TenantsUser: "tenants/user",
    TenantsDelete: "tenants/delete",
    TenantsInvite: "tenants/invite",
    TermsAgree: "accounts/terms/agree"
    
};
export default API;
