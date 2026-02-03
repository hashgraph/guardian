import { LocationType } from '@guardian/interfaces';
import { SourceAddon } from '../helpers/decorators/index.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';

/**
 * History Addon
 */
@SourceAddon({
    blockType: 'historyAddon',
    actionType: LocationType.LOCAL,
    about: {
        label: 'History',
        title: `Add 'History' Addon`,
        post: false,
        get: false,
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
