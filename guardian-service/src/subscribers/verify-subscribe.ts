import { VcDocument } from '@entity/vc-document';
import { DocumentSignature, IVCDocument } from 'interfaces';
import { MongoRepository } from 'typeorm';
import { VCHelper } from 'vc-modules';

export class VerifySubscriber {
    private repository: MongoRepository<VcDocument>;
    private vc: VCHelper;

    constructor(repository: MongoRepository<VcDocument>, vc: VCHelper) {
        this.repository = repository;
        this.vc = vc;
    }

    public async on(items: IVCDocument | IVCDocument[]): Promise<void> {
        if (Array.isArray(items)) {
            for (let i = 0; i < items.length; i++) {
                await this.verify(items[i]);
            }
        } else {
            await this.verify(items);
        }
    }

    public async error(item: IVCDocument, error: Error): Promise<void> {
        console.log('VerifySubscriber', 'error');
        console.log(error);
    }

    public async verify(item: IVCDocument): Promise<void> {
        let verify: boolean;
        try {
            verify = await this.vc.verifyVC(item.document);
        } catch (error) {
            verify = false;
            this.error(item, error);
        }
        item.signature = verify ? DocumentSignature.VERIFIED : DocumentSignature.INVALID;
        await this.repository.save(item);
    }
}