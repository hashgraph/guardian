import { DataBaseHelper } from '@indexer/common';

export async function loadFiles(ids: Set<string>, buffer: false): Promise<Map<string, string>>
export async function loadFiles(ids: Set<string>, buffer: true): Promise<Map<string, Buffer>>
export async function loadFiles(ids: Set<string>, buffer: boolean): Promise<Map<string, Buffer | string>> {
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

    if (buffer) {
        const result = new Map<string, Buffer>();
        for (const [filename, fileId] of fileMap.entries()) {
            try {
                const bufferArray = chunkMap.get(fileId);
                chunkMap.delete(fileId);
                if (bufferArray) {
                    result.set(filename, Buffer.concat(bufferArray as any));
                } else {
                    result.set(filename, null);
                }
            } catch (error) {
                result.set(filename, null);
            }

        }
        return result;
    } else {
        const result = new Map<string, string>();
        for (const [filename, fileId] of fileMap.entries()) {
            try {
                const bufferArray = chunkMap.get(fileId);
                if (bufferArray) {
                    result.set(filename, Buffer.concat(bufferArray as any).toString());
                } else {
                    result.set(filename, null);
                }
            } catch (error) {
                result.set(filename, null);
            }

        }
        return result;
    }
}

// export async function loadFiles<T extends string | Buffer>(ids: Set<string>): Promise<Map<string, T>> {
//     const fileMap = new Map<string, Buffer>();
//     const files = DataBaseHelper.gridFS.find();
//     while (await files.hasNext()) {
//         const file = await files.next();
//         if (fileIds.has(file.filename) && !fileMap.has(file.filename)) {
//             await safetyRunning(async () => {
//                 const fileStream = DataBaseHelper.gridFS.openDownloadStream(file._id);
//                 const bufferArray = [];
//                 for await (const data of fileStream) {
//                     bufferArray.push(data);
//                 }
//                 const buffer = Buffer.concat(bufferArray);
//                 fileMap.set(file.filename, buffer);
//             });
//         }
//     }
//     return fileMap;
// }