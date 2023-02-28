import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Filters addon
 */
export class FiltersAddonBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'filtersAddon';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            if (!ref.options.type) {
                validator.addError('Option "type" does not set');
            } else {
                switch (ref.options.type) {
                    case 'dropdown':
                        break;
                    default:
                        validator.addError('Option "type" must be a "dropdown"');
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
