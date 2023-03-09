
import { schemasToContext as schemasToContextTransmute } from '@transmute/jsonld-schema';

// tslint:disable-next-line:completed-docs
export function schemasToContext(schemas: any[], contextSettings?: {
    // tslint:disable-next-line:completed-docs
    version?: number | undefined;
    // tslint:disable-next-line:completed-docs
    vocab?: string | undefined;
    // tslint:disable-next-line:completed-docs
    id?: string | undefined;
    // tslint:disable-next-line:completed-docs
    type?: string | undefined;
    // tslint:disable-next-line:completed-docs
    rootTerms?: any;
}): {
    // tslint:disable-next-line:completed-docs
    '@context': any;
} {
    const context = schemasToContextTransmute(schemas, contextSettings);
    let contextString = JSON.stringify(context) as string;
    contextString = contextString.replaceAll(
        `"@id":"https://www.schema.org/text"`,
        `"@type":"https://www.schema.org/text"`
    );
    return JSON.parse(contextString);
}