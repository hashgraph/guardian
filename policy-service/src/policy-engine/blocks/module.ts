import { ContainerBlock } from '@policy-engine/helpers/decorators/container-block';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import { ActionCallback } from '@policy-engine/helpers/decorators';
import { IPolicyEvent } from '@policy-engine/interfaces';
import { PolicyInputEventType } from '@policy-engine/interfaces/policy-event-type';

/**
 * Container block with UI
 */
@ContainerBlock({
    blockType: 'module',
    commonBlock: false,
    about: {
        label: 'Module',
        title: `Add 'Module' Block`,
        post: false,
        get: true,
        children: ChildrenType.Any,
        control: ControlType.UI,
        input: null,
        output: null,
        defaultEvent: false
    }
})
export class ModuleBlock {
    /**
     * Input Events
     */
    public inputEvents: any[];
    /**
     * Output Events
     */
    public outputEvents: any[];

    /**
     * Init callback
     */
    beforeInit() {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        this.inputEvents = ref.options?.inputEvents || [];
        this.outputEvents = ref.options?.outputEvents || [];
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: IPolicyUser): Promise<any> {
        return {};
    }

    /**
     * Action callback
     * @event PolicyEventType.ModuleEvent
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        type: PolicyInputEventType.ModuleEvent
    })
    async onAction(event: IPolicyEvent<any>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        for (const e of this.inputEvents) {
            if (e.name === event.inputType) {
                ref.triggerEvents(e.name, event.user, event.data);
                return;
            }
        }
        for (const e of this.outputEvents) {
            if (e.name === event.inputType) {
                ref.triggerEvents(e.name, event.user, event.data);
                return;
            }
        }
    }
}
