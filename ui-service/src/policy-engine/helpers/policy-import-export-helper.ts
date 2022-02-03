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
        const tokenIds = findAllEntities(policy.config, 'tokenId');
        const tokens = await guardians.getTokens({ ids: tokenIds });
        const zip = new JSZip();
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

        const tokensStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^tokens\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const policy = JSON.parse(policyString);
        const tokens = tokensStringArray.map(item => JSON.parse(item));


        return { policy, tokens };
    }

    /**
     * Import policy
     * @param policyToImport Policy json
     * @param policyOwner Policy owner
     * 
     * @returns Policies by owner  
     */

    export async function importPolicy(policyToImport: any, policyOwner: string): Promise<Policy[]> {
        const { policy, tokens } = policyToImport;
        const guardians = new Guardians();

        const schemasIds = findAllEntities(policy.config, 'schema');
        if (schemasIds) {
            await guardians.importSchema(schemasIds, policyOwner);
        }

        for (let token of tokens) {
            delete token.id;
            delete token.selected;
        }
        await guardians.importTokens(tokens)

        const dateNow = '_' + Date.now();
        const policyRepository = getMongoRepository(Policy);
        policy.policyTag = policy.tag + dateNow;
        if (await policyRepository.findOne({ name: policy.name })) {
            policy.name = policy.name + dateNow;
        }

        delete policy.id;
        policy.status = 'PUBLISH';
        policy.creator = policy.owner;
        policy.owner = policyOwner;

        await policyRepository.save(policyRepository.create(policy))
        return await policyRepository.find({ owner: policyOwner });
    }

}