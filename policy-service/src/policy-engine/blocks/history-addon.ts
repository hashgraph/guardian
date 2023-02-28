import { SourceAddon } from '@policy-engine/helpers/decorators';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';

/**
 * History Addon
 */
@SourceAddon({
    blockType: 'historyAddon',
    about: {
        label: 'History',
        title: `Add 'History' Addon`,
        post: true,
        get: true,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false,
        properties: [{
            name: 'timelineLabelPath',
            label: 'Timeline Label Path',
            title: 'Timeline unit label path',
            type: PropertyType.Path,
            default: ''
        }, {
            name: 'timelineDescriptionPath',
            label: 'Timeline Description Path',
            title: 'Timeline unit description',
            type: PropertyType.Path,
            default: ''
        }]
    },
    variables: []
})
export class HistoryAddon { }
