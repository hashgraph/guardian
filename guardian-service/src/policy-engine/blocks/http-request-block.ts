import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ActionCallback } from '@policy-engine/helpers/decorators';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { IPolicyCalculateBlock, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';
import { PolicyUtils } from '@policy-engine/helpers/utils';

@BasicBlock({
    blockType: 'httpRequestBlock',
    commonBlock: false,
    about: {
        label: 'Request data',
        title: `Add 'Request Data' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: true
    }
})
export class HttpRequestBlock {

    /**
     * After init
     */
    public afterInit() {
        console.log('Request data block');
        console.log(this);
    }

    /**
     * Action callback
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ]
    })
    @CatchErrors()
    public async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);
        console.log(event, ref.options);

        try {
            event.data.data = event.data.data || {};
            ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
            ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
                documents: ExternalDocuments(event?.data?.data)
            }));
        } catch (error) {
            ref.error(PolicyUtils.getErrorMessage(error));
        }
    }

}
