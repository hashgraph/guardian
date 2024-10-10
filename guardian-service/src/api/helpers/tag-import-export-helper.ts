import { DatabaseServer, Tag } from '@guardian/common';
import { GenerateUUIDv4 } from '@guardian/interfaces';

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
