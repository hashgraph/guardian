// Vendored from @transmute/jsonld-schema (Apache-2.0)
// https://github.com/transmute-industries/verifiable-data/tree/main/packages/jsonld-schema

const embeddingAttributeNames = ['$comment', '$linkedData'];

const extractEmbedding = (embedding: any, attribute: string = '$comment'): any => {
    if (attribute === '$comment') {
        return JSON.parse(embedding[attribute]);
    }
    if (attribute === '$linkedData') {
        return embedding[attribute];
    }
    throw new Error('Cannot extract unsupported embedding: ' + attribute);
};

const defineAttributesFromLinkedData = (classProperties: any, linkedData: any, title: any, description: any): void => {
    if (classProperties[linkedData['@id']]) {
        classProperties[linkedData['@id']] = [
            ...classProperties[linkedData['@id']],
            { title, description, linkedData },
        ];
    } else {
        classProperties[linkedData['@id']] = [{ title, description, linkedData }];
    }
};

const handleClassEmbeddings = (file: any, intermediate: any, classEmbedding: string): any => {
    const embeddedLinkedDataClass = extractEmbedding(file, classEmbedding);
    if (!intermediate[embeddedLinkedDataClass['@id']]) {
        intermediate[embeddedLinkedDataClass['@id']] = {
            $id: file.$id,
            $schema: file.$schema,
            linkedData: embeddedLinkedDataClass,
            title: file.title,
            description: file.description,
            classProperties: {},
            schema: file,
        };
    }
    return embeddedLinkedDataClass;
};

const handlePropertyEmbeddings = (file: any, intermediate: any, classEmbedding: string, embeddedLinkedDataClass: any): void => {
    Object.values(file.properties).forEach((prop: any) => {
        embeddingAttributeNames.forEach((propertyEmbedding) => {
            if (prop[propertyEmbedding]) {
                // Use the property's own attribute; the @transmute original used the class's
                // and crashed on mixed embeddings. Same output for single-attribute schemas.
                const embeddedLinkedDataProperty = extractEmbedding(prop, propertyEmbedding);
                defineAttributesFromLinkedData(
                    intermediate[embeddedLinkedDataClass['@id']].classProperties,
                    embeddedLinkedDataProperty,
                    prop.title,
                    prop.description
                );
            }
        });
    });
};

const handleFileEmbeddings = (file: any, intermediate: any): void => {
    embeddingAttributeNames.forEach((classEmbedding) => {
        if (file[classEmbedding]) {
            const embeddedLinkedDataClass = handleClassEmbeddings(file, intermediate, classEmbedding);
            if (file.properties) {
                handlePropertyEmbeddings(file, intermediate, classEmbedding, embeddedLinkedDataClass);
            }
        }
    });
};

const schemasToIntermediate = (files: any[]): any => {
    const intermediate: any = {};
    files.forEach((file) => {
        handleFileEmbeddings(file, intermediate);
    });
    return intermediate;
};

const intermediateToPartialContext = (intermediate: any): any => {
    let partialContext: any = {};
    Object.values(intermediate).forEach((classDefinition: any) => {
        let propertDefinitionPartialContext: any = {};
        Object.values(classDefinition.classProperties).forEach((classPropertyArray: any) => {
            classPropertyArray.forEach((classProperty: any) => {
                propertDefinitionPartialContext = {
                    ...propertDefinitionPartialContext,
                    [classProperty.linkedData.term]: { '@id': classProperty.linkedData['@id'] },
                };
            });
        });
        partialContext = {
            ...partialContext,
            [classDefinition.linkedData.term]: {
                '@id': classDefinition.linkedData['@id'],
                '@context': { ...propertDefinitionPartialContext },
            },
        };
    });
    return partialContext;
};

export const schemasToContext = (
    schemas: any[],
    options: {
        version?: number;
        vocab?: string;
        id?: string;
        type?: string;
        rootTerms?: any;
    } = {}
): { '@context': any } => {
    const {
        version = 1.1,
        vocab = 'https://w3id.org/traceability/#undefinedTerm',
        id = '@id',
        type = '@type',
        rootTerms = {},
    } = options;

    const intermediate = schemasToIntermediate(schemas);
    const partialContext = intermediateToPartialContext(intermediate);

    return {
        '@context': {
            '@version': version,
            '@vocab': vocab,
            id,
            type,
            ...rootTerms,
            ...partialContext,
        },
    };
};
