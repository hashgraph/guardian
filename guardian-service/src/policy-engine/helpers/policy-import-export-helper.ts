import { Policy } from '@entity/policy';
import { findAllEntities, regenerateIds, replaceAllEntities, SchemaFields } from '@helpers/utils';
import JSZip from 'jszip';
import { getMongoRepository } from 'typeorm';
import { GenerateUUIDv4 } from '@policy-engine/helpers/uuidv4';
import { Token } from '@entity/token';
import { Schema } from '@entity/schema';
import { ModelHelper, SchemaHelper, SchemaStatus } from 'interfaces';

export class PolicyImportExportHelper {
    /**
     * Generate Zip File
     * @param policy policy to pack
     *
     * @returns Zip file
     */
    static async generateZipFile(policy: Policy): Promise<JSZip> {
        const policyObject = {...policy};
        delete policyObject.id;
        delete policyObject.messageId;
        delete policyObject.registeredUsers;
        delete policyObject.status;
        const tokenIds = findAllEntities(policyObject.config, ['tokenId']);
        const schemesIds = findAllEntities(policyObject.config, SchemaFields);

        const tokens = await getMongoRepository(Token).find({where: {tokenId: {$in: tokenIds}}});
        const rootSchemes = await getMongoRepository(Schema).find({
            where: {iri: {$in: schemesIds}}
        });
        const defs: any[] = rootSchemes.map(s => JSON.parse(s.document).$defs);
        const map: any = {};
        for (let i = 0; i < rootSchemes.length; i++) {
            const id = rootSchemes[i].iri;
            map[id] = id;
        }
        for (let i = 0; i < defs.length; i++) {
            if (defs[i]) {
                const ids = Object.keys(defs[i]);
                for (let j = 0; j < ids.length; j++) {
                    const id = ids[j];
                    map[id] = id;
                }
            }
        }
        const allSchemesIds = Object.keys(map);
        const schemes = await getMongoRepository(Schema).find({
            where: {iri: {$in: allSchemesIds}}
        });

        const zip = new JSZip();
        zip.folder('tokens')
        for (let token of tokens) {
            zip.file(`tokens/${token.tokenName}.json`, JSON.stringify(token));
        }
        zip.folder('schemes')
        for (let schema of schemes) {
            const item = {...schema};
            delete item.id;
            delete item.status;
            delete item.readonly;
            zip.file(`schemes/${schema.iri}.json`, JSON.stringify(schema));
        }

        zip.file(`policy.json`, JSON.stringify(policyObject));
        return zip;
    }

    /**
     * Parse zip policy file
     * @param zipFile Zip file
     * @returns Parsed policy
     */
    static async parseZipFile(zipFile: any): Promise<any> {
        const zip = new JSZip();
        const content = await zip.loadAsync(zipFile);
        let policyString = await content.files['policy.json'].async('string');
        const tokensStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^tokens\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const schemesStringArray = await Promise.all(Object.entries(content.files)
            .filter(file => !file[1].dir)
            .filter(file => /^schemes\/.+/.test(file[0]))
            .map(file => file[1].async('string')));

        const policy = JSON.parse(policyString);
        const tokens = tokensStringArray.map(item => JSON.parse(item));
        const schemes = schemesStringArray.map(item => JSON.parse(item));

        return {policy, tokens, schemes};
    }

    /**
     * Import policy
     * @param policyToImport Policy json
     * @param policyOwner Policy owner
     *
     * @returns Policies by owner
     */
    static async importPolicy(policyToImport: any, policyOwner: string): Promise<Policy[]> {
        const {policy, tokens, schemes} = policyToImport;

        const dateNow = '_' + Date.now();
        const policyRepository = getMongoRepository(Policy);
        if (await policyRepository.findOne({name: policy.name})) {
            policy.name = policy.name + dateNow;
        }
        policy.policyTag = policy.policyTag + dateNow;
        policy.uuid = GenerateUUIDv4();
        policy.creator = policyOwner;
        policy.owner = policyOwner;
        policy.status = 'DRAFT';
        delete policy.id;
        delete policy.uuid;
        delete policy.messageId;
        delete policy.topicId;
        delete policy.version;
        delete policy.previousVersion;
        delete policy.registeredUsers;

        for (let token of tokens) {
            delete token.id;
            delete token.selected;
        }

        const existingTokens = await getMongoRepository(Token).find();
        const existingTokensMap = {};
        for (let i = 0; i < existingTokens.length; i++) {
            existingTokensMap[existingTokens[i].tokenId] = true;
        }

        const tokenObject = getMongoRepository(Token).create(tokens.filter((token: any) => !existingTokensMap[token.tokenId]));
        await getMongoRepository(Token).save(tokenObject);

        const result: any = {};
        for (let i = 0; i < schemes.length; i++) {
            const file = schemes[i];
            const newUUID = ModelHelper.randomUUID();
            const uuid = file.iri ? file.iri.substring(1) : null;
            if (uuid) {
                result[uuid] = newUUID;
            }
            file.uuid = newUUID;
            file.iri = '#' + newUUID;
        }

        const uuids = Object.keys(result);
        for (let i = 0; i < schemes.length; i++) {
            const file = schemes[i];
            for (let j = 0; j < uuids.length; j++) {
                const uuid = uuids[j];
                file.document = file.document.replace(new RegExp(uuid, 'g'), result[uuid]);
                file.context = file.context.replace(new RegExp(uuid, 'g'), result[uuid]);
            }
            file.messageId = null;
            file.creator = policyOwner;
            file.owner = policyOwner;
            file.status = SchemaStatus.DRAFT;
            SchemaHelper.setVersion(file, '', '');
            const schema = getMongoRepository(Schema).create(file);
            await getMongoRepository(Schema).save(schema);
        }

        const schemesMap = [];
        for (let j = 0; j < uuids.length; j++) {
            const uuid = uuids[j];
            schemesMap.push({
                oldUUID: uuid,
                newUUID: result[uuid],
                oldIRI: `#${uuid}`,
                newIRI: `#${result[uuid]}`
            })
        }

        for (let index = 0; index < schemesMap.length; index++) {
            const item = schemesMap[index];
            replaceAllEntities(policy.config, SchemaFields, item.oldIRI, item.newIRI);
        }
        // compatibility with older versions
        replaceAllEntities(policy.config, ['blockType'], 'interfaceDocumentsSource', 'interfaceDocumentsSourceBlock');
        replaceAllEntities(policy.config, ['blockType'], 'requestVcDocument', 'requestVcDocumentBlock');
        replaceAllEntities(policy.config, ['blockType'], 'sendToGuardian', 'sendToGuardianBlock');
        replaceAllEntities(policy.config, ['blockType'], 'interfaceAction', 'interfaceActionBlock');
        replaceAllEntities(policy.config, ['blockType'], 'mintDocument', 'mintDocumentBlock');
        replaceAllEntities(policy.config, ['blockType'], 'aggregateDocument', 'aggregateDocumentBlock');
        replaceAllEntities(policy.config, ['blockType'], 'wipeDocument', 'retirementDocumentBlock');

        regenerateIds(policy.config);

        let model = policyRepository.create(policy as Policy);
        model = await policyRepository.save(model);
        return await policyRepository.find({owner: policyOwner});
    }
}
