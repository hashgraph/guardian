const PORT = 3000;
const PORTCI = 3002;
const API = {
    //ApiServer: "http://localhost:"+PORT+"/api/v1/",
    ApiServer: "http://localhost:"+PORTCI+"/",
    //Accounts
    Accounts: "accounts/",
    AccountsLogin: "accounts/login/",
    RootAuthorities: "accounts/root-authorities",
    Installer: "accounts/installer",
    StandartRegistries:
        "accounts/standard-registries",
    Balance: "accounts/balance",
    AccountRegister: "accounts/register",
    //Profiles
    Profiles: "profiles/",
    //Tokens
    ListOfTokens: "tokens/",
    //Contracts
    ListOfContracts: "contracts/",
    ListOfPairs: "contracts/pairs/",
    ListOfRequests: "contracts/retire/requests/",
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
    PolicisImportMsgPreview: "policies/import/message/preview",
    PolicisImportMsgPreviewPush: "policies/push/import/message/preview",
    //Artifacts
        Artifacts: "artifacts/",
    Tags: "tags/",
};
export default API;
