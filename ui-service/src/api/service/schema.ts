import { Guardians } from '@helpers/guardians';
import { Request, Response, Router } from 'express';
import { ISchema, ISchemaSubmitMessage, ModelActionType, Schema, SchemaHelper, UserRole } from 'interfaces';
import { AuthenticatedRequest } from '@auth/auth.interface';
import { permissionHelper } from '@auth/authorizationHelper';
import { Blob } from 'buffer';
import { IPFS } from '@helpers/ipfs';
import { HederaHelper } from 'vc-modules';
import { Import } from '@helpers/import';
import { schemasToContext } from '@transmute/jsonld-schema';

/**
 * Schema route
 */
export const schemaAPI = Router();

schemaAPI.post('/', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const newSchema = req.body;
        if (newSchema.id) {
            const schema = await guardians.getSchemaById(newSchema.id);
            if (!schema) {
                res.status(500).json({ code: 500, message: 'Schema does not exist.' });
                return;
            }
            if (schema.owner != user.did) {
                res.status(500).json({ code: 500, message: 'Invalid owner.' });
                return;
            }
            newSchema.version = schema.version;
            delete newSchema.id;
            delete newSchema.status;
        } else {
            newSchema.version = "";
            delete newSchema.id;
            delete newSchema.status;
        }
        SchemaHelper.updateOwner(newSchema, user.did);
        const schemes = (await guardians.setSchema(newSchema));
        schemes.forEach((s) => s.isOwner = s.owner && s.owner == user.did);
        res.status(201).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemes = await guardians.getSchemesByOwner(user.did);
        schemes.forEach((s) => s.isOwner = s.owner && s.owner == user.did);
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.put('/', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const newSchema = req.body;
        const schema = await guardians.getSchemaById(newSchema.id);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.owner != user.did) {
            res.status(500).json({ code: 500, message: 'Invalid owner.' });
            return;
        }
        SchemaHelper.updateOwner(newSchema, user.did);
        const schemes = (await guardians.setSchema(newSchema));
        schemes.forEach((s) => s.isOwner = s.owner && s.owner == user.did);
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.put('/:schemaId/publish', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.owner != user.did) {
            res.status(500).json({ code: 500, message: 'Invalid owner.' });
            return;
        }
        const allVersion = await guardians.getSchemesByUUID(schema.uuid);
        const { version } = req.body;
        if (allVersion.findIndex(s => s.version == version) !== -1) {
            res.status(500).json({ code: 500, message: 'Version already exists.' });
        }
        SchemaHelper.updateVersion(schema, version);
        (await guardians.setSchema(schema));
        const schemes = (await guardians.publishSchema(schemaId));
        schemes.forEach((s) => s.isOwner = s.owner && s.owner == user.did);

        const publishedSchema = await guardians.getSchemaById(schemaId);
        const root = await guardians.getRootConfig(user.did);
        const schemaFile = new Blob([JSON.stringify(publishedSchema)], { type: "application/json" });
        const cid = await new IPFS().addFile(await schemaFile.arrayBuffer());
        const contextFile = new Blob([JSON.stringify(schemasToContext([publishedSchema.document]))], { type: "application/json" });
        const contextCid = await new IPFS().addFile(await contextFile.arrayBuffer());

        let schemaPublishMessage: ISchemaSubmitMessage = {
            name: publishedSchema.name,
            owner: publishedSchema.owner,
            cid: cid,
            uuid: publishedSchema.uuid,
            version: publishedSchema.version,
            operation: ModelActionType.PUBLISH,
            context_cid: contextCid
        }

        await HederaHelper
            .setOperator(root.hederaAccountId, root.hederaAccountKey).SDK
            .submitMessage(process.env.SUBMIT_SCHEMA_TOPIC_ID, JSON.stringify(schemaPublishMessage));

        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.put('/:schemaId/unpublish', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.owner != user.did) {
            res.status(500).json({ code: 500, message: 'Invalid owner.' });
            return;
        }
        const schemes = (await guardians.unpublishedSchema(schemaId));
        schemes.forEach((s) => s.isOwner = s.owner && s.owner == user.did);
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

schemaAPI.delete('/:schemaId', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user;
        const guardians = new Guardians();
        const schemaId = req.params.schemaId;
        const schema = await guardians.getSchemaById(schemaId);
        if (!schema) {
            res.status(500).json({ code: 500, message: 'Schema does not exist.' });
            return;
        }
        if (schema.owner != user.did) {
            res.status(500).json({ code: 500, message: 'Invalid owner.' });
            return;
        }
        const schemes = (await guardians.deleteSchema(schemaId));
        schemes.forEach((s) => s.isOwner = s.owner && s.owner == user.did);
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ code: 500, message: error.message });
    }
});

// schemaAPI.post('/import', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
//     try {
//         const guardians = new Guardians();
//         const newSchemes = req.body.schemes;
//         newSchemes.forEach((s: ISchema) => {
//             delete s.owner;
//             delete s.id;
//             delete s.status;
//         });
//         await guardians.importSchemes(newSchemes);
//         const schemes = (await guardians.getSchemes(null));
//         res.status(201).json(schemes);
//     } catch (error) {
//         res.status(500).json({ code: 500, message: error.message });
//     }
// });

// schemaAPI.post('/import/topic', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
//     try {
//         const importHelper = new Import();
//         const guardians = new Guardians();
//         const messageId = req.body.messageId;
//         const topicMessage = await importHelper.getTopicMessage(messageId);
//         const schemaToImport = await importHelper.getSchema(topicMessage.cid);

//         delete schemaToImport.owner;
//         delete schemaToImport.id;
//         delete schemaToImport.status;

//         await guardians.importSchemes([schemaToImport]);
//         const schemes = (await guardians.getSchemes(null));
//         res.status(201).json(schemes);
//     } catch (error) {
//         res.status(500).json({ code: 500, message: error.message });
//     }
// });

// schemaAPI.get('/import/preview/:messageId', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
//     try {
//         const importHelper = new Import();
//         const messageId = req.params.messageId;
//         const topicMessage = await importHelper.getTopicMessage(messageId);
//         const schemaToImport = await importHelper.getSchema(topicMessage.cid);
//         res.status(200).json(schemaToImport);
//     } catch (error) {
//         res.status(500).json({ code: 500, message: error.message });
//     }
// });

// schemaAPI.post('/export', permissionHelper(UserRole.ROOT_AUTHORITY), async (req: Request, res: Response) => {
//     try {
//         const guardians = new Guardians();
//         const refs = req.body.refs as string[];
//         const schemes = (await guardians.exportSchemes(refs));
//         schemes.forEach((s: ISchema) => {
//             delete s.id;
//             delete s.status;
//         });
//         const json = schemes;
//         res.status(200).json({ schemes: json });
//     } catch (error) {
//         res.status(500).json({ code: 500, message: error.message });
//     }
// });
