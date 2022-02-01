import { Policy } from "@entity/policy";
import { Guardians } from "@helpers/guardians";
import { findAllEntities } from "@helpers/utils";
import JSZip from "jszip";
import { getMongoRepository } from "typeorm";

export namespace PolicyImportExportHelper {
    /**
     * Generate Zip File  
     * @param policy policy to pack
     * 
     * @returns Zip file
     */
    export async function generateZipFile(policy: Policy): Promise<JSZip> {
        const guardians = new Guardians();

        const refs = findAllEntities(policy.config, 'schema');
        const tokenIds = findAllEntities(policy.config, 'tokenId');

        const [schemas, tokens] = await Promise.all([
            guardians.exportSchemes(refs),
            guardians.getTokens({ids: tokenIds})
        ]);

        const zip = new JSZip();
        zip.folder('schemas')
        for (let schema of schemas) {
            zip.file(`schemas/${schema.name}.json`, JSON.stringify(schema));
        }

        zip.folder('tokens')
        for (let token of tokens) {
            zip.file(`tokens/${token.tokenName}.json`, JSON.stringify(token));
        }
        zip.file(`policy.json`, JSON.stringify(policy));

        return zip;
    }

    /**
     * Parse zip policy file
     * @param zipFile Zip file
     * @returns Parsed policy
     */
    export async function parseZipFile(zipFile: any): Promise<any> {
        const zip = new JSZip();

        const content = await zip.loadAsync(zipFile);

        let policyString = await content.files['policy.json'].async('string');
        const schemaStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^schemas\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const tokensStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^tokens\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const policy = JSON.parse(policyString);
        const tokens = tokensStringArray.map(item => JSON.parse(item));
        const schemas = schemaStringArray.map(item => JSON.parse(item));


        return {policy, tokens, schemas};
    }

    /**
     * Import policy
     * @param policyToImport Policy json
     * @param policyOwner Policy owner
     * 
     * @returns Policies by owner  
     */
    export async function importPolicy(policyToImport: any, policyOwner: any): Promise<Policy[]> {
        let {policy, tokens, schemas} = policyToImport;
        const guardians = new Guardians();

        const dateNow = '_' + Date.now();

        for (let token of tokens) {
            delete token.id;
            delete token.selected;
        }
        for (let schema of schemas) {
            delete schema.owner;
            delete schema.id;
            delete schema.status;
        }

        const policyRepository = getMongoRepository(Policy);
        policy.policyTag = policy.tag + dateNow;
        if (await policyRepository.findOne({name: policy.name})) {
            policy.name = policy.name + dateNow;
        }

        delete policy.id;
        delete policy.status;
        policy.owner = policyOwner;

        await Promise.all([
            guardians.importTokens(tokens),
            guardians.importSchemes(schemas),
            policyRepository.save(policyRepository.create(policy))
        ]);

        return await policyRepository.find({owner: policyOwner});
    }
}