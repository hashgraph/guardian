import { DidDocument } from '@entity/did-document';
import { DidMethodOperation, HcsDidMessage } from 'did-sdk-js';
import { DidDocumentStatus } from 'interfaces';
import { MongoRepository } from 'typeorm';
import { IListener } from 'vc-modules';

export class DIDSubscriber implements IListener<HcsDidMessage> {
    private repository: MongoRepository<DidDocument>;

    constructor(repository: MongoRepository<DidDocument>) {
        this.repository = repository;
    }

    public async on(topicId: string, message: HcsDidMessage): Promise<boolean> {
        console.log('DIDListener', 'on', topicId);

        const did = message.getDid();
        const operation = message.getOperation();

        console.log(did, operation);

        const item = await this.repository.findOne({ where: { did: { $eq: did } } });
        if (item) {
            const status = this.operation(operation);
            if (item.status == status) {
                return false;
            }
            item.status = status;
            await this.repository.save(item);
        }
        return true;
    }

    public async error(topicId: string, error: Error): Promise<boolean> {
        console.log('DIDListener', 'error', topicId);
        console.log(error);
        return true;
    }

    private operation(operation: DidMethodOperation) {
        switch (operation) {
            case DidMethodOperation.CREATE:
                return DidDocumentStatus.CREATE;
            case DidMethodOperation.DELETE:
                return DidDocumentStatus.DELETE;
            case DidMethodOperation.UPDATE:
                return DidDocumentStatus.UPDATE;
            default:
                return DidDocumentStatus.NEW;
        }
    }
}