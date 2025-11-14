import { OpenAIEmbeddings } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { DirectoryLoader } from '@langchain/classic/document_loaders/fs/directory';
import { TextLoader } from '@langchain/classic/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { PinoLogger } from '@guardian/common';

export class VectorStorage {

    static async getVector(vectorPath: string) {
        const embeddings = new OpenAIEmbeddings();
        const vectorData = await FaissStore.load(vectorPath, embeddings);
        return vectorData;
    }

    static async create(docPath: string, vectorPath: string, logger: PinoLogger): Promise<void> {
        try {
            if (docPath && vectorPath) {
                const textLoader = new DirectoryLoader(docPath, {
                    '.txt': (path) => new TextLoader(path),
                });

                const loadedDocuments = await textLoader.load();
                const splitter = new RecursiveCharacterTextSplitter({
                    chunkSize: 1000,
                    chunkOverlap: 50,
                });

                const documents = await splitter.splitDocuments(loadedDocuments);

                const embeddings = new OpenAIEmbeddings();
                if (documents?.length) {
                    const vectorstore = await FaissStore.fromDocuments(documents, embeddings);
                    await vectorstore.save(vectorPath);

                   await logger.info('vector has been successfully created', ['AI_SERVICE']);
                } else {
                   await logger.warn('there is no data for vector creation', ['AI_SERVICE']);
                }

            }
        } catch (e) {
           await logger.error(e.message, ['AI_SERVICE']);
        }
    }
}
