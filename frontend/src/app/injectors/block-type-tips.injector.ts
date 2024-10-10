import { InjectionToken } from '@angular/core';
import { BlockType } from '@guardian/interfaces';

export const BLOCK_TYPE_TIPS = new InjectionToken<{ [key: string]: string }>(
    'block-type-tips'
);

export const BLOCK_TYPE_TIPS_VALUE: any = {};
BLOCK_TYPE_TIPS_VALUE[BlockType.Container] =
    'A block which contains and organizes other blocks';
BLOCK_TYPE_TIPS_VALUE[BlockType.PolicyRoles] =
    'A block which determines a role for the user';
BLOCK_TYPE_TIPS_VALUE[BlockType.Step] =
    'Similar to the InterfaceContainerBlock, with the difference that it can only render a single child element';
BLOCK_TYPE_TIPS_VALUE[BlockType.Request] =
    'A type of the block which creates a form from the schema, and sends the document to the server';
BLOCK_TYPE_TIPS_VALUE[BlockType.SendToGuardian] =
    'A type of the block which can save a new or updated document';
BLOCK_TYPE_TIPS_VALUE[BlockType.ReassigningBlock] =
    'A block type which re-signs the document and change the user to document owner';
BLOCK_TYPE_TIPS_VALUE[BlockType.Information] =
    'A block type which can display a notification or a progress bar';
BLOCK_TYPE_TIPS_VALUE[BlockType.DocumentsViewer] =
    'A block type which outputs information from the DB as grid';
BLOCK_TYPE_TIPS_VALUE[BlockType.PaginationAddon] =
    'A block type which adds pagination to the InterfaceDocumentSourceBlock if added';
BLOCK_TYPE_TIPS_VALUE[BlockType.DocumentsSourceAddon] =
    'A block for searching VC, for grid';
BLOCK_TYPE_TIPS_VALUE[BlockType.FiltersAddon] =
    'A block for providing dynamic filters to DocumentsSourceAddOn Block';
BLOCK_TYPE_TIPS_VALUE[BlockType.Action] = 'A block to create custom actions';
BLOCK_TYPE_TIPS_VALUE[BlockType.ExternalData] =
    'Receives data from the external source and passes them over the the next block';
BLOCK_TYPE_TIPS_VALUE[BlockType.Wipe] = 'Wipe tokens';
BLOCK_TYPE_TIPS_VALUE[BlockType.Calculate] =
    'This Block accepts source VC as input and generates output as new VC document';
BLOCK_TYPE_TIPS_VALUE[BlockType.CalculateMathAddon] =
    'This Block performs mathematical calculations sequentially';
BLOCK_TYPE_TIPS_VALUE[BlockType.Report] = 'Displaying trustchain';
BLOCK_TYPE_TIPS_VALUE[BlockType.ReportItem] = 'Displaying trustchain item';
BLOCK_TYPE_TIPS_VALUE[BlockType.Switch] = 'Redirect flow control';
BLOCK_TYPE_TIPS_VALUE[BlockType.AggregateDocument] =
    'Aggregate input documents';
BLOCK_TYPE_TIPS_VALUE[BlockType.TimerBlock] = 'Timer in policy';
BLOCK_TYPE_TIPS_VALUE[BlockType.RevokeBlock] =
    'This block finds related messages in policy topics, and revokes those messages and sends it to Hedera topic, but it doesn’t save documents in DB';
BLOCK_TYPE_TIPS_VALUE[BlockType.RevocationBlock] =
    'This block finds related messages in policy topics, and revokes those messages and sends it to Hedera topic, but it doesn’t save documents in DB';
BLOCK_TYPE_TIPS_VALUE[BlockType.SetRelationshipsBlock] =
    'This block contains DocumentsSourceAddOn and set relationships for input document from DocumentsSourceAddOn documents (messageId’s)';
BLOCK_TYPE_TIPS_VALUE[BlockType.ButtonBlock] = 'Displaying control buttons';
BLOCK_TYPE_TIPS_VALUE[BlockType.DocumentValidatorBlock] =
    'This block is to validate documents, including linked documents';
BLOCK_TYPE_TIPS_VALUE[BlockType.TokenActionBlock] =
    'This block is responsible in performing automatic actions on the token';
BLOCK_TYPE_TIPS_VALUE[BlockType.TokenConfirmationBlock] =
    'This block enables the owner of the private key for the account to manually perform operations with the token, including those not available in the ‘tokenActionBlock’';
BLOCK_TYPE_TIPS_VALUE[BlockType.Mint] =
    'This block is responsible for adding configurations on calculating the amount of tokens to be minted';
BLOCK_TYPE_TIPS_VALUE[BlockType.GroupManagerBlock] =
    'This block allows to manage group membership, add and remove users from the group';
BLOCK_TYPE_TIPS_VALUE[BlockType.MultiSignBlock] =
    'This block provides a way to specify multiple signators for a single VC document, and then create a VP based on it';
BLOCK_TYPE_TIPS_VALUE[BlockType.CustomLogicBlock] =
    'Implements custom logic in policy';
BLOCK_TYPE_TIPS_VALUE[BlockType.SplitBlock] =
    'This block allows to accumulate VC documents and produce new VCs in fixed chunks';
BLOCK_TYPE_TIPS_VALUE[BlockType.CreateToken] =
    'A type of the block which creates a form from the schema, and sends the document to the server';
BLOCK_TYPE_TIPS_VALUE[BlockType.ImpactAddon] =
    'This Addon for the mint block which allows to add additional info for the token being created';
BLOCK_TYPE_TIPS_VALUE[BlockType.HttpRequest] =
    'Block for retrieving information from outside (3rd party) services via HTTP requests';
BLOCK_TYPE_TIPS_VALUE[BlockType.HistoryAddon] =
    'This block turn on history on interfaceDocumentsSourceBlock';
BLOCK_TYPE_TIPS_VALUE[BlockType.SelectiveAttributes] =
    'This will filter attributes (option field) in documents returned by documentsSourceAddon.';
BLOCK_TYPE_TIPS_VALUE[BlockType.TagsManager] =
    'Block tagsManager is responsible for managing tags in policies';
BLOCK_TYPE_TIPS_VALUE[BlockType.ExternalTopic] =
    'This block allows to configure the link to Hedera topics established by other policy instances for monitoring of ‘document published’ messages and ingestion of the targeted VC documents';
