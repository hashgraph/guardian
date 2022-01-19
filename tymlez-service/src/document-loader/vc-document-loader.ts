import { DocumentLoader, IDocumentFormat } from 'vc-modules';

export class VCDocumentLoader extends DocumentLoader {
  private url: string;
  private context: string;
  private document: any;

  constructor(context: string, url: string) {
    super();
    this.context = context;
    this.url = url;
    console.log('url', this.url);
    this.document = {
      '@context': {
        '@version': 1.1,
        id: '@id',
        type: '@type',
        name: 'https://schema.org/name',
        description: 'https://schema.org/description',
        identifier: 'https://schema.org/identifier',
        MRV: {
          '@id': 'https://localhost/schema#MRV',
          '@context': {
            accountId: {
              '@id': 'https://www.schema.org/text',
            },
            date: {
              '@id': 'https://www.schema.org/text',
            },
            amount: {
              '@id': 'https://www.schema.org/amount',
            },
            period: {
              '@id': 'https://www.schema.org/text',
            },
          },
        },
        WipeData: {
          '@id': 'https://localhost/schema#WipeData',
          '@context': {
            accountId: {
              '@id': 'https://www.schema.org/text',
            },
            date: {
              '@id': 'https://www.schema.org/text',
            },
            amount: {
              '@id': 'https://www.schema.org/amount',
            },
          },
        },
      },
    };
  }

  public async has(iri: string): Promise<boolean> {
    return iri == this.context;
  }

  public async get(iri: string): Promise<IDocumentFormat> {
    if (iri == this.context) {
      return {
        documentUrl: iri,
        document: await this.getDocument(),
      };
    }
    throw new Error('IRI not found');
  }

  public setDocument(document: any): void {
    if (document) {
      this.document = document;
    }
  }

  public async getDocument(): Promise<any> {
    return this.document;
  }
}
