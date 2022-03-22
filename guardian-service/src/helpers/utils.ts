import { GenerateUUIDv4 } from '@policy-engine/helpers/uuidv4';
import { DidDocumentStatus, DocumentStatus, ISchema, IVC, IVCDocument, SchemaHelper, SchemaStatus } from 'interfaces';
import { DidMethodOperation, HcsVcOperation } from '@hashgraph/did-sdk-js';
import { getMongoRepository } from 'typeorm';
import { Schema } from '@entity/schema';
import { schemasToContext } from '@transmute/jsonld-schema';
import { Blob } from 'buffer';
import { IPFS } from '@helpers/ipfs';
import { ISchemaSubmitMessage, ModelActionType, HederaHelper, HederaSenderHelper } from 'vc-modules';
import { RootConfig } from '@entity/root-config';
import { Settings } from '@entity/settings';

export const SchemaFields = [
    'schema',
    'inputSchema',
    'outputSchema',
    'presetSchema'
];

export function findAllEntities(obj: { [key: string]: any }, names: string[]): string[] {
    const result = [];

    function finder(o: { [key: string]: any }): void {
        if (!o) {
            return;
        }

        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            if (o.hasOwnProperty(name)) {
                result.push(o[name]);
            }
        }

        if (o.hasOwnProperty('children')) {
            for (let child of o['children']) {
                finder(child);
            }
        }
    }
    finder(obj);

    const map = {};
    for (let index = 0; index < result.length; index++) {
        map[result[index]] = result[index];
    }
    return Object.values(map);
}

export function replaceAllEntities(
    obj: { [key: string]: any },
    names: string[],
    oldValue: string,
    newValue: string
): void {
    function finder(o: { [key: string]: any }, name: string): void {
        if (o.hasOwnProperty(name) && o[name] == oldValue) {
            o[name] = newValue;
        }
        if (o.hasOwnProperty('children')) {
            for (let child of o['children']) {
                finder(child, name);
            }
        }
    }
    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        finder(obj, name);
    }
}


export function regenerateIds(block: any) {
    block.id = GenerateUUIDv4();
    if (Array.isArray(block.children)) {
        for (let child of block.children) {
            regenerateIds(child);
        }
    }
}

export function getVCField(vcDocument: IVC, name: string): any {
    if (
        vcDocument &&
        vcDocument.credentialSubject &&
        vcDocument.credentialSubject[0]
    ) {
        return vcDocument.credentialSubject[0][name];
    }
    return null;
}

export function getVCIssuer(vcDocument: IVCDocument | IVCDocument): string {
    if (vcDocument && vcDocument.document) {
        return vcDocument.document.issuer;
    }
    return null;
}

export function findOptions(document: any, field: any) {
    let value: any = null;
    if (document && field) {
        const keys = field.split('.');
        value = document;
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            value = value[key];
        }
    }
    return value;
}

export function getDIDOperation(operation: DidMethodOperation | DidDocumentStatus) {
    switch (operation) {
        case DidMethodOperation.CREATE:
            return DidDocumentStatus.CREATE;
        case DidMethodOperation.DELETE:
            return DidDocumentStatus.DELETE;
        case DidMethodOperation.UPDATE:
            return DidDocumentStatus.UPDATE;
        case DidDocumentStatus.CREATE:
            return DidDocumentStatus.CREATE;
        case DidDocumentStatus.DELETE:
            return DidDocumentStatus.DELETE;
        case DidDocumentStatus.FAILED:
            return DidDocumentStatus.FAILED;
        case DidDocumentStatus.UPDATE:
            return DidDocumentStatus.UPDATE;
        default:
            return DidDocumentStatus.NEW;
    }
}

