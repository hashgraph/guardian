import {
    CompareUtils,
    HashComparator,
    FileModel,
    PolicyModel,
    PropertyType,
    SchemaModel,
    TokenModel
} from '../analytics/index.js';
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { Migration } from '@mikro-orm/migrations-mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';

/**
 * Migration to version 2.16.0
 */
export class ReleaseMigration extends Migration {
    /**
     * Up migration
     */
    async up(): Promise<void> {
        await this.setPoliciesHash();
    }

    async writeFile(gridFS: GridFSBucket, data: any): Promise<ObjectId> {
        return new Promise<ObjectId>((resolve, reject) => {
            try {
                if (data) {
                    const fileStream = gridFS.openUploadStream(
                        GenerateUUIDv4()
                    );
                    fileStream.write(JSON.stringify(data));
                    fileStream.end(() => resolve(fileStream.id));
                } else {
                    resolve(null);
                }
            } catch (error) {
                reject(error)
            }
        });
    }

    /**
     * Set policies hash
     */
    async setPoliciesHash() {
        const policyCollection = this.getCollection('Policy');
        const schemaCollection = this.getCollection('Schema');
        const tokenCollection = this.getCollection('Token');
        const artifactCollection = this.getCollection('Artifact');
        const artifactChunkCollection = this.getCollection('ArtifactChunk');
        const db: any = this.driver?.getConnection()?.getDb();
        const gridFS = new GridFSBucket(db);

        const policies = policyCollection.find({}, { session: this.ctx });
        while (await policies.hasNext()) {
            const policy = await policies.next() as any;
            if (policy.configFileId) {
                const fileStream = gridFS.openDownloadStream(policy.configFileId);
                const bufferArray = [];
                for await (const data of fileStream) {
                    bufferArray.push(data);
                }
                const buffer = Buffer.concat(bufferArray);
                policy.config = JSON.parse(buffer.toString());
            }

            if (!policy.config) {
                continue;
            }

            let hash: string = null;
            let hashMap: string = null;
            try {
                //Policy
                const compareModel = new PolicyModel(policy, HashComparator.options);

                //Schemas
                const schemas = schemaCollection.find(
                    { topicId: policy.topicId },
                    { session: this.ctx }
                );

                const schemaModels: SchemaModel[] = [];
                while (await schemas.hasNext()) {
                    const schema = await schemas.next() as any;
                    if (schema.documentFileId) {
                        const fileStream = gridFS.openDownloadStream(schema.documentFileId);
                        const bufferArray = [];
                        for await (const data of fileStream) {
                            bufferArray.push(data);
                        }
                        const buffer = Buffer.concat(bufferArray);
                        schema.document = JSON.parse(buffer.toString());
                    }

                    const m = new SchemaModel(schema, HashComparator.options);
                    m.setPolicy(policy);
                    m.update(HashComparator.options);
                    schemaModels.push(m);
                }
                compareModel.setSchemas(schemaModels);

                //Tokens
                const tokensIds = compareModel.getAllProp<string>(PropertyType.Token)
                    .filter(t => t.value)
                    .map(t => t.value);

                const tokens = tokenCollection.find(
                    { tokenId: { $in: tokensIds } },
                    { session: this.ctx }
                );

                const tokenModels: TokenModel[] = [];
                while (await tokens.hasNext()) {
                    const token = await tokens.next() as any;
                    const t = new TokenModel(token, HashComparator.options);
                    t.update(HashComparator.options);
                    tokenModels.push(t);
                }
                compareModel.setTokens(tokenModels);

                //Artifacts
                const files = artifactCollection.find(
                    { policyId: policy._id.toString() },
                    { session: this.ctx }
                );
                const artifactsModels: FileModel[] = [];
                while (await files.hasNext()) {
                    const file = await files.next() as any;
                    const buffers: Uint8Array[] = [];
                    const artifactChunks = artifactChunkCollection.find(
                        { uuid: file.uuid },
                        {
                            session: this.ctx
                        }
                    ).sort(
                        { 'number': 1 }
                    );
                    while (await artifactChunks.hasNext()) {
                        const item = await artifactChunks.next() as any;
                        buffers.push(item.data.buffer);
                    }
                    const data = buffers.length > 0 ? Buffer.concat(buffers) : Buffer.from('');
                    const f = new FileModel(file, data, HashComparator.options);
                    f.update(HashComparator.options);
                    artifactsModels.push(f);
                }
                compareModel.setArtifacts(artifactsModels);

                //Compare
                compareModel.update();

                hashMap = HashComparator.createTree(compareModel);
                hash = CompareUtils.sha256(JSON.stringify(hashMap));
            } catch (error) {
                hash = null;
                hashMap = null;
                console.error(error);
            }

            const hashMapFileId = await this.writeFile(gridFS, hashMap);

            await policyCollection.updateOne(
                { _id: policy._id },
                {
                    $set: {
                        'hash': hash,
                        'hashMapFileId': hashMapFileId
                    },
                },
                { session: this.ctx, upsert: false }
            );
        }
    }
}
