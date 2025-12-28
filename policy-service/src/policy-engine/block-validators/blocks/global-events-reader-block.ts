import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Global Events Reader Block
 */
export class GlobalEventsReaderBlock {
    public static readonly blockType: string = 'globalEventsReaderBlock';

    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);

            const options: any = ref.options ?? {};

            if (options.eventTopics) {
                if (!Array.isArray(options.eventTopics)) {
                    validator.addError('Option "eventTopics" must be an array');
                } else {
                    for (let i = 0; i < options.eventTopics.length; i++) {
                        const topic = options.eventTopics[i];
                        const topicId = topic?.topicId;

                        if (!topicId || typeof topicId !== 'string' || !topicId.trim()) {
                            validator.addError(`Option "eventTopics[${i}].topicId" is not set`);
                        }
                    }
                }
            }

            if (options.branches) {
                if (!Array.isArray(options.branches)) {
                    validator.addError('Option "branches" must be an array');
                } else {
                    const allowedTypes = ['vc', 'json', 'csv', 'text', 'any'];

                    for (let i = 0; i < options.branches.length; i++) {
                        const branch = options.branches[i];

                        const branchEvent = branch?.branchEvent;
                        if (!branchEvent || typeof branchEvent !== 'string' || !branchEvent.trim()) {
                            validator.addError(`Option "branches[${i}].branchEvent" is not set`);
                        }

                        const docType = branch?.documentType ?? 'vc';
                        if (typeof docType !== 'string' || !allowedTypes.includes(docType)) {
                            validator.addError(
                                `Option "branches[${i}].documentType" must be one of: ${allowedTypes.join(', ')}`
                            );
                        }

                        const schemaId = branch?.schema;
                        if (schemaId) {
                            validator.checkBlockError(
                                validator.validateSchemaVariable(`branches[${i}].schema`, schemaId, false)
                            );
                        }
                    }
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
