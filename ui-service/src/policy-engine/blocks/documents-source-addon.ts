import {SourceAddon} from '@policy-engine/helpers/decorators';

@SourceAddon({
    blockType: 'documentsSourceAddon'
})
export class DocumentsSourceAddon {
    getFromSource(filters) {
        return [];
    }
}
