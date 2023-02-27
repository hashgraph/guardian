import { SourceAddon } from '@policy-engine/helpers/decorators';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';

/**
 * Selective Attributes
 */
@SourceAddon({
    blockType: 'selectiveAttributes',
    about: {
        label: 'Selective Attributes',
        title: `Add 'Selective Attributes' Addon`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false,
        properties: [{
            name: 'attributes',
            label: 'Attributes To Select',
            title: 'Attributes To Select',
            type: PropertyType.Array,
            items: {
                label: 'Attribute Path',
                value: '@attributePath',
                properties: [{
                    name: 'attributePath',
                    label: 'Attribute Path',
                    title: 'Attribute Path',
                    type: PropertyType.Input
                }]
            }
        }]
    }
})
export class SelectiveAttributes { }
