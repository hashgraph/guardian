import { DatabaseServer, IAuthUser, PolicyDiscussion, VcDocument } from "@guardian/common";

/**
 * Policy component utils
 */
export class PolicyCommentsUtils {
    public static async getCommonDiscussion(policyId: string, documentId: string) {
        try {
            const commonDiscussion = await DatabaseServer.getPolicyDiscussion({
                policyId,
                system: true,
                documentId
            })
            if (commonDiscussion) {
                return commonDiscussion;
            }
            return await DatabaseServer.createPolicyDiscussion({
                uuid: '',
                owner: '',
                creator: '',
                policyId,
                documentId,
                system: true,
                count: 0,
                name: 'Common',
                relationships: [documentId]
            });
        } catch (error) {
            return await DatabaseServer.getPolicyDiscussion({
                policyId,
                system: true,
                documentId
            })
        }
    }

    /**
     * Check access
     * @param discussion
     * @param userDID
     * @param userRole
     */
    public static accessDiscussion(
        discussion: PolicyDiscussion,
        userDID: string,
        userRole: string
    ): boolean {
        if (!discussion) {
            return false;
        }
        if (discussion.owner === userDID) {
            return true;
        }
        if (discussion.system) {
            return true;
        }
        if (discussion.visibility === 'public') {
            return true;
        }
        if (
            discussion.visibility === 'users' &&
            Array.isArray(discussion.users) &&
            discussion.users.includes(userDID)
        ) {
            return true;
        }
        if (
            discussion.visibility === 'roles' &&
            Array.isArray(discussion.roles) &&
            discussion.roles.includes(userRole)
        ) {
            return true;
        }
        return false;
    }

    public static async findDocumentSchemas(vc: VcDocument) {
        const schemaIds = new Set<string>();
        if (vc?.document?.credentialSubject) {
            if (Array.isArray(vc.document.credentialSubject)) {
                for (const subject of vc.document.credentialSubject) {
                    const schemaId = `#${subject.type}`;
                    schemaIds.add(schemaId)
                }
            } else {
                const subject: any = vc.document.credentialSubject;
                const schemaId = `#${subject.type}`;
                schemaIds.add(schemaId)
            }
        }
        const schemas = await DatabaseServer.getSchemas({
            iri: Array.from(schemaIds)
        });
        return schemas;
    }

    public static async findDocumentRelationships(vc: VcDocument) {
        const map = new Map<string, string>();
        if (vc.messageId) {
            map.set(vc.messageId, null);
        }
        if (Array.isArray(vc.relationships)) {
            for (const messageId of vc.relationships) {
                await PolicyCommentsUtils.findRelationships(vc.policyId, messageId, map);
            }
        }
        map.delete(vc.messageId);

        const relationships: any[] = [];
        for (const [messageId, schemaIRI] of map.entries()) {
            const schema = await DatabaseServer.getSchema({ iri: schemaIRI });
            if (schema) {
                relationships.push({
                    label: schema.name,
                    value: messageId
                })
            }
        }
        return relationships;
    }

    private static async findRelationships(policyId: string, messageId: string, map: Map<string, string>) {
        if (map.has(messageId)) {
            return;
        }
        const vc = await DatabaseServer.getVC({ policyId, messageId }, {
            fields: [
                'id',
                'policyId',
                'messageId',
                'relationships',
                'schema'
            ] as any
        });
        if (!vc) {
            return;
        }

        map.set(messageId, vc.schema);
        if (Array.isArray(vc.relationships)) {
            for (const messageId of vc.relationships) {
                await PolicyCommentsUtils.findRelationships(vc.policyId, messageId, map);
            }
        }
    }
}