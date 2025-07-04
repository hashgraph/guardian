import { ISchema, SchemaEntity } from '@guardian/interfaces';

/**
 * Schema converter utils
 */
export class SchemaConverterUtils {
    /**
     * Base version
     */
    public static readonly VERSION = '1.2.0';

    /**
     * Policy converter
     * @param policy
     * @constructor
     */
    public static SchemaConverter(schema: ISchema): ISchema {
        if (schema.codeVersion === SchemaConverterUtils.VERSION) {
            return schema;
        }
        schema.document = SchemaConverterUtils.DocumentConverter(
            schema.document,
            schema.codeVersion,
            schema.entity
        );
        schema.codeVersion = SchemaConverterUtils.VERSION;
        return schema;
    }

    /**
     * Compare versions
     * @param v1 First version
     * @param v2 Second Version
     */
    public static versionCompare(v1: string, v2: string) {
        if (!v2) {
            return 1;
        }
        const v1parts = v1.split('.').map((e) => parseInt(e, 10));
        const v2parts = v2.split('.').map((e) => parseInt(e, 10));
        for (let i = 0; i < v1parts.length; ++i) {
            if (v2parts.length === i) {
                return 1;
            }
            if (v1parts[i] === v2parts[i]) {
                continue;
            } else if (v1parts[i] > v2parts[i]) {
                return 1;
            } else {
                return -1;
            }
        }
        if (v1parts.length !== v2parts.length) {
            return -1;
        }
        return 0;
    }

    /**
     * Block converter
     * @param document
     * @private
     */
    private static DocumentConverter(
        document: any,
        schemaVersion: string,
        schemaEntity?: SchemaEntity,
    ): any {
        if (SchemaConverterUtils.versionCompare('1.1.0', schemaVersion) > 0) {
            document = SchemaConverterUtils.v1_1_0(document);
        }
        if (SchemaConverterUtils.versionCompare('1.2.0', schemaVersion) > 0) {
            document = SchemaConverterUtils.v1_2_0(document, schemaEntity);
        }
        return document;
    }

    /**
     * Create 1.1.0 version
     * @param document
     * @private
     */
    private static v1_1_0(document: any): any {
        if (!document.properties) {
            return document;
        }

        const fields = Object.keys(document.properties);
        for (const field of fields) {
            const properties = document.properties[field];
            if (properties.pattern === '^((https)://)?ipfs.io/ipfs/.+') {
                properties.pattern = '^ipfs://.+';
            } else if (
                properties.items &&
                properties.items.pattern === '^((https)://)?ipfs.io/ipfs/.+'
            ) {
                properties.items.pattern = '^ipfs://.+';
            }
        }

        return document;
    }

    /**
     * Create 1.2.0 version
     * @param document
     * @private
     */
    private static v1_2_0(document: any, schemaEntity?: SchemaEntity): any {
        if (!document.properties) {
            return document;
        }

        if (schemaEntity !== SchemaEntity.VC) {
            return document;
        }

        document.properties.guardianVersion = {
            '$comment': '{\"term\": \"guardianVersion\", \"@id\": \"https://www.schema.org/text\"}',
            'title': 'Guardian Version',
            'description': 'Guardian Version',
            'type': 'string',
            'readOnly': true
        };

        if (Array.isArray(document.required) && !document.required.includes('guardianVersion')) {
            // document.required.push('guardianVersion');
        }

        return document;
    }
}
