import { SchemaEntity } from '@guardian/interfaces';
import path from 'path';
import { DatabaseServer } from '@guardian/common';
import fs from 'fs-extra';

const { readJSON } = fs;

/**
 * Creation of default schemas.
 */
export async function setDefaultSchema() {
    const fileConfig = path.join(process.cwd(), 'system-schemas', 'system-schemas.json');
    let fileContent: any;
    try {
        fileContent = await readJSON(fileConfig);
    } catch (error) {
        throw new Error('you need to create a file \'system-schemas.json\'');
    }

    const map: any = {};
    for (const schema of fileContent) {
        map[schema.entity] = schema;
    }

    if (!map.hasOwnProperty(SchemaEntity.MINT_NFTOKEN)) {
        throw new Error(`You need to fill ${SchemaEntity.MINT_NFTOKEN} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.MINT_TOKEN)) {
        throw new Error(`You need to fill ${SchemaEntity.MINT_TOKEN} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.INTEGRATION_DATA_V2)) {
        throw new Error(`You need to fill ${SchemaEntity.INTEGRATION_DATA_V2} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.POLICY)) {
        throw new Error(`You need to fill ${SchemaEntity.POLICY} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.STANDARD_REGISTRY)) {
        throw new Error(`You need to fill ${SchemaEntity.STANDARD_REGISTRY} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.WIPE_TOKEN)) {
        throw new Error(`You need to fill ${SchemaEntity.WIPE_TOKEN} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.ROLE)) {
        throw new Error(`You need to fill ${SchemaEntity.ROLE} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.USER_PERMISSIONS)) {
        throw new Error(`You need to fill ${SchemaEntity.USER_PERMISSIONS} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.POLICY_DISCUSSION)) {
        throw new Error(`You need to fill ${SchemaEntity.POLICY_DISCUSSION} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.POLICY_COMMENT)) {
        throw new Error(`You need to fill ${SchemaEntity.POLICY_COMMENT} field in system-schemas.json file`);
    }

    if (!map.hasOwnProperty(SchemaEntity.POLICY_EXPORT_PROOF)) {
        throw new Error(`You need to fill ${SchemaEntity.POLICY_EXPORT_PROOF} field in system-schemas.json file`);
    }

    const fn = async (schema: any) => {
        const existingSchemas = await DatabaseServer.getSchema({
            uuid: schema.uuid,
            system: true
        });
        if (existingSchemas) {
            console.log(`Skip schema: ${schema.uuid}`);
            return;
        }
        schema.owner = null;
        schema.creator = null;
        schema.readonly = true;
        schema.system = true;
        schema.active = true;
        await DatabaseServer.createAndSaveSchema(schema);
        console.log(`Created schema: ${schema.uuid}`);
    };

    await fn(map[SchemaEntity.MINT_NFTOKEN]);
    await fn(map[SchemaEntity.MINT_TOKEN]);
    await fn(map[SchemaEntity.INTEGRATION_DATA_V2]);
    await fn(map[SchemaEntity.RETIRE_TOKEN]);
    await fn(map[SchemaEntity.POLICY]);
    await fn(map[SchemaEntity.STANDARD_REGISTRY]);
    await fn(map[SchemaEntity.WIPE_TOKEN]);
    await fn(map[SchemaEntity.ISSUER]);
    await fn(map[SchemaEntity.USER_ROLE]);
    await fn(map[SchemaEntity.CHUNK]);
    await fn(map[SchemaEntity.ACTIVITY_IMPACT]);
    await fn(map[SchemaEntity.TOKEN_DATA_SOURCE]);
    await fn(map[SchemaEntity.ROLE]);
    await fn(map[SchemaEntity.USER_PERMISSIONS]);
    await fn(map[SchemaEntity.POLICY_DISCUSSION]);
    await fn(map[SchemaEntity.POLICY_COMMENT]);
    await fn(map[SchemaEntity.POLICY_EXPORT_PROOF]);
}
