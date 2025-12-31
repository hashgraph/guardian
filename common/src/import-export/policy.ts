import JSZip from 'jszip';
import { Artifact, Formula, Policy, PolicyCategory, PolicyTool, Schema, Tag, Token } from '../entity/index.js';
import { DatabaseServer } from '../database-modules/index.js';
import { ImportExportUtils } from './utils.js';
import { PolicyCategoryExport, SchemaCategory, SchemaHelper, Schema as InterfaceSchema, SchemaEntity, GenerateUUIDv4 } from '@guardian/interfaces';
import stringify from 'fast-json-stable-stringify';
import crypto from 'crypto';
import { VcHelper } from '../helpers/vc-helper.js';
import { DataBaseHelper } from '../helpers/index.js';
import { ObjectId } from 'bson';

interface IArtifact {
    name: string;
    uuid: string;
    extention: string;
    data: any;
}

/**
 * Policy components
 */
export interface IPolicyComponents {
    policy: Policy;
    tokens: Token[];
    schemas: Schema[];
    systemSchemas: Schema[];
    formulas: Formula[];
    artifacts: IArtifact[];
    tags: Tag[];
    tools: PolicyTool[];
    tests: IArtifact[];
}

/**
 * Policy import export
 */
export class PolicyImportExport {
    /**
     * Policy filename
     */
    public static readonly policyFileName = 'policy.json';

    private static async loadSchemas(
        topicId: string,
        schemasIds: string[]
    ): Promise<Schema[]> {
        const result = new Map<string, Schema>();
        const schemas = await new DatabaseServer().find(Schema, {
            iri: { $in: schemasIds },
            topicId,
            readonly: false
        });
        for (const schema of schemas) {
            result.set(schema.iri, schema);
        }
        const defIds = new Set<string>();
        for (const schema of schemas) {
            const defs = schema?.document?.$defs;
            if (defs && Object.prototype.toString.call(defs) === '[object Object]') {
                for (const iri of Object.keys(defs)) {
                    if (!result.has(iri)) {
                        defIds.add(iri);
                    }
                }
            }
        }
        const defSchemas = await new DatabaseServer().find(Schema, {
            iri: { $in: Array.from(defIds) },
            topicId,
            readonly: false
        });
        for (const schema of defSchemas) {
            result.set(schema.iri, schema);
        }
        return Array.from(result.values());
    }

    private static async loadSystemSchemas(topicId: string): Promise<Schema[]> {
        const result = new Map<string, Schema>();
        const schemas = await new DatabaseServer().find(Schema, {
            topicId,
            readonly: true,
            category: SchemaCategory.SYSTEM
        });
        for (const schema of schemas) {
            result.set(schema.iri, schema);
        }
        return Array.from(result.values());
    }

    /**
     * Load policy components
     * @param policy policy
     *
     * @returns components
     */
    public static async loadPolicyComponents(policy: Policy): Promise<IPolicyComponents> {
        const topicId = policy.topicId;

        const tokenIds = ImportExportUtils.findAllTokens(policy.config);
        const schemasIds = ImportExportUtils.findAllSchemas(policy.config);
        const toolIds = ImportExportUtils.findAllTools(policy.config);

        const dataBaseServer = new DatabaseServer();

        const tokens = await dataBaseServer.find(Token, { tokenId: { $in: tokenIds } });
        const schemas = await PolicyImportExport.loadSchemas(topicId, schemasIds);
        const systemSchemas = await PolicyImportExport.loadSystemSchemas(topicId);
        const tools = await dataBaseServer.find(PolicyTool, { messageId: { $in: toolIds } });
        const artifacts: IArtifact[] = [];
        const artifactRows = await dataBaseServer.find(Artifact, { policyId: policy.id });
        for (const item of artifactRows) {
            const data = await DatabaseServer.getArtifactFileByUUID(item.uuid);
            artifacts.push({
                name: item.name,
                uuid: item.uuid,
                extention: item.extention,
                data
            });
        }

        const tests: IArtifact[] = [];
        const testRows = await DatabaseServer.getPolicyTests(policy.id);
        for (const item of testRows) {
            const data = await DatabaseServer.loadFile(item.file);
            tests.push({
                name: item.uuid,
                uuid: item.uuid,
                extention: 'record',
                data
            });
        }

        const tagTargets: string[] = [];
        tagTargets.push(policy.id.toString());
        for (const token of tokens) {
            tagTargets.push(token.id.toString());
        }
        for (const schema of schemas) {
            tagTargets.push(schema.id.toString());
        }
        const tags = await DatabaseServer.getTags({ localTarget: { $in: tagTargets } });

        const allCategories = await DatabaseServer.getPolicyCategories();
        policy.categoriesExport = policy.categories?.length ? PolicyImportExport.getPolicyCategoriesExport(policy, allCategories) : [];

        const formulas = await dataBaseServer.find(Formula, { policyId: policy.id });

        return {
            policy,
            tokens,
            schemas,
            systemSchemas,
            tools,
            artifacts,
            tags,
            tests,
            formulas
        };
    }

