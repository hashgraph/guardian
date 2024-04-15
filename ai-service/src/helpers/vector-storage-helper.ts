import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { FaissStore } from 'langchain/vectorstores/faiss';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Logger } from '@guardian/common';

export class VectorStorage {

    static async getVector(vectorPath: string) {
        const embeddings = new OpenAIEmbeddings();
        const vectorData = await FaissStore.load(vectorPath, embeddings);
        return vectorData;
    }

    static async create(docPath: string, vectorPath: string) {
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

                    new Logger().info('vector has been successfully created', ['AI_SERVICE']);
                } else {
                    new Logger().warn('there is no data for vector creation', ['AI_SERVICE']);
                }

            }
        } catch (e) {
            new Logger().error(e.message, ['AI_SERVICE']);
        }
    }
}
