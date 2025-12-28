import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Global Events Writer Block
 */
export class GlobalEventsWriterBlock {
    public static readonly blockType: string = 'globalEventsWriterBlock';

    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);

            const topicIds = (ref.options as any)?.topicIds;
            if (!Array.isArray(topicIds)) {
                validator.addError('Option "topicIds" must be an array');
                return;
            }
            for (const item of topicIds) {
                const topicId = item?.topicId;
                if (!topicId || typeof topicId !== 'string' || !topicId.trim()) {
                    validator.addError('Option "topicId" is not set');
                }
                const docType = item?.documentType;
                if (!docType || typeof docType !== 'string') {
                    validator.addError('Option "documentType" is not set');
                } else {
                    const allowed = ['vc', 'json', 'csv', 'text', 'any'];
                    if (!allowed.includes(docType)) {
                        validator.addError('Option "documentType" must be one of: vc, json, csv, text, any');
                    }
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
