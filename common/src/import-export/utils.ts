import { BlockType } from '@guardian/interfaces';
import { SchemaFields, TokenFields } from '../helpers/index.js';

interface IBlockConfig {
    blockType: string;
    children?: IBlockConfig[];
    messageId?: string;
    variables?: any[];
}

/**
 * Import\Export utils
 */
export class ImportExportUtils {
    /**
     * Find all tools
     * @param config
     */
    public static findAllTools(obj: IBlockConfig): string[] {
        const finder = (
            blockConfig: IBlockConfig,
            isRoot: boolean,
            results: Set<string>
        ): Set<string> => {
            if (blockConfig.blockType === BlockType.Tool && !isRoot) {
                if (blockConfig.messageId && typeof blockConfig.messageId === 'string') {
                    results.add(blockConfig.messageId);
                }
            } else if (Array.isArray(blockConfig.children)) {
                for (const child of blockConfig.children) {
                    finder(child, false, results);
                }
            }
            return results;
        }
        const map = finder(obj, true, new Set<string>());
        return Array.from(map);
    }

    /**
     * Find all schemas
     * @param config
     */
    public static findAllSchemas(obj: IBlockConfig): string[] {
        const finder = (
            blockConfig: IBlockConfig,
            results: Set<string>
        ): Set<string> => {
            if (
                blockConfig.blockType === BlockType.Tool ||
                blockConfig.blockType === BlockType.Module
            ) {
                if (Array.isArray(blockConfig.variables)) {
                    for (const variable of blockConfig.variables) {
                        if (
                            variable.type === 'Schema' &&
                            blockConfig[variable.name] &&
                            typeof blockConfig[variable.name] === 'string'
                        ) {
                            results.add(blockConfig[variable.name]);
                        }
                    }
                }
            } else {
                for (const name of SchemaFields) {
                    if (
                        blockConfig[name] &&
                        typeof blockConfig[name] === 'string'
                    ) {
                        results.add(blockConfig[name]);
                    }
                }
            }
            if (
                blockConfig.blockType !== BlockType.Tool &&
                Array.isArray(blockConfig.children)
            ) {
                for (const child of blockConfig.children) {
                    finder(child, results);
                }
            }
            return results;
        }
        const map = finder(obj, new Set<string>());
        return Array.from(map);
    }

    /**
     * Find all tokens
     * @param config
     */
    public static findAllTokens(obj: IBlockConfig): string[] {
        const finder = (
            blockConfig: IBlockConfig,
            results: Set<string>
        ): Set<string> => {
            if (
                blockConfig.blockType === BlockType.Tool ||
                blockConfig.blockType === BlockType.Module
            ) {
                if (Array.isArray(blockConfig.variables)) {
                    for (const variable of blockConfig.variables) {
                        if (
                            variable.type === 'Token' &&
                            blockConfig[variable.name] &&
                            typeof blockConfig[variable.name] === 'string'
                        ) {
                            results.add(blockConfig[variable.name]);
                        }
                    }
                }
            } else {
                for (const name of TokenFields) {
                    if (
                        blockConfig[name] &&
                        typeof blockConfig[name] === 'string'
                    ) {
                        results.add(blockConfig[name]);
                    }
                }
            }
            if (
                blockConfig.blockType !== BlockType.Tool &&
                Array.isArray(blockConfig.children)
            ) {
                for (const child of blockConfig.children) {
                    finder(child, results);
                }
            }
            return results;
        }
        const map = finder(obj, new Set<string>());
        return Array.from(map);
    }
}