    /**
     * Load policy components (deep find)
     * @param policy policy
     *
     * @returns components
     */
    public static async loadAllSchemas(policy: Policy) {
        const components = await PolicyImportExport.loadPolicyComponents(policy);
        const toolsMap = new Set<string>();
        for (const tool of components.tools) {
            toolsMap.add(tool.messageId);
            if (Array.isArray(tool.tools)) {
                for (const subTool of tool.tools) {
                    toolsMap.add(subTool.messageId);
                }
            }
        }
        const tools = await new DatabaseServer().find(PolicyTool, { messageId: { $in: Array.from(toolsMap) } });
        const toolsTopicMap = tools.map((t) => t.topicId);
        const toolSchemas = await DatabaseServer.getSchemas({ topicId: { $in: toolsTopicMap } });
        const schemas = components.schemas;
        return { schemas, tools, toolSchemas };
    }

    /**
     * Generate Zip File
     * @param policy policy to pack
     *
     * @returns Zip file
     */
    public static async generate(policy: Policy): Promise<JSZip> {
        const components = await PolicyImportExport.loadPolicyComponents(policy);
        const file = await PolicyImportExport.generateZipFile(components);
        return file;
    }

    /**
     * Generate Zip File
     * @param components policy components
     *
     * @returns Zip file
     */
    public static async generateZipFile(components: IPolicyComponents): Promise<JSZip> {
        const zip = new JSZip();
        const preparedComponents: IPolicyComponents = PolicyImportExport.preparePolicyComponents(components);

        zip.folder('artifacts');
        for (const artifact of preparedComponents.artifacts) {
            zip.file(`artifacts/${artifact.uuid}`, artifact.data);
        }

        zip.file(`artifacts/metadata.json`, JSON.stringify(preparedComponents.artifacts.map(item => {
            const artifactItem = {
                name: item.name,
                uuid: item.uuid,
                extention: item.extention
            }
            return artifactItem;
        })));

        zip.folder('tokens');
        for (const token of preparedComponents.tokens) {
            zip.file(`tokens/${token.tokenName}.json`, JSON.stringify(token));
        }

        zip.folder('schemas');
        for (const schema of preparedComponents.schemas) {
            zip.file(`schemas/${schema.iri}.json`, JSON.stringify(schema));
        }

        zip.folder('systemSchemas');
        for (const schema of preparedComponents.systemSchemas) {
            zip.file(`systemSchemas/${schema.iri}.json`, JSON.stringify(schema));
        }

        zip.folder('tools');
        for (const tool of preparedComponents.tools) {
            zip.file(`tools/${tool.hash}.json`, JSON.stringify(tool));
        }

        zip.folder('tags');
        for (let index = 0; index < preparedComponents.tags.length; index++) {
            zip.file(`tags/${index}.json`, JSON.stringify(preparedComponents.tags[index]));
        }

        zip.folder('tests');
        for (const test of preparedComponents.tests) {
            zip.file(`tests/${test.uuid}.record`, test.data);
        }

        zip.folder('formulas');
        for (const formula of preparedComponents.formulas) {
            zip.file(`formulas/${formula.uuid}.json`, JSON.stringify(formula));
        }

        const hashSum = PolicyImportExport.getPolicyHash(preparedComponents);

        let credentialSubject: any = {
            name: preparedComponents.policy.name,
            description: preparedComponents.policy.description,
            version: preparedComponents.policy.codeVersion,
            hash: hashSum,
        }

        const policySchema = await DatabaseServer.getSchemaByType(preparedComponents.policy.topicId, SchemaEntity.POLICY_EXPORT_PROOF);
        credentialSubject = SchemaHelper.updateObjectContext(new InterfaceSchema(policySchema), credentialSubject);

        const vcHelper = new VcHelper();
        const didDocument = await vcHelper.loadDidDocument(preparedComponents.policy?.owner, preparedComponents.policy?.ownerId);

        if(didDocument) {
            const vc = await vcHelper.createVerifiableCredential(
                credentialSubject,
                didDocument,
                null,
                null
            );

            zip.file('proof.json', JSON.stringify(vc.getDocument()));
        }

        zip.file(PolicyImportExport.policyFileName, JSON.stringify(preparedComponents.policy));
        return zip;
    }