export function getVCOperation(operation: HcsVcOperation) {
    switch (operation) {
        case HcsVcOperation.ISSUE:
            return DocumentStatus.ISSUE;
        case HcsVcOperation.RESUME:
            return DocumentStatus.RESUME;
        case HcsVcOperation.REVOKE:
            return DocumentStatus.REVOKE;
        case HcsVcOperation.SUSPEND:
            return DocumentStatus.SUSPEND;
        default:
            return DocumentStatus.NEW;
    }
}

export async function incrementSchemaVersion(owner: string, iri: string): Promise<Schema> {
    if (!owner || !iri) {
        throw new Error('Schema not found');
    }
    const schema = await getMongoRepository(Schema).findOne({
        where: { iri: { $eq: iri } }
    });

    if (!schema) {
        throw new Error('Schema not found');
    }

    if (schema.status == SchemaStatus.PUBLISHED) {
        return schema;
    }

    const { version, previousVersion } = SchemaHelper.getVersion(schema);
    let newVersion = '1.0.0';
    if (previousVersion) {
        const schemes = await getMongoRepository(Schema).find({
            where: { uuid: { $eq: schema.uuid } }
        });
        const versions = [];
        for (let i = 0; i < schemes.length; i++) {
            const element = schemes[i];
            const { version, previousVersion } = SchemaHelper.getVersion(element);
            versions.push(version, previousVersion);
        }
        newVersion = SchemaHelper.incrementVersion(previousVersion, versions);
    }
    schema.version = newVersion;
    return schema;
}

export async function publishSchema(id: string, version: string, owner: string): Promise<Schema> {
    const item = await getMongoRepository(Schema).findOne(id);

    if (!item) {
        throw new Error('Schema not found');
    }

    if (item.creator != owner) {
        throw new Error('Invalid owner');
    }

    if (item.status == SchemaStatus.PUBLISHED) {
        throw new Error('Invalid status');
    }

    SchemaHelper.updateVersion(item, version);

    const itemDocument = JSON.parse(item.document);
    const defsArray = itemDocument.$defs ? Object.values(itemDocument.$defs) : [];
    item.context = JSON.stringify(schemasToContext([...defsArray, itemDocument]));

    const document = item.document;
    const context = item.context;

    const documentFile = new Blob([document], { type: "application/json" });
    const contextFile = new Blob([context], { type: "application/json" });
    let result: any;
    result = await IPFS.addFile(await documentFile.arrayBuffer());
    const documentCid = result.cid;
    const documentUrl = result.url;
    result = await IPFS.addFile(await contextFile.arrayBuffer());
    const contextCid = result.cid;
    const contextUrl = result.url;

    item.status = SchemaStatus.PUBLISHED;
    item.documentURL = documentUrl;
    item.contextURL = contextUrl;

    const schemaPublishMessage: ISchemaSubmitMessage = {
        name: item.name,
        description: item.description,
        entity: item.entity,
        owner: item.creator,
        uuid: item.uuid,
        version: item.version,
        operation: ModelActionType.PUBLISH,
        document_cid: documentCid,
        document_url: documentUrl,
        context_cid: contextCid,
        context_url: contextUrl
    }

    const root = await getMongoRepository(RootConfig).findOne({ did: owner });
    if (!root) {
        throw new Error('Root not found');
    }

    const hederaHelper = HederaHelper
        .setOperator(root.hederaAccountId, root.hederaAccountKey).SDK;
    const schemaTopicId = await getMongoRepository(Settings).findOne({
        name: 'SCHEMA_TOPIC_ID'
    })
    const messageId = await HederaSenderHelper.SubmitSchemaMessage(hederaHelper, schemaTopicId?.value || process.env.SCHEMA_TOPIC_ID, schemaPublishMessage);

    item.messageId = messageId;

    updateIRI(item);
    await getMongoRepository(Schema).update(item.id, item);

    return item;
}

export function updateIRI(schema: ISchema) {
    try {
        if (schema.document) {
            const document = JSON.parse(schema.document);
            schema.iri = document.$id || null;
        } else {
            schema.iri = null;
        }
    } catch (error) {
        schema.iri = null;
    }
}
