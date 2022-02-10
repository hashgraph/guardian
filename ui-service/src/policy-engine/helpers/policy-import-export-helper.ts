import { Policy } from "@entity/policy";
import { Guardians } from "@helpers/guardians";
import { findAllEntities } from "@helpers/utils";
import JSZip from "jszip";
import { getMongoRepository } from "typeorm";
import { GenerateUUIDv4 } from '@policy-engine/helpers/uuidv4';
import { BlockTreeGenerator } from '@policy-engine/block-tree-generator';

export namespace PolicyImportExportHelper {
    /**
     * Generate Zip File  
     * @param policy policy to pack
     * 
     * @returns Zip file
     */
    export async function generateZipFile(policy: Policy): Promise<JSZip> {
        const policyObject = {...policy};
        delete policyObject.id;
        delete policyObject.messageId;
        delete policyObject.registeredUsers;
        delete policyObject.status;
        const guardians = new Guardians();
        const tokenIds = findAllEntities(policyObject.config, 'tokenId');
        const tokens = await guardians.getTokens({ ids: tokenIds });
        const zip = new JSZip();
        zip.folder('tokens')
        for (let token of tokens) {
            zip.file(`tokens/${token.tokenName}.json`, JSON.stringify(token));
        }
        zip.file(`policy.json`, JSON.stringify(policyObject));
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

        function regenerateIds(block: any) {
            block.id = GenerateUUIDv4();
            if (Array.isArray(block.children)) {
                for (let child of block.children) {
                    regenerateIds(child);
                }
            }
        }
        regenerateIds(policy.config);

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
        policy.policyTag = policy.policyTag + dateNow;
        if (await policyRepository.findOne({ name: policy.name })) {
            policy.name = policy.name + dateNow;
        }

        delete policy.id;
        delete policy.uuid;
        delete policy.messageId;
        delete policy.topicId;
        delete policy.version;
        delete policy.previousVersion;
        delete policy.registeredUsers;

        policy.uuid = GenerateUUIDv4();
        policy.creator = policyOwner;
        policy.owner = policyOwner;
        policy.status = 'DRAFT';

        // const policyGenerator = new BlockTreeGenerator();
        // const errors = await policyGenerator.validate(policy);
        // const isValid = !errors.blocks.some(block => !block.isValid);
        let model = policyRepository.create(policy as Policy);
        model = await policyRepository.save(model);
        // if (isValid) {
        //     await policyGenerator.generate(model.id.toString());
        // }
        return await policyRepository.find({ owner: policyOwner });
    }
}
