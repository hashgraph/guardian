import { ModuleStatus, PolicyToolMetadata } from '@guardian/interfaces';
import { DatabaseServer, PolicyTool } from '@guardian/common';
import { ImportToolMap } from './tool-import.interface.js';

/**
 * Resolve user-provided tool messageId overrides against the local DB.
 *
 * For each tool whose messageId is remapped via `metadata.tools`, look up the
 * target tool locally (status `PUBLISHED`). Pre-resolved tools are returned
 * separately so callers can skip the IPFS round-trip in `importSubTools` —
 * which would otherwise fail the strict hash/owner equality check inside
 * `importToolByMessage` for tools the user has explicitly chosen.
 */
export async function resolveToolOverrides(
    tools: PolicyTool[],
    metadata: PolicyToolMetadata | null
): Promise<{
    toolsMapping: ImportToolMap[];
    preResolvedTools: PolicyTool[];
    toolsToImport: PolicyTool[];
}> {
    const toolsMapping: ImportToolMap[] = [];
    const preResolvedTools: PolicyTool[] = [];
    const toolsToImport: PolicyTool[] = [];
    const overrides: { tool: PolicyTool, overrideMessageId: string }[] = [];

    for (const tool of tools) {
        const overrideMessageId = metadata?.tools?.[tool.messageId];
        if (overrideMessageId && tool.messageId !== overrideMessageId) {
            overrides.push({ tool, overrideMessageId });
        } else {
            toolsToImport.push(tool);
        }
    }

    const localTools = overrides.length
        ? await DatabaseServer.getTools({
            messageId: { $in: overrides.map((o) => o.overrideMessageId) },
            status: ModuleStatus.PUBLISHED
        })
        : [];
    const localToolsByMessageId = new Map(localTools.map((t) => [t.messageId, t]));

    for (const { tool, overrideMessageId } of overrides) {
        toolsMapping.push({
            oldMessageId: tool.messageId,
            messageId: overrideMessageId,
            oldHash: tool.hash,
        });
        const localTool = localToolsByMessageId.get(overrideMessageId);
        if (localTool) {
            preResolvedTools.push(localTool);
        } else {
            tool.messageId = overrideMessageId;
            toolsToImport.push(tool);
        }
    }

    return { toolsMapping, preResolvedTools, toolsToImport };
}
