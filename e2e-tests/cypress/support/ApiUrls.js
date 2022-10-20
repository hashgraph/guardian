const PORT = 3000;
const API = {
    ApiServer: "http://localhost:"+PORT+"/api/v1/",
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
    Trustchains: "trustchains/",
    //Settings
    SettingsEnv: "settings/environment",
    //External
    External: "external",
    //ipfs
    IPFSFile: "ipfs/file",
    //Demo
    RandomKey: "demo/push/randomKey",
    //Policies
    Policies: "policies/",
    PolicisImportMsg: "policies/import/message/",
    PolicisImportMsgPreview: "policies/import/message/preview",
    PolicisImportMsgPreviewPush: "policies/push/import/message/preview",
    //Artifacts
    Artifacts: "artifact/",
};
export default API;