    /**
     * Parse zip policy file
     * @param zipFile Zip file
     * @returns Parsed policy
     */
    public static async parseZipFile(zipFile: any, includeArtifactsData: boolean = false): Promise<IPolicyComponents> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        if (!content.files[PolicyImportExport.policyFileName] || content.files[PolicyImportExport.policyFileName].dir) {
            throw new Error('Zip file is not a policy');
        }
        const policyString = await content.files[PolicyImportExport.policyFileName].async('string');
        const policy = JSON.parse(policyString);

        const fileEntries = Object.entries(content.files).filter(file => !file[1].dir);
        const [
            tokensStringArray,
            schemasStringArray,
            toolsStringArray,
            tagsStringArray,
            formulasStringArray,
            systemSchemasStringArray,
        ] = await Promise.all([
            Promise.all(fileEntries.filter(file => /^tokens\/.+/.test(file[0])).map(file => file[1].async('string'))),
            Promise.all(fileEntries.filter(file => /^schem[a,e]s\/.+/.test(file[0])).map(file => file[1].async('string'))),
            Promise.all(fileEntries.filter(file => /^tools\/.+/.test(file[0])).map(file => file[1].async('string'))),
            Promise.all(fileEntries.filter(file => /^tags\/.+/.test(file[0])).map(file => file[1].async('string'))),
            Promise.all(fileEntries.filter(file => /^formulas\/.+/.test(file[0])).map(file => file[1].async('string'))),
            Promise.all(fileEntries.filter(file => /^systemSchem[a,e]s\/.+/.test(file[0])).map(file => file[1].async('string'))),
        ]);
        const tokens = tokensStringArray.map(item => JSON.parse(item));
        const schemas = schemasStringArray.map(item => JSON.parse(item));
        const tools = toolsStringArray.map(item => JSON.parse(item));
        const tags = tagsStringArray.map(item => JSON.parse(item));
        const formulas = formulasStringArray.map(item => JSON.parse(item));
        const systemSchemas = systemSchemasStringArray.map(item => JSON.parse(item));

        const metaDataFile = (Object.entries(content.files).find(file => file[0] === 'artifacts/metadata.json'));
        const metaDataString = metaDataFile && await metaDataFile[1].async('string') || '[]';
        const metaDataBody: any[] = JSON.parse(metaDataString);

        let artifacts: any;
        if (includeArtifactsData) {
            const data = fileEntries.filter(file => /^artifacts\/.+/.test(file[0]) && file[0] !== 'artifacts/metadata.json').map(async file => {
                const uuid = file[0].split('/')[1];
                const artifactMetaData = metaDataBody.find(item => item.uuid === uuid);
                return {
                    name: artifactMetaData.name,
                    extention: artifactMetaData.extention,
                    uuid: artifactMetaData.uuid,
                    data: await file[1].async('nodebuffer')
                }
            })
            artifacts = await Promise.all(data);
        } else {
            artifacts = metaDataBody.map((artifactMetaData) => {
                return {
                    name: artifactMetaData.name,
                    extention: artifactMetaData.extention,
                    uuid: artifactMetaData.uuid,
                    data: null
                }
            });
        }

        const tests = await Promise.all(fileEntries.filter(file => /^tests\/.+/.test(file[0])).map(async file => {
            const uuid = file[0].split('/')[1].replace(/\.record$/, '');
            return {
                name: uuid,
                extention: 'record',
                uuid,
                data: await file[1].async('nodebuffer')
            }
        }));

        if (policy.categoriesExport?.length) {
            const allCategories = await DatabaseServer.getPolicyCategories();
            policy.categories = PolicyImportExport.parsePolicyCategories(policy, allCategories);
            policy.categoriesExport = [];
        }

        const policyComponents: IPolicyComponents = {
            policy,
            tokens,
            schemas,
            systemSchemas,
            artifacts,
            tags,
            tools,
            tests,
            formulas
        }

        const hashSum = PolicyImportExport.getPolicyHash(policyComponents);
        console.log('hashSum', hashSum);

