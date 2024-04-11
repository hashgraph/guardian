import { ElasticDocument } from './elastic-document.interface';



export interface ElasticItem {
    index: string;
    document: ElasticDocument;
}
