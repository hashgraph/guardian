import { ObjectId } from '@mikro-orm/mongodb';

export function extractTableFileIds(root: unknown): ObjectId[] {
    const uniqueIds = new Set<string>();

    const traverse = (node: unknown): void => {
        if (node === null || node === undefined) {
            return;
        }

        if (typeof node === 'string') {
            const stringValue = node.trim();
            if (stringValue && (stringValue.startsWith('{') || stringValue.startsWith('['))) {
                try {
                    traverse(JSON.parse(stringValue));
                } catch {
                    /* noop */
                }
            }
            return;
        }

        if (Array.isArray(node)) {
            for (const value of node) {
                traverse(value);
            }
            return;
        }

        if (typeof node === 'object') {
            const objectNode = node as Record<string, unknown>;

            if (
                String(objectNode.type || '').toLowerCase() === 'table' &&
                typeof objectNode.fileId === 'string' &&
                objectNode.fileId.trim()
            ) {
                uniqueIds.add(objectNode.fileId.trim());
            }

            for (const value of Object.values(objectNode)) {
                traverse(value);
            }
        }
    };

    traverse(root);

    return Array.from(uniqueIds).map((id) => new ObjectId(String(id)));
}
