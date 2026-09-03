import JSZip from 'jszip';
import { Artifact, Formula, Policy, PolicyCategory, PolicyTool, Schema, SchemaTemplateSnapshot, Tag, Token } from '../entity/index.js';
import { DatabaseServer } from '../database-modules/index.js';
import { ImportExportUtils } from './utils.js';
import { PolicyCategoryExport, SchemaCategory, SchemaHelper, Schema as InterfaceSchema, SchemaEntity, GenerateUUIDv4 } from '@guardian/interfaces';
import stringify from 'fast-json-stable-stringify';
import crypto from 'node:crypto';
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
    schemaTemplateSnapshot?: SchemaTemplateSnapshot | null;
    artifactErrors?: IArtifactError[];
}

export interface IArtifactError {
    type: 'artifact';
    name: string;
    error: string;
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

    private static async loadTopicSchemas(topicId: string): Promise<Schema[]> {
        const result = new Map<string, Schema>();
        const schemas = await new DatabaseServer().find(Schema, {
            topicId,
            readonly: false
        });
        for (const schema of schemas) {
            result.set(schema.iri, schema);
        }
        return Array.from(result.values());
    }

    private static mergeSchemas(...schemaGroups: Schema[][]): Schema[] {
        const result = new Map<string, Schema>();
        for (const schemas of schemaGroups) {
            for (const schema of schemas) {
                result.set(schema.iri, schema);
            }
        }
        return Array.from(result.values());
    }

