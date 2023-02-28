import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Document source block with UI
 */
export class InterfaceDocumentsSource {
    /**
     * Block type
     */
    public static readonly blockType: string = 'interfaceDocumentsSourceBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            if (ref.options.uiMetaData) {
                if (Array.isArray(ref.options.uiMetaData.fields)) {
                    for (const tag of ref.options.uiMetaData.fields.map(i => i.bindBlock).filter(item => !!item)) {
                        if (validator.tagNotExist(tag)) {
                            validator.addError(`Tag "${tag}" does not exist`);
                        }
                    }
                }
                if (ref.options.uiMetaData.enableSorting) {
                    const sourceAddons = ref.children.filter(addon => {
                        return addon.blockType === 'documentsSourceAddon';
                    });
                    const sourceAddonType = sourceAddons[0].options.dataType;
                    if (sourceAddons.find(item => item.options.dataType !== sourceAddonType)) {
                        validator.addError(`There are different types in documentSourceAddon's`);
                    }
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
