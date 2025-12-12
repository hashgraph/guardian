import { EventBlock } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import {
    IPolicyAddonBlock,
    IPolicyGetData,
    IPolicySourceBlock,
} from '../policy-engine.interface.js';
import {
    ChildrenType,
    ControlType,
    PropertyType,
} from '../interfaces/block-about.js';
import { PolicyUser } from '../policy-user.js';
import { findOptions } from '../helpers/find-options.js';
import { BlockActionError } from '../errors/index.js';
import { setOptions } from '../helpers/set-options.js';
import { LocationType } from '@guardian/interfaces';

/**
 * Dropdown with UI
 */
@EventBlock({
    blockType: 'dropdownBlockAddon',
    commonBlock: false,
    actionType: LocationType.REMOTE,
    about: {
        label: 'Dropdown',
        title: `Add 'Dropdown' Block`,
        post: true,
        get: true,
        children: ChildrenType.Special,
        control: ControlType.UI,
        input: null,
        output: null,
        defaultEvent: false,
        properties: [
            {
                name: 'optionName',
                label: 'Option Name',
                title: 'Option Name',
                type: PropertyType.Path,
                required: true,
            },
            {
                name: 'optionValue',
                label: 'Option Value',
                title: 'Option Value',
                type: PropertyType.Path,
                required: true,
            },
            {
                name: 'field',
                label: 'Field',
                title: 'Field',
                type: PropertyType.Path,
                required: true,
            },
        ],
    },
    variables: [],
})
export class DropdownBlockAddon {
    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);

        const documents: any[] = await ref.getSources(user, null);

        const data: IPolicyGetData = {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
            ...ref.options,
            documents: documents.map((e) => {
                return {
                    name: findOptions(e, ref.options.optionName),
                    optionValue: findOptions(e, ref.options.optionValue),
                    value: e.id,
                };
            }),
        };
        return data;
    }

    /**
     * Set block data
     * @param user
     * @param blockData
     */
    async setData(
        user: PolicyUser,
        blockData: {
            documentId: string;
            dropdownDocumentId: string;
        },
        _,
        actionStatus
    ): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const documents: any[] = await ref.getSources(user, null);
        const dropdownDocument = documents.find(
            // tslint:disable-next-line:no-shadowed-variable
            (document) => document.id === blockData.dropdownDocumentId
        );
        if (!dropdownDocument) {
            throw new BlockActionError(
                `Document doesn't exist in dropdown options`,
                ref.blockType,
                ref.uuid
            );
        }
        const parent = PolicyComponentsUtils.GetBlockRef<IPolicySourceBlock>(
            ref.parent
        );
        await parent.onAddonEvent(
            user,
            ref.tag,
            blockData.documentId,
            (document: any) => {
                document = setOptions(
                    document,
                    ref.options.field,
                    findOptions(dropdownDocument, ref.options.optionValue)
                );
                return {
                    data: document,
                };
            },
            actionStatus
        );
        ref.backup();
    }
}
