import { Schema } from '@guardian/interfaces';
import { BlockValidator, IBlockProp } from '../index.js';
import { CommonBlock } from './common.js';
import { MathEngine, Code } from '../../helpers/math-model/index.js';
import { FieldLink } from '../../helpers/math-model/field-link.js';
import { IFieldNode, ISchema, Schema, SchemaField } from '@guardian/interfaces';

type MathPathType = 'inputs' | 'outputs';

interface MathPathIssue {
    type: MathPathType;
    schema: string;
    path: string;
}

/**
 * Math block
 */
export class MathBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'mathBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);

            const inputSchemaError = validator.validateSchemaVariable('inputSchema', ref.options.inputSchema, true);
            if (inputSchemaError) {
                validator.addError(inputSchemaError);
                return;
            }

            const inputSchema = validator.getSchema(ref.options.inputSchema);
            if (!inputSchema) {
                validator.addError(`Schema with id "${ref.options.inputSchema}" does not exist`);
                return;
            }

            if (ref.options.outputSchema) {
                const outputSchemaError = validator.validateSchemaVariable('outputSchema', ref.options.outputSchema, true);
                if (outputSchemaError) {
                    validator.addError(outputSchemaError);
                    return;
                }

                const outputSchema = validator.getSchema(ref.options.outputSchema);
                if (!outputSchema) {
                    validator.addError(`Schema with id "${ref.options.outputSchema}" does not exist`);
                    return;
                }
            }

            if (!ref.options.expression) {
                validator.addError('Option "expression" is not set');
                return;
            }

            const group = MathEngine.from(ref.options.expression);
            const groupError = group.validate();
            if (groupError) {
                validator.addError('Option "expression" is incorrect');
                return;
            }

            const tableOutputSchema = validator.getSchema(ref.options.outputSchema || ref.options.inputSchema);
            const schema = new Schema(tableOutputSchema);
            for (const link of group.outputs.getItems()) {
                if (!link.isTable) {
                    continue;
                }
                const columns = schema.getField(link.path)?.tableColumns;
                if (!Array.isArray(columns) || !columns.length) {
                    validator.addError(`Table output "${link.path}" has no declared columns`);
                    return;
                }
                const unknown = link.getUnknownColumns(columns.map((column) => column.key));
                if (unknown.length) {
                    validator.addError(`Table output "${link.path}" has unknown columns: ${unknown.join(', ')}`);
                    return;
                }
            }

            const pathErrors = MathBlock.validateSchemaPaths(
                validator,
                group,
                ref.options.inputSchema,
                ref.options.outputSchema
            );
            for (const pathError of pathErrors) {
                validator.addError(pathError);
            }
            if (pathErrors.length) {
                return;
            }

            const code = Code.from(ref.options.expression);
            if (code) {
                const codeError = code.validate();
                if (codeError) {
                    validator.addError('Option "expression" is incorrect');
                    return;
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }

    private static validateSchemaPaths(
        validator: BlockValidator,
        group: MathEngine,
        inputSchemaId: string,
        outputSchemaId?: string
    ): string[] {
        const issues: MathPathIssue[] = [];
        const schemaMaps = new Map<string, Map<string, IFieldNode>>();

        for (const variable of group.variables.getItems()) {
            const schemaId = variable.schema || inputSchemaId;
            if (MathBlock.hasMissingPath(validator, schemaMaps, schemaId, variable, true)) {
                issues.push({
                    type: 'inputs',
                    schema: schemaId,
                    path: variable.path
                });
            }
        }

        if (outputSchemaId) {
            for (const output of group.outputs.getItems()) {
                if (MathBlock.hasMissingPath(validator, schemaMaps, outputSchemaId, output, false)) {
                    issues.push({
                        type: 'outputs',
                        schema: outputSchemaId,
                        path: output.path
                    });
                }
            }
        }

        return MathBlock.formatPathIssues(issues);
    }

    private static hasMissingPath(
        validator: BlockValidator,
        schemaMaps: Map<string, Map<string, IFieldNode>>,
        schemaId: string,
        item: FieldLink,
        includeTableColumns: boolean
    ): boolean {
        if (!item.path) {
            return false;
        }
        const fieldMap = MathBlock.getFieldMap(validator, schemaMaps, schemaId, includeTableColumns);
        return !fieldMap || !fieldMap.has(item.path);
    }

    private static getFieldMap(
        validator: BlockValidator,
        schemaMaps: Map<string, Map<string, IFieldNode>>,
        schemaId: string,
        includeTableColumns: boolean
    ): Map<string, IFieldNode> | null {
        const cacheKey = `${includeTableColumns ? 'input' : 'output'}:${schemaId}`;
        if (schemaMaps.has(cacheKey)) {
            return schemaMaps.get(cacheKey);
        }

        const schema = validator.getSchema(schemaId);
        if (!schema) {
            return null;
        }

        const fields = MathBlock.getSchemaFields(schema, includeTableColumns);
        const map = MathBlock.createFieldMap(fields, new Map<string, IFieldNode>());
        schemaMaps.set(cacheKey, map);
        return map;
    }

    private static getSchemaFields(schema: ISchema, includeTableColumns: boolean): IFieldNode[] {
        let fields: IFieldNode[] = [];
        if (schema.document) {
            fields = new Schema(schema).getDeepFields();
        } else if (Array.isArray((schema as any).fields)) {
            fields = MathBlock.createFieldNodes((schema as any).fields);
        }

        if (includeTableColumns) {
            MathBlock.addTableColumnFields(fields);
        }
        return fields;
    }

    private static createFieldNodes(
        fields: SchemaField[],
        parentPath: string = '',
        parentArrayLvl: number = 0
    ): IFieldNode[] {
        if (!Array.isArray(fields)) {
            return [];
        }
        return fields.map((field) => {
            const arrayLvl = parentArrayLvl + (field.isArray ? 1 : 0);
            const path = parentPath + field.name;
            const node: IFieldNode = {
                path,
                arrayLvl,
                type: (field.isRef ? 'object' : (field.type || 'Help Text')) + '[]'.repeat(arrayLvl),
                field,
                fields: []
            };
            node.fields = MathBlock.createFieldNodes(field.fields, `${path}.`, arrayLvl);
            return node;
        });
    }

    private static addTableColumnFields(fields: IFieldNode[]): void {
        for (const node of fields) {
            MathBlock.addTableColumnFields(node.fields);
            const columns = node.field.customType === 'table' && Array.isArray(node.field.tableColumns)
                ? node.field.tableColumns
                : [];
            for (const column of columns) {
                if (!column?.key || !column?.name) {
                    continue;
                }
                node.fields.push({
                    path: `${node.path}.${column.key}`,
                    arrayLvl: node.arrayLvl + 1,
                    type: 'string[]',
                    field: {
                        ...node.field,
                        name: column.key,
                        description: column.name,
                        isArray: true,
                        isRef: false,
                        type: 'string',
                        customType: '',
                        fields: [],
                        tableColumns: undefined
                    },
                    fields: []
                });
            }
        }
    }

    private static createFieldMap(
        fields: IFieldNode[],
        map: Map<string, IFieldNode>
    ): Map<string, IFieldNode> {
        if (Array.isArray(fields)) {
            for (const field of fields) {
                map.set(String(field.path), field);
                MathBlock.createFieldMap(field.fields, map);
            }
        }
        return map;
    }

    private static formatPathIssues(issues: MathPathIssue[]): string[] {
        const groups = new Map<MathPathType, Map<string, MathPathIssue>>();
        for (const issue of issues) {
            if (!groups.has(issue.type)) {
                groups.set(issue.type, new Map<string, MathPathIssue>());
            }
            groups.get(issue.type).set(`${issue.schema}:${issue.path}`, issue);
        }

        const sections: string[] = [];
        for (const [type, groupedIssues] of groups) {
            const list = Array.from(groupedIssues.values());
            if (!list.length) {
                continue;
            }
            const hasMultipleSchemas = new Set(list.map((issue) => issue.schema)).size > 1;
            const examples = list
                .slice(0, 10)
                .map((issue) => hasMultipleSchemas && issue.schema ? `${issue.path} (${issue.schema})` : issue.path)
                .join(', ');
            const remaining = list.length > 10 ? `, and ${list.length - 10} more` : '';
            sections.push(`${type}: ${examples}${remaining}`);
        }
        if (!sections.length) {
            return [];
        }
        if (sections.length === 1) {
            return [
                `Path not found in schema for Math block ${sections[0]}. ` +
                'Review the Math block field paths and update references to existing schema fields.'
            ];
        }
        return [
            `Path not found in schema for Math block paths: ${sections.join('; ')}. ` +
            'Review the Math block field paths and update references to existing schema fields.'
        ];
    }
}
