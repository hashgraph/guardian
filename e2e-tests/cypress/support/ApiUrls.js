const API = {
    ApiServer: "http://localhost:" + Cypress.env("portApi") + "/",
    //Accounts
    Accounts: "accounts/",
    AccountsLogin: "accounts/login/",
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
    ListOfPairs: "contracts/pairs/",
    RetireRequests: "contracts/retire/requests/",
    WipeRequests: "contracts/wipe/requests/",
    RetireContract: "contracts/retire/",
    PoolContract: "pools/",
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
    SchemaImportMsgPreview:
        "schemas/import/message/preview",
    SchemaImportFilePreview:
        "schemas/import/file/preview",
    SchemaImport: "schemas/import/",
    SchemasType: "schemas/type",
    //Tools
    Tools: "tools",
    ToolsImportMsg: "tools/import/message",
    //TrustChains
    Trustchains: "trust-chains/",
    //Settings
    SettingsEnv: "settings/environment",
    //External
    External: "external",
    //ipfs
    IPFSFile: "ipfs/file",
    //Demo
    RandomKey: "demo/random-key",
    //Policies
    Policies: "policies/",
    PolicisImportMsg: "policies/import/message/",
    PolicisImportFile: "policies/import/file/",
    PolicisImportMsgPreview: "policies/import/message/preview",
    PolicisImportMsgPreviewPush: "policies/push/import/message/preview",
    PolicyGroups: "groups/",
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



    //Artifacts
        Artifacts: "artifacts/",
    Tags: "tags/",
    //General
    ExportCSV: "export?type=csv",
    ExportFile: "export/file",
    Async: "push/",
    Publish: "publish/",
    Blocks: "blocks/"
};
export default API;
