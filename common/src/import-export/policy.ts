import JSZip from 'jszip';
import { Artifact, Policy, PolicyTool, Schema, Tag, Token } from '../entity';
import { DataBaseHelper } from '../helpers';
import { DatabaseServer } from '../database-modules';
import { ImportExportUtils } from './utils';

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
    artifacts: IArtifact[];
    tags: Tag[];
    tools: PolicyTool[];
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
        const schemas = await new DataBaseHelper(Schema).find({ iri: { $in: schemasIds }, topicId, readonly: false });
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
        const defSchemas = await new DataBaseHelper(Schema).find({ iri: { $in: Array.from(defIds) }, topicId, readonly: false });
        for (const schema of defSchemas) {
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

        const tokens = await new DataBaseHelper(Token).find({ tokenId: { $in: tokenIds } });
        const schemas = await PolicyImportExport.loadSchemas(topicId, schemasIds);
        const tools = await new DataBaseHelper(PolicyTool).find({ messageId: { $in: toolIds } });
        const artifacts: IArtifact[] = [];
        const row = await new DataBaseHelper(Artifact).find({ policyId: policy.id });
        for (const item of row) {
            const data = await DatabaseServer.getArtifactFileByUUID(item.uuid);
            artifacts.push({
                name: item.name,
                uuid: item.uuid,
                extention: item.extention,
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
        return { policy, tokens, schemas, tools, artifacts, tags };
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
        const policyObject = { ...components.policy };
        delete policyObject._id;
        delete policyObject.id;
        delete policyObject.messageId;
        delete policyObject.status;
        delete policyObject.topicId;
        delete policyObject.createDate;

        const zip = new JSZip();

        zip.folder('artifacts');
        for (const artifact of components.artifacts) {
            zip.file(`artifacts/${artifact.uuid}`, artifact.data);
        }

        zip.file(`artifacts/metadata.json`, JSON.stringify(components.artifacts.map(item => {
            return {
                name: item.name,
                uuid: item.uuid,
                extention: item.extention
            }
        })));

        zip.folder('tokens');
        for (const token of components.tokens) {
            const item = { ...token };
            delete item._id;
            delete item.id;
            delete item.adminId;
            delete item.owner;
            delete item.wipeContractId;
            item.id = token.id.toString();
            zip.file(`tokens/${item.tokenName}.json`, JSON.stringify(item));
        }

        zip.folder('schemas');
        for (const schema of components.schemas) {
            const item = { ...schema };
            delete item._id;
            delete item.id;
            delete item.status;
            delete item.readonly;
            item.id = schema.id.toString();
            zip.file(`schemas/${item.iri}.json`, JSON.stringify(item));
        }

        zip.folder('tools');
        for (const tool of components.tools) {
            const item = {
                name: tool.name,
                description: tool.description,
                messageId: tool.messageId,
                owner: tool.creator,
                hash: tool.hash
            };
            zip.file(`tools/${tool.hash}.json`, JSON.stringify(item));
        }

        zip.folder('tags');
        for (let index = 0; index < components.tags.length; index++) {
            const tag = { ...components.tags[index] };
            delete tag.id;
            delete tag._id;
            tag.status = 'History';
            zip.file(`tags/${index}.json`, JSON.stringify(tag));
        }

        zip.file(PolicyImportExport.policyFileName, JSON.stringify(policyObject));
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
        const tokensStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^tokens\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const schemasStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^schem[a,e]s\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const toolsStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^tools\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const metaDataFile = (Object.entries(content.files)
            .find(file => file[0] === 'artifacts/metadata.json'));
        const metaDataString = metaDataFile && await metaDataFile[1].async('string') || '[]';
        const metaDataBody: any[] = JSON.parse(metaDataString);

        let artifacts: any;
        if (includeArtifactsData) {
            const data = Object.entries(content.files)
                .filter(file => !file[1].dir)
                .filter(file => /^artifacts\/.+/.test(file[0]) && file[0] !== 'artifacts/metadata.json')
                .map(async file => {
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

        const tagsStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^tags\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const policy = JSON.parse(policyString);
        const tokens = tokensStringArray.map(item => JSON.parse(item));
        const schemas = schemasStringArray.map(item => JSON.parse(item));
        const tools = toolsStringArray.map(item => JSON.parse(item));
        const tags = tagsStringArray.map(item => JSON.parse(item));

        return {
            policy,
            tokens,
            schemas,
            artifacts,
            tags,
            tools
        };
    }
}