    private static async loadPolicySchemaTemplateSchemas(
        policy: Policy,
        existingSchemas: Schema[]
    ): Promise<Schema[]> {
        const schemaMap = policy.schemaTemplate?.schemaMap || {};
        const schemaIds = Object.values(schemaMap)
            .map(id => id?.toString?.() || String(id || ''))
            .filter(id => !!id);

        if (!schemaIds.length) {
            return existingSchemas;
        }

        const result = new Map<string, Schema>();
        for (const schema of existingSchemas) {
            result.set(schema.id?.toString(), schema);
        }

        const missingIds = schemaIds.filter(id => !result.has(id));
        if (!missingIds.length) {
            return Array.from(result.values());
        }

        const objectIds = missingIds
            .filter(id => ObjectId.isValid(id))
            .map(id => new ObjectId(id));
        if (!objectIds.length) {
            return Array.from(result.values());
        }

        const templateSchemas = await DatabaseServer.getSchemas({
            _id: { $in: objectIds },
            topicId: policy.topicId,
            readonly: false
        });

        for (const schema of templateSchemas) {
            result.set(schema.id?.toString(), schema);
        }

        const loadedIris = new Set(Array.from(result.values()).map(schema => schema.iri));
        const missingRefs = new Set<string>();
        for (const schema of templateSchemas) {
            const defs = schema?.document?.$defs;
            if (defs && Object.prototype.toString.call(defs) === '[object Object]') {
                for (const iri of Object.keys(defs)) {
                    if (!loadedIris.has(iri)) {
                        missingRefs.add(iri);
                    }
                }
            }
        }

        if (missingRefs.size) {
            const refSchemas = await DatabaseServer.getSchemas({
                iri: { $in: Array.from(missingRefs) },
                topicId: policy.topicId,
                readonly: false
            });
            for (const schema of refSchemas) {
                result.set(schema.id?.toString(), schema);
                loadedIris.add(schema.iri);
            }
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
        const schemas = await PolicyImportExport.loadPolicySchemaTemplateSchemas(
            policy,
            PolicyImportExport.mergeSchemas(
                await PolicyImportExport.loadTopicSchemas(topicId),
                await PolicyImportExport.loadSchemas(topicId, schemasIds)
            )
        );
        const systemSchemas = await PolicyImportExport.loadSystemSchemas(topicId);
        const tools = await dataBaseServer.find(PolicyTool, { messageId: { $in: toolIds } });
        const schemaTemplateSnapshot = policy.schemaTemplate?.snapshotId
            ? await DatabaseServer.getSchemaTemplateSnapshotById(policy.schemaTemplate.snapshotId)
            : null;
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

        const formulas = await dataBaseServer.find(Formula, { policyId: policy.id, autoGenerated: { $ne: true }  });

        return {
            policy,
            tokens,
            schemas,
            systemSchemas,
            tools,
            artifacts,
            tags,
            tests,
            formulas,
            schemaTemplateSnapshot
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
     * @param schemaPackageDocuments
     * @returns Zip file
     */
    public static async generate(policy: Policy, schemaPackageDocuments: { document?: Buffer; context?: Buffer; metadata?: Buffer } | null = null): Promise<JSZip> {
        const components = await PolicyImportExport.loadPolicyComponents(policy);
        return await PolicyImportExport.generateZipFile(components, schemaPackageDocuments);
    }

    /**
     * Generate Zip File
     * @param components policy components
     *
     * @param schemaPackageDocuments
     * @returns Zip file
     */
    public static async generateZipFile(components: IPolicyComponents, schemaPackageDocuments?: { document?: Buffer; context?: Buffer; metadata?: Buffer } | null): Promise<JSZip> {
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

        if (preparedComponents.schemaTemplateSnapshot) {
            zip.folder('schemaTemplate');
            zip.file(
                'schemaTemplate/snapshot.json',
                JSON.stringify(preparedComponents.schemaTemplateSnapshot)
            );
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
        if(policySchema) {
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
        }

        const ZIP_FILE_OPTIONS = ImportExportUtils.getDeterministicZipFileOptions();
        ImportExportUtils.addDeterministicZipDir(zip, 'ipfs');

        if (schemaPackageDocuments) {
            ImportExportUtils.addDeterministicZipDir(zip, 'ipfs/schema-package');

            if (schemaPackageDocuments.document) {
                zip.file('ipfs/schema-package/document.json', schemaPackageDocuments.document, ZIP_FILE_OPTIONS);
            }
            if (schemaPackageDocuments.context) {
                zip.file('ipfs/schema-package/context.json', schemaPackageDocuments.context, ZIP_FILE_OPTIONS);
            }
            if (schemaPackageDocuments.metadata) {
                zip.file('ipfs/schema-package/metadata.json', schemaPackageDocuments.metadata, ZIP_FILE_OPTIONS);
            }
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
            schemaTemplateSnapshotString,
        ] = await Promise.all([
            Promise.all(fileEntries.filter(file => /^tokens\/.+/.test(file[0])).map(file => file[1].async('string'))),
            Promise.all(fileEntries.filter(file => /^schem[a,e]s\/.+/.test(file[0])).map(file => file[1].async('string'))),
            Promise.all(fileEntries.filter(file => /^tools\/.+/.test(file[0])).map(file => file[1].async('string'))),
            Promise.all(fileEntries.filter(file => /^tags\/.+/.test(file[0])).map(file => file[1].async('string'))),
            Promise.all(fileEntries.filter(file => /^formulas\/.+/.test(file[0])).map(file => file[1].async('string'))),
            Promise.all(fileEntries.filter(file => /^systemSchem[a,e]s\/.+/.test(file[0])).map(file => file[1].async('string'))),
            content.files['schemaTemplate/snapshot.json'] && !content.files['schemaTemplate/snapshot.json'].dir
                ? content.files['schemaTemplate/snapshot.json'].async('string')
                : null,
        ]);
        const tokens = tokensStringArray.map(item => JSON.parse(item));
        const schemas = schemasStringArray.map(item => JSON.parse(item));
        const tools = toolsStringArray.map(item => JSON.parse(item));
        const tags = tagsStringArray.map(item => JSON.parse(item));
        const formulas = formulasStringArray.map(item => JSON.parse(item));
        const systemSchemas = systemSchemasStringArray.map(item => JSON.parse(item));
        const schemaTemplateSnapshot = schemaTemplateSnapshotString
            ? JSON.parse(schemaTemplateSnapshotString)
            : null;

        const metaDataFile = (Object.entries(content.files).find(file => file[0] === 'artifacts/metadata.json'));
        const metaDataString = metaDataFile && await metaDataFile[1].async('string') || '[]';
        //Artifact entries this archive could not resolve.
        const artifactErrors: IArtifactError[] = [];
        const parsedMetaData = JSON.parse(metaDataString);
        //A record object rather than a list would throw from find/map below and take
        //every artifact with it. It degrades to "no records", and the file is reported
        //once INSTEAD of one identical miss per entry - the entries are not the fault.
        const metaDataUsable = Array.isArray(parsedMetaData);
        const metaDataBody: any[] = metaDataUsable ? parsedMetaData : [];
        if (!metaDataUsable) {
            artifactErrors.push({
                type: 'artifact',
                name: 'artifacts/metadata.json',
                error: 'Artifact metadata is not a list; no artifact in this archive could be resolved.'
            });
        }

        let artifacts: any;
        if (includeArtifactsData) {
            /*
             * A missing metadata record used to dereference `undefined` inside a
             * Promise.all, so one bad entry aborted the whole import with a raw
             * TypeError. Three ways in, none needing malice: no metadata.json, a
             * truncated archive, or a nested path whose split('/')[1] matches no uuid.
             */
            const artifactEntries = fileEntries.filter(
                file => /^artifacts\/.+/.test(file[0]) && file[0] !== 'artifacts/metadata.json'
            );
            const resolved = await Promise.all(artifactEntries.map(async file => {
                const path = file[0];
                const uuid = path.split('/')[1];
                //Nested paths are not an artifact layout this format defines.
                const isNested = path.split('/').length > 2;
                const artifactMetaData = isNested
                    ? undefined
                    : metaDataBody.find(item => item.uuid === uuid);
                if (!artifactMetaData) {
                    return {
                        error: {
                            type: 'artifact' as const,
                            name: path,
                            error: isNested
                                ? 'Artifact is nested; artifacts must sit directly under artifacts/.'
                                : 'No metadata record matches this artifact.'
                        }
                    };
                }
                return {
                    artifact: {
                        name: artifactMetaData.name,
                        extention: artifactMetaData.extention,
                        uuid: artifactMetaData.uuid,
                        data: await file[1].async('nodebuffer')
                    }
                };
            }));
            for (const item of resolved) {
                if (item.error && metaDataUsable) {
                    artifactErrors.push(item.error);
                }
            }
            artifacts = resolved.filter(item => item.artifact).map(item => item.artifact);
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
            formulas,
            schemaTemplateSnapshot,
            //excluded from the hash by cleanBeforeHash
            ...(artifactErrors.length ? { artifactErrors } : {})
        }

        const hashSum = PolicyImportExport.getPolicyHash(policyComponents);
        console.log('hashSum', hashSum);

        return policyComponents;
    }

    private static _createFile(json: string | Buffer, fileName: string): Promise<ObjectId> {
        return DataBaseHelper.writeToGridFS(json, fileName, () => DataBaseHelper.gridFS.openUploadStream(fileName));
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
        //getPolicyHash stringifies the whole object, so a parse diagnostic would change
        //the hash of a policy whose content is identical
        delete components.artifactErrors;
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
        delete components.schemaTemplateSnapshot;
        /*
         * Environment-specific, so it cannot take part in the hash: snapshotId,
         * schemaMap ObjectIds and the timestamps are assigned per environment, so an
         * identical policy hashed differently in each one. Same for the per-schema
         * markers below.
         */
        delete (components.policy as any).schemaTemplate;

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
            // see the note on policy.schemaTemplate above
            delete (schema as any).templateId;
            delete (schema as any).templateSchemaId;
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

        // Build ref maps before deleting version (some forms embed it).
        const { groups, tokenIds } = PolicyImportExport.buildRefGroups(components.schemas, components.tokens);

        components.schemas.forEach(schema => {
            delete schema.version;
            delete schema.contextURL;
        });

        let componentsJson = JSON.stringify(components);
        componentsJson = PolicyImportExport.removeIpfsFromJson(componentsJson);

        const normalized = PolicyImportExport.applyRefGroups(componentsJson, groups, tokenIds);

        return JSON.parse(normalized);
    }

    private static removeIpfsFromJson(json: string): string {
        return json.replace(/ipfs:\/\/[^\s"#&]+/g, '');
    }

    /**
     * Build one ref map per textual reference form, mapping each schema to a positional tag
     * (`@<index>`) so equivalent policies hash equally. Ordered most-specific-first, since a
     * later form can match an earlier form's output (`schema:${uuid}#` -> `#`, then `#${uuid}`).
     */
    private static buildRefGroups(
        schemas: Schema[],
        tokens: Token[]
    ): { groups: Map<string, string>[]; tokenIds: Map<string, string> } {
        const g1 = new Map<string, string>(); // schema:${uuid}#${uuid}
        const g2 = new Map<string, string>(); // schema:${uuid}&${version}
        const g3 = new Map<string, string>(); // schema:${uuid}#
        const g4 = new Map<string, string>(); // schema:${uuid}
        const g5 = new Map<string, string>(); // #${uuid}&${version}
        const g6 = new Map<string, string>(); // #${uuid}
        const g7 = new Map<string, string>(); // ${uuid}&${version}
        const g8 = new Map<string, string>(); // ${uuid}
        const tokenIds = new Map<string, string>();

        schemas.forEach((schema, index) => {
            const tag = `@${index}`;
            g1.set(`schema:${schema.uuid}#${schema.uuid}`, tag);
            g2.set(`schema:${schema.uuid}&${schema.version}`, tag);
            g3.set(`schema:${schema.uuid}#`, `#`);
            g4.set(`schema:${schema.uuid}`, tag);
            g5.set(`#${schema.uuid}&${schema.version}`, tag);
            g6.set(`#${schema.uuid}`, tag);
            g7.set(`${schema.uuid}&${schema.version}`, tag);
            g8.set(`${schema.uuid}`, tag);
        });

        tokens.forEach((token, index) => {
            tokenIds.set(token.tokenId, `@token${index}`);
        });

        return { groups: [g1, g2, g3, g4, g5, g6, g7, g8], tokenIds };
    }

    /**
     * Apply each ref map in a single pass via one alternation regex of its exact keys, in
     * insertion order. Reproduces the original per-key `replaceAll` sequence byte-for-byte
     * (same substrings and prefix precedence) but avoids the O(schemas^2) full-string rescans.
     */
    private static applyRefGroups(
        json: string,
        groups: Map<string, string>[],
        tokenIds: Map<string, string>
    ): string {
        let result = json;
        for (const map of groups) {
            if (map.size === 0) {
                continue;
            }
            const pattern = Array.from(map.keys(), PolicyImportExport.escapeRegExp).join('|');
            const regex = new RegExp(pattern, 'g');
            // Every match is verbatim one of this map's keys, so the lookup is always defined.
            result = result.replace(regex, (match) => map.get(match));
        }

        tokenIds.forEach((value, key) => {
            result = result.replaceAll(key, value);
        });

        return result;
    }

    private static escapeRegExp(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
            delete item.policyTopicId;
            delete item.policyInstanceTopicId;
            return item;
        });

        const schemaTemplateSnapshot = components.schemaTemplateSnapshot
            ? PolicyImportExport.prepareSchemaTemplateSnapshot(components.schemaTemplateSnapshot)
            : null;

        return {
            policy: policyObject,
            tokens,
            schemas,
            systemSchemas,
            artifacts,
            tags,
            tools,
            tests,
            formulas,
            schemaTemplateSnapshot
        };
    }

    private static prepareSchemaTemplateSnapshot(snapshot: SchemaTemplateSnapshot): SchemaTemplateSnapshot {
        const item: any = { ...snapshot };
        delete item._id;
        delete item.id;
        delete item.policyId;
        delete item.configFileId;
        delete item.schemasFileId;
        delete item._configFileId;
        delete item._schemasFileId;

        return item;
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
