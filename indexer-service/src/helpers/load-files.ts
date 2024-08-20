import { DataBaseHelper } from "@indexer/common";

export async function loadFiles(ids: Set<string>): Promise<Map<string, string>> {
    const em = DataBaseHelper.getEntityManager();
    const chunksCollection = em.getCollection('fs.chunks');
    const filesCollection = em.getCollection('fs.files');

    const fileMap = new Map<string, string>();
    const chunkMap = new Map<string, Buffer[]>();

    const allFiles = filesCollection.find();
    while (await allFiles.hasNext()) {
        const file = await allFiles.next();
        if (ids.has(file.filename)) {
            const fileId = file._id.toString();
            fileMap.set(file.filename, fileId);
            chunkMap.set(fileId, []);
        }
    }

    const allChunks = chunksCollection.find();
    while (await allChunks.hasNext()) {
        const chunk = await allChunks.next();
        const fileId = chunk.files_id.toString();
        if (chunkMap.has(fileId)) {
            chunkMap.get(fileId)[chunk.n] = Buffer.from(chunk.data.toString('base64'), 'base64');
        }
    }

    const result = new Map<string, string>();
    for (const [filename, fileId] of fileMap.entries()) {
        try {
            const bufferArray = chunkMap.get(fileId);
            if (bufferArray) {
                const buffer = Buffer.concat(bufferArray);
                result.set(filename, buffer.toString());
            } else {
                result.set(filename, null);
            }
        } catch (error) {
            result.set(filename, null);
        }

    }
    return result;
}
