import { VcDocument } from '@entity/vc-document';
import { HcsVcMessage, HcsVcOperation } from 'did-sdk-js';
import { DocumentStatus } from 'interfaces';
import { MongoRepository } from 'typeorm';
import { IListener } from 'vc-modules';

export class VCSubscriber implements IListener<HcsVcMessage> {
    private repository: MongoRepository<VcDocument>;

    constructor(repository: MongoRepository<VcDocument>) {
        this.repository = repository;
    }

    public async on(topicId: string, message: HcsVcMessage): Promise<boolean> {
        console.log('VCSubscriber', 'on', topicId);

        const hash = message.getCredentialHash();
        const operation = message.getOperation();
        console.log(hash, operation);

        const vc = await this.repository.findOne({ where: { hash: { $eq: hash } } });
        if (vc) {
            const status = this.operation(operation);
            if (vc.status == status) {
                return false;
            }
            vc.status = status;
            console.log('Update status', vc.status);
            await this.repository.save(vc);
        }
        return true;
    }

    public async error(topicId: string, error: Error): Promise<boolean> {
        console.log('VCSubscriber', 'error', topicId);
        console.log(error);
        return true;
    }

    private operation(operation: HcsVcOperation) {
        switch (operation) {
            case HcsVcOperation.ISSUE:
                return DocumentStatus.ISSUE;
            case HcsVcOperation.RESUME:
                return DocumentStatus.RESUME;
            case HcsVcOperation.REVOKE:
                return DocumentStatus.REVOKE;
            case HcsVcOperation.SUSPEND:
                return DocumentStatus.SUSPEND;
            default:
                return DocumentStatus.NEW;
        }
    }
}