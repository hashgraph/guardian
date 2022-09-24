const API = {
    ApiServer: "http://localhost:3000/api/v1/",
    //Accounts
    Accounts: "http://localhost:3000/api/v1/accounts/",
    AccountsLogin: "http://localhost:3000/api/v1/accounts/login/",
    RootAuthorities: "http://localhost:3000/api/v1/accounts/root-authorities",
    Installer: "http://localhost:3000/api/v1/accounts/installer",
    StandartRegistries:
        "http://localhost:3000/api/v1/accounts/standard-registries",
    Balance: "http://localhost:3000/api/v1/accounts/balance",
    //Profiles
    Profiles: "http://localhost:3000/api/v1/profiles/",
    //Tokens
    ListOfTokens: "http://localhost:3000/api/v1/tokens/",
    //Logs
    Logs: "http://localhost:3000/api/v1/logs",
    LogsAttributes: "http://localhost:3000/api/v1/logs/attributes/",
    //Schemas
    Schemas: "http://localhost:3000/api/v1/schemas/",
    Schema: "http://localhost:3000/api/v1/schema/",
    SchemasSystem: "http://localhost:3000/api/v1/schemas/system/",
    SchemasSystemEntity: "http://localhost:3000/api/v1/schemas/system/entity/",
    SchemaImportMsgPreview:
        "http://localhost:3000/api/v1/schemas/import/message/preview",
    SchemaImportFilePreview:
        "http://localhost:3000/api/v1/schemas/import/file/preview",
    SchemaImport: "http://localhost:3000/api/v1/schemas/import/",
    SchemasType: "http://localhost:3000/api/v1/schemas/type",
    //TrustChains
    Trustchains: "http://localhost:3000/api/v1/trustchains/",
    //Settings
    SettingsEnv: "http://localhost:3000/api/v1/settings/environment",
    //External
    External: "http://localhost:3000/api/v1/external",
    //ipfs
    IPFSFile: "http://localhost:3000/api/v1/ipfs/file",
    //Demo
    RandomKey: "http://localhost:3000/api/v1/demo/push/randomKey",
    //Policies
    PolicisImportMsgPreview: "http://localhost:3000/api/v1/policies/import/message/preview",
    PolicisImportMsgPreviewPush: "http://localhost:3000/api/v1/policies/push/import/message/preview",
};
export default API;