        return policyComponents;
    }

    private static _createFile(json: string | Buffer, fileName: string): Promise<ObjectId> {
        return new Promise<ObjectId>((resolve, reject) => {
            try {
                const fileStream = DataBaseHelper.gridFS.openUploadStream(fileName);
                const fileId = fileStream.id;
                fileStream.write(json);
                fileStream.end(() => resolve(fileId));
            } catch (error) {
                reject(error)
            }
        });
    }

    /**
     * Generate zip file of policy project data
     * @param csvData csvData
     *
     * @returns Zip file
     */
    public static async generateProjectData(csvData: Map<string, string>): Promise<JSZip> {
        const zip = new JSZip();
        for (const name of csvData.keys()) {
            const csv = csvData.get(name);
            zip.file(name + '.csv', csv);
        }

        return zip;
    }

    /**
     * Get policy categories data
     *
     * @returns Array of PolicyCategoryExport
     */
    static getPolicyCategoriesExport(policy: Policy, allCategories: PolicyCategory[]): PolicyCategoryExport[] {
        const policyCategories: PolicyCategoryExport[] = [];

        policy.categories.forEach((categoryId: string) => {
            const foundPolicyCategory = allCategories.find((polCategory: PolicyCategory) => polCategory.id === categoryId);
            if (foundPolicyCategory) {
                const categoryExport: PolicyCategoryExport = {
                    name: foundPolicyCategory.name,
                    type: foundPolicyCategory.type
                }

                const addedCategory = policyCategories.find((polCategory: PolicyCategory) => polCategory.name === categoryExport.name && polCategory.type === categoryExport.type);

                if (!addedCategory) {
                    policyCategories.push(categoryExport);
                }
            }
        });

        return policyCategories;
    }

    /**
     * Restore policy categories data
     *
     * @returns Array of string
     */
    static parsePolicyCategories(policy: Policy, allCategories: PolicyCategory[]): string[] {
        const policyCategoryIds: string[] = [];

        policy.categoriesExport.forEach((categoryExport: PolicyCategoryExport) => {
            const foundPolicyCategory = allCategories.find((category: PolicyCategory) =>
                category.name === categoryExport.name && category.type === categoryExport.type);

            if (foundPolicyCategory && !policyCategoryIds.includes(foundPolicyCategory.id)) {
                policyCategoryIds.push(foundPolicyCategory.id);
            }
        });

        return policyCategoryIds;
    }

    /**
     * Load all schemas (deep find)
     * @param policy policy
     *
     * @returns schemas
     */
    public static async fastLoadSchemas(policy: Policy) {
        const topicId = policy.topicId;
        const tools: any[] = policy.tools || [];
        const toolsTopicMap = tools.map((t) => t.topicId);
        const schemas = await new DatabaseServer().find(Schema, { topicId, readonly: false });
        const toolSchemas = await DatabaseServer.getSchemas({ topicId: { $in: toolsTopicMap } });
        return { schemas, toolSchemas };
    }

    public static getPolicyHash(items: IPolicyComponents): string {
        const clonedItems = structuredClone(items);

        const preparedItems = PolicyImportExport.preparePolicyComponents(clonedItems);
        const cleanedBeforeHash = PolicyImportExport.cleanBeforeHash(preparedItems);

        const json = stringify(cleanedBeforeHash);
        return crypto.createHash('sha256').update(json).digest('hex');
    }

    private static cleanBeforeHash(components: IPolicyComponents): IPolicyComponents {
        delete components.policy.policyTag;
        delete components.policy.name;
        delete components.policy.uuid;
        delete components.policy.topicId;
        delete components.policy.commentsTopicId;
        delete components.policy.instanceTopicId;
        delete components.policy.recordsTopicId;
        delete components.policy.synchronizationTopicId;
        delete components.policy.version;
        delete components.policy.hash;
        delete components.policy.autoRecordSteps;
        delete components.policy.availability;
        delete components.policy.creator;
        delete components.policy.owner;
        delete components.policy.locationType;
        delete components.policy.originalMessageId;
        delete components.policy.policyNavigation;

        PolicyImportExport.removeField(components.policy, 'id');
        PolicyImportExport.removeField(components, 'guardianVersion');
        PolicyImportExport.removeField(components, 'systemSchemas');

        components.schemas.sort((schemaA, schemaB) => schemaA.name > schemaB.name ? -1 : 1);

        components.schemas.forEach(schema => {
            delete schema.id;
            delete schema.createDate;
            delete schema.updateDate;
            delete schema.documentURL;
            delete schema.messageId;
            delete schema.topicId;
            delete schema.sourceVersion;
            delete schema.creator;
            delete schema.owner;
            delete schema.codeVersion;
        });

        components.tokens.forEach(token => {
            delete token.id;
            delete token._id;
            delete token.createDate;
            delete token.updateDate;
            delete token.owner;
            delete token.creator;
            delete token.topicId;
            delete token.policyId;
            delete token.draftToken;
            delete token._docHash;
            delete token._propHash;
        });

        const schemaIds = new Map();
        const tokenIds = new Map();

        let tokenCounter = 0;
        let schemaCounter = 0;
        components.schemas.forEach(schema => {
            schemaIds.set(`schema:${schema.uuid}#${schema.uuid}`, `@${schemaCounter}`);
            schemaIds.set(`schema:${schema.uuid}&${schema.version}`, `@${schemaCounter}`);
            schemaIds.set(`schema:${schema.uuid}`, `@${schemaCounter}`);
            schemaIds.set(`${schema.uuid}&${schema.version}`, `@${schemaCounter}`);
            schemaIds.set(schema.uuid, `@${schemaCounter}`);
            schemaCounter++;
        });

        components.tokens.forEach(token => {
            tokenIds.set(token.tokenId, `@token${tokenCounter}`)
            console.log(`${token.tokenId} | ${tokenCounter}`);
            tokenCounter++;
        });

        components.schemas.forEach(schema => {
            delete schema.version;
            delete schema.contextURL;
        });

        let componentsJson = JSON.stringify(components);
        schemaIds.forEach((value, key)  => {
            componentsJson = componentsJson.replaceAll(key, value);
        });

        tokenIds.forEach((value, key)  => {
            componentsJson = componentsJson.replaceAll(key, value);
        });

        return JSON.parse(componentsJson);
    }

    private static preparePolicyComponents(components: IPolicyComponents): IPolicyComponents {
        const policyObject = structuredClone(components.policy);
        policyObject.id = (components.policy.id || components.policy._id)?.toString();
        delete policyObject._id;
        delete policyObject.messageId;
        delete policyObject.status;
        delete policyObject.createDate;
        delete policyObject.updateDate;
        delete policyObject.hashMapFileId;
        delete policyObject.configFileId;
        delete policyObject.originalChanged;
        delete policyObject.originalHash;
        delete policyObject.originalZipId;
        delete policyObject.hashMap;

        const artifacts = components.artifacts.map(a => ({
            name: a.name,
            uuid: a.uuid,
            extention: a.extention,
            data: a.data,
        }));

        const tokens = components.tokens.map(token => {
            const item: any = { ...token };
            item.id = (item.id || item._id)?.toString();
            delete item._id;
            delete item.adminId;
            delete item.owner;
            delete item.wipeContractId;
            return item;
        });

        const schemas = components.schemas.map(schema => {
            const item: any = { ...schema };
            item.id = (item.id || item._id)?.toString();
            delete item._id;
            delete item.status;
            delete item.readonly;
            delete item.documentFileId;
            delete item.contextFileId;

            return item;
        });

        const systemSchemas = components.systemSchemas.map(schema => {
            const item: any = { ...schema };
            item.id = (item.id || item._id)?.toString();
            delete item._id;
            delete item.status;
            delete item.readonly;
            delete item.documentFileId;
            delete item.contextFileId;

            return item;
        });

        const tools: PolicyTool[] = components.tools.map(tool => {
            tool.id =  (tool.id || tool._id)?.toString();
            tool.owner = tool.creator;

            return tool;
        });

        const tags = components.tags.map(tag => {
            const item: any = { ...tag };
            item.id = (item.id || item._id)?.toString();
            delete item._id;
            item.status = 'History';
            return item;
        });

        const tests = components.tests.map(test => ({
            ...test
        }));

        const formulas = components.formulas.map(formula => {
            const item: any = { ...formula };
            item.id = (item.id || item._id)?.toString();
            delete item._id;
            delete item.status;
            return item;
        });

        return {
            policy: policyObject,
            tokens,
            schemas,
            systemSchemas,
            artifacts,
            tags,
            tools,
            tests,
            formulas
        };
    }

    static async saveOriginalZip(zipFile: any, policyName?: string): Promise<ObjectId> {
        const fileName = `${policyName}_zip_${GenerateUUIDv4()}`;
        const fileId = await PolicyImportExport._createFile(zipFile, fileName);

        return fileId;
    }

    static async removeField(obj, fieldName) {
        if (Array.isArray(obj)) {
            obj.forEach(item => PolicyImportExport.removeField(item, fieldName));
            return;
        }

        if (obj !== null && typeof obj === 'object') {
            for (const key of Object.keys(obj)) {
                if (key === fieldName) {
                    delete obj[key];
                } else {
                    PolicyImportExport.removeField(obj[key], fieldName);
                }
            }
        }
    }
}