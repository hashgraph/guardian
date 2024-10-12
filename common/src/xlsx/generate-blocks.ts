import { BlockType, GenerateUUIDv4, SchemaEntity } from '@guardian/interfaces';
import { XlsxResult } from './models/xlsx-result.js';
import { PolicyTool } from '../entity/index.js';
import { IBlock } from './interfaces/block-interface.js';
import { XlsxSchema } from './models/xlsx-schema.js';
import { Expression } from './models/expression.js';
import { TagIndexer } from './models/tag-indexer.js';
import * as formulajs from '@formulajs/formulajs'

/**
 * Generate policy config
 */
export class GenerateBlocks {
    /**
     * Generate policy config
     * @param xlsxResult
     */
    public static generate(xlsxResult: XlsxResult) {
        const config: IBlock = xlsxResult.policy?.config || {};
        const tags = new TagIndexer();
        const parent = GenerateBlocks.generateContainer(config, tags);
        GenerateBlocks.addPolicyTools(config, xlsxResult.tools, parent, tags);
        GenerateBlocks.generateRequests(xlsxResult.xlsxSchemas, parent, tags, xlsxResult);
    }

    /**
     * Add block
     * @param parent
     * @param block
     */
    private static pushBlock(parent: IBlock, block: IBlock) {
        if (Array.isArray(parent.children)) {
            parent.children.push(block);
        } else {
            parent.children = [block];
        }
    }

    /**
     * Add block
     * @param parent
     * @param block
     */
    private static unshiftBlock(parent: IBlock, block: IBlock) {
        if (Array.isArray(parent.children)) {
            parent.children.unshift(block);
        } else {
            parent.children = [block];
        }
    }

    /**
     * Generate block
     * @param config
     */
    private static generateBlock(config: any): IBlock {
        return {
            id: GenerateUUIDv4(),
            defaultActive: true,
            children: [],
            permissions: [],
            artifacts: [],
            ...config
        } as IBlock;
    }

    /**
     * Find tool ids
     * @param block
     * @param result
     */
    private static findTools(block: any, result: Set<string>) {
        if (!block) {
            return;
        }
        if (block.blockType === BlockType.Tool) {
            if (block.messageId && typeof block.messageId === 'string') {
                result.add(block.messageId);
            }
        } else {
            if (Array.isArray(block.children)) {
                for (const child of block.children) {
                    GenerateBlocks.findTools(child, result);
                }
            }
        }
    }

    /**
     * Generate Tool
     * @param policy
     * @param tools
     */
    private static addPolicyTools(
        config: IBlock,
        tools: PolicyTool[],
        parent: IBlock,
        tags: TagIndexer
    ): void {
        const toolIds = new Set<string>();
        GenerateBlocks.findTools(config, toolIds);
        for (const tool of tools) {
            if (!toolIds.has(tool.messageId)) {
                toolIds.add(tool.messageId);
                const block = GenerateBlocks.generateBlock({
                    tag: tags.getTag(BlockType.Tool, tool),
                    blockType: BlockType.Tool,
                    hash: tool.hash,
                    messageId: tool.messageId,
                    inputEvents: tool.config?.inputEvents,
                    outputEvents: tool.config?.outputEvents,
                    variables: tool.config?.variables,
                    innerEvents: [],
                    defaultActive: false
                })
                GenerateBlocks.pushBlock(parent, block);
            }
        }
    }

    /**
     * Generate Container
     * @param policy
     * @param schemas
     */
    private static generateContainer(
        config: IBlock,
        tags: TagIndexer
    ): IBlock {
        const parent = GenerateBlocks.generateBlock({
            tag: tags.getTag(BlockType.Container, null),
            blockType: BlockType.Container
        });
        GenerateBlocks.unshiftBlock(config, parent);
        return parent;
    }

    /**
     * Generate Requests
     * @param policy
     * @param schemas
     */
    private static generateRequests(
        schemas: XlsxSchema[],
        parent: IBlock,
        tags: TagIndexer,
        xlsxResult: XlsxResult
    ): void {
        for (const schema of schemas) {
            if (schema.entity === SchemaEntity.VC) {
                const requestContainer = GenerateBlocks.generateBlock({
                    tag: tags.getTag(BlockType.Container, schema),
                    blockType: BlockType.Container
                });
                GenerateBlocks.generateRequest(requestContainer, schema, tags);
                GenerateBlocks.generateCalculation(requestContainer, schema, tags, xlsxResult);
                GenerateBlocks.pushBlock(parent, requestContainer);
            }
        }
    }

    /**
     * Generate Request
     * @param parent
     * @param schema
     */
    private static generateRequest(
        parent: IBlock,
        schema: XlsxSchema,
        tags: TagIndexer
    ): void {
        const request = GenerateBlocks.generateBlock({
            tag: tags.getTag(BlockType.Request, schema),
            blockType: BlockType.Request,
            schema: schema.iri,
            idType: 'UUID',
            presetFields: []
        });
        GenerateBlocks.pushBlock(parent, request);
    }

    /**
     * Generate CustomLogicBlock
     * @param parent
     * @param schema
     */
    private static generateCalculation(
        parent: IBlock,
        schema: XlsxSchema,
        tags: TagIndexer,
        xlsxResult: XlsxResult
    ): void {
        const expression = GenerateBlocks.generateExpression(schema, xlsxResult);
        if (expression) {
            const calculation = GenerateBlocks.generateBlock({
                tag: tags.getTag(BlockType.CustomLogicBlock, schema),
                blockType: BlockType.CustomLogicBlock,
                expression,
                documentSigner: '',
                idType: 'UUID',
                outputSchema: schema.iri,
                defaultActive: false
            });
            GenerateBlocks.pushBlock(parent, calculation);
        }
    }

