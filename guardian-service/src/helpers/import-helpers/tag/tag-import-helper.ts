import { DatabaseServer, INotificationStep, IPolicyComponents, MessageAction, MessageServer, MessageType, Tag, TagMessage } from '@guardian/common';
import { GenerateUUIDv4, TagType } from '@guardian/interfaces';
import { ImportSchemaResult } from '../schema/schema-import.interface.js';

/**
 * Import tags
 * @param tags
 * @param map - Map<OldLocalId, NewLocalId> | NewLocalId
 */
export async function importTag(
    tags: Tag[],
    newIds?: Map<string, string> | string
): Promise<any> {
    const uuidMap: Map<string, string> = new Map();
    const newTags: any[] = [];
    if (newIds) {
        if (typeof newIds === 'string') {
            for (const tag of tags) {
                tag.localTarget = newIds;
                tag.target = null;
                newTags.push({ ...tag });
            }
        } else {
            for (const tag of tags) {
                if (tag.target && newIds.has(tag.target)) {
                    tag.localTarget = newIds.get(tag.target);
                    tag.target = null;
                    newTags.push({ ...tag });
                } else if (tag.localTarget && newIds.has(tag.localTarget)) {
                    tag.localTarget = newIds.get(tag.localTarget);
                    tag.target = null;
                    newTags.push({ ...tag });
                }
            }
        }
    }
    for (const tag of newTags) {
        delete tag._id;
        delete tag.id;
        if (tag.uuid) {
            if (uuidMap.has(tag.uuid)) {
                tag.uuid = uuidMap.get(tag.uuid);
            } else {
                uuidMap.set(tag.uuid, GenerateUUIDv4());
                tag.uuid = uuidMap.get(tag.uuid);
            }
        } else {
            tag.uuid = GenerateUUIDv4();
        }
        tag.status = 'History';
        tag.date = tag.date || (new Date()).toISOString();
        await DatabaseServer.createTag(tag);
    }
}

/**
 * Import tags by files
 * @param result
 * @param files
 * @param topicId
 */
export async function importTagsByFiles(
    result: ImportSchemaResult,
    files: Tag[],
    notifier: INotificationStep
): Promise<ImportSchemaResult> {
    const { schemasMap } = result;
    const idMap: Map<string, string> = new Map();
    for (const item of schemasMap) {
        idMap.set(item.oldID, item.newID);
        idMap.set(item.oldMessageID, item.newID);
    }
    await importTag(files, idMap);
    return result;
}

/**
 * Import tags by files
 * @param result
 * @param files
 * @param topicId
 */
export async function importPolicyTags(
    policyToImport: IPolicyComponents,
    messageId: string,
    policyTopicId: string,
    messageServer: MessageServer,
    userId: string | null
): Promise<IPolicyComponents> {
    const tagMessages = await messageServer
        .getMessages<TagMessage>(policyTopicId, userId, MessageType.Tag, MessageAction.PublishTag);
    if (!Array.isArray(policyToImport.tags)) {
        policyToImport.tags = [];
    }
    for (const tag of tagMessages) {
        if (tag.entity === TagType.Policy && tag.target !== messageId) {
            continue;
        }
        policyToImport.tags.push({
            uuid: tag.uuid,
            name: tag.name,
            description: tag.description,
            owner: tag.owner,
            entity: tag.entity,
            target: tag.target,
            status: 'History',
            topicId: tag.topicId,
            messageId: tag.id,
            date: tag.date,
            document: null,
            uri: null,
            id: null
        } as any);
    }
    return policyToImport;
}