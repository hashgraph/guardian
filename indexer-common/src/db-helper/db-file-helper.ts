import { MikroORM, EntityRepository, EntityName, GetRepository } from "@mikro-orm/core";
import { MongoDriver, MongoEntityManager, MongoEntityRepository } from "@mikro-orm/mongodb";
import { GridFSBucket, ObjectId } from 'mongodb';

/**
 * Database helper
 */
export class FileHelper {
    /**
     * Grid FS
     */
    private gridFS: GridFSBucket;
    /**
     * Files
     */
    private files: Map<string, ObjectId>;

    constructor(gridFS: GridFSBucket) {
        this.gridFS = gridFS;
        this.files = new Map<string, ObjectId>();
    }

    public close(): void {
        this.gridFS = null;
        this.files.clear();
        this.files = null;
    }

    public async load(): Promise<void> {
        const files = this.gridFS.find({});
        while (await files.hasNext()) {
            const file = await files.next();
            this.files.set(file.filename, file._id)
        }
    }

    public async get(filename: string): Promise<string> {
        const fileId = this.files.get(filename);
        if (!fileId) {
            return null;
        }
        const fileStream = this.gridFS.openDownloadStream(fileId);
        const bufferArray = [];
        for await (const data of fileStream) {
            bufferArray.push(data);
        }
        const buffer = Buffer.concat(bufferArray);
        return buffer.toString();
    }
}