    /**
     * Generate Expression
     * @param schema
     */
    private static generateExpression(
        xlsxSchema: XlsxSchema,
        xlsxResult: XlsxResult
    ): string {
        //Create
        const expressions: Expression[] = [];
        for (const field of xlsxSchema.fields) {
            if (field.formulae) {
                expressions.push(new Expression(field.name, field.formulae));
            }
        }
        if (!expressions.length) {
            return null;
        }
        const paths = xlsxSchema.getVariables();

        //Parse
        for (const expression of expressions) {
            try {
                expression.parse();
                expression.validated = true;
            } catch (error) {
                expression.validated = false;
                xlsxResult.addError({
                    type: 'error',
                    text: `Failed to parse formula (${expression.name}=${expression.formulae}).`,
                    message: `Failed to parse formula (${expression.name}=${expression.formulae}).`,
                    worksheet: xlsxSchema.worksheet.name
                }, null);
            }
        }

        //Variables & Functions
        const variables = new Map<string, string>();
        const functions = new Map<string, string[]>();
        const ranges = new Map<string, string[]>();
        for (const expression of expressions) {
            if (expression.validated) {
                for (const name of expression.symbols) {
                    variables.set(name, null);
                }
                for (const [name, templates] of expression.functions) {
                    if (functions.has(name)) {
                        functions.set(name, [
                            ...functions.get(name),
                            ...templates
                        ]);
                    } else {
                        functions.set(name, [...templates]);
                    }
                }
                for (const [name, params] of expression.ranges) {
                    ranges.set(name, params);
                    for (const param of params) {
                        variables.set(param, null);
                    }
                }
            }
        }

        for (const name of variables.keys()) {
            if (paths.has(name)) {
                variables.set(name, paths.get(name));
            } else {
                xlsxResult.addError({
                    type: 'error',
                    text: `Variable ${name} is not defined.`,
                    message: `Variable ${name} is not defined.`,
                    worksheet: xlsxSchema.worksheet.name
                }, null);
            }
        }

        let body = '';
        body += `// Pre-defined variables\r\n`;
        body += `// - documents: VC[] - input documents;\r\n`;
        body += `// - user: User - current user;\r\n`;
        body += `// - artifacts: Artifact[] - related artifacts;\r\n`;
        body += `// - mathjs: Object - mathjs library;\r\n`;
        body += `// - formulajs: Object - formulajs library;\r\n`;
        body += `// - done(documents: VC[]): Function - completion of calculations;\r\n`;
        body += `\r\n`;

        body += `// Function to clear unset fields\r\n`;
        body += `function clearUnsetField(document, fieldName) {\r\n`;
        body += `    if(\r\n`;
        body += `        document[fieldName] === '' || \r\n`;
        body += `        document[fieldName] === null || \r\n`;
        body += `        document[fieldName] === undefined\r\n`;
        body += `    ) {\r\n`;
        body += `        delete document[fieldName];\r\n`;
        body += `    }\r\n`;
        body += `}\r\n`;
        body += `\r\n`;

        //Templates
        for (const [symbol, templates] of functions) {
            body += `// Template '${symbol}' function\r\n`;
            body += `// - arguments: any[]\r\n`;
            body += `function ${symbol}() {\r\n`;
            for (const template of templates) {
                body += `    // ${template}\r\n`;
            }
            if (typeof formulajs[symbol] === 'function') {
                body += `    return formulajs.${symbol}.apply(this, arguments);\r\n`;
            } else {
                body += `    // !Error: Unsupported function.\r\n`;
            }
            body += `}\r\n`;
            body += `\r\n`;
        }

        //Main
        body += `// Main function\r\n`;
        body += `// - document: VC - input VC document;\r\n`;
        body += `function main(document) {\r\n`;

        //Variables
        if (variables.size) {
            body += `    // Variables\r\n`;
        }
        for (const [symbol, path] of variables) {
            if (path) {
                body += `    let ${symbol} = document.${path};\r\n`;
            } else {
                body += `    // !Error: Variable "${symbol}" is not defined.\r\n`;
            }

        }
        body += `\r\n`;

        //Ranges
        if (ranges.size) {
            body += `    // Ranges\r\n`;
        }
        for (const [symbol, path] of ranges) {
            body += `    let ${symbol} = [${path.join(',')}];\r\n`;
        }
        body += `\r\n`;

        //Expressions
        body += `    // Expressions\r\n`;
        for (const expression of expressions) {
            body += `    // ${xlsxSchema.worksheet.name}: ${expression.name} = ${expression.formulae}\r\n`;
            if (expression.validated) {
                body += `    document.${expression.name} = ${expression.transformed};\r\n`;
                body += `    clearUnsetField(document, '${expression.name}');\r\n`;
            } else {
                body += `    // !Error: Failed to parse formula.\r\n`;
            }
            body += `\r\n`;
        }

        //Main
        body += `    // Result\r\n`;
        body += `    return document;\r\n`;
        body += `}\r\n`;
        body += `\r\n`;
        body += `(function calc() {\r\n`;
        body += `    return done(documents.map((document) =>\r\n`;
        body += `        main(document.document.credentialSubject[0])\r\n`;
        body += `    ));\r\n`;
        body += `})();`;

        return body;
    }
}
