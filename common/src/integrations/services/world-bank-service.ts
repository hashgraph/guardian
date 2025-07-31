import axios, { AxiosInstance } from 'axios';
import {
  BaseIntegrationService,
  ExecuteParams,
  MethodMap
} from '../base-integration-service.js';

type ServiceConfig = {
  token?: string;
}

export class WorldBankService extends BaseIntegrationService {
  private readonly client: AxiosInstance;
  static readonly baseUrl: string = 'https://api.worldbank.org';

  constructor(config: ServiceConfig = {}) {
    super();

    this.client = axios.create({
      baseURL: WorldBankService.baseUrl,
    });
  }

  static override getBaseUrl(): string {
    return WorldBankService.baseUrl;
  }

  public async executeRequest<T = any>(
    methodName: string,
    params: ExecuteParams = {}
  ): Promise<{ data: T }> {
    try {
      const method = WorldBankService.getAvailableMethods()[methodName];

      if (!method) {
        throw new Error(`Unsupported method: "${methodName}".`);
      }

      const dataForReq = WorldBankService.getDataForRequest(
        method,
        params,
      );

      dataForReq.params.format = 'json';

      const response = await this.client.request<T>(dataForReq);

      return {
        data: response.data,
      };
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  /**
   * Returns a map of all supported API methods for Global Forest Watch.
   */
  public static getAvailableMethods(): MethodMap {
    const queryForAll = {
      date: {
        name: 'Date or date range',
        value: 'date'
      },
      per_page: {
        name: 'Response items count',
        value: 'per_page'
      },
      mrv: {
        name: 'Most recent values based on the number specified',
        value: 'mrv'
      },
      mrnev: {
        name: 'Most recent non-empty values based on the number specified',
        value: 'mrnev'
      },
      gapfill: {
        name: 'Works with MRV. Fills values, if not available, by back tracking to the next available period',
        value: 'gapfill'
      },
      frequency: {
        name: 'works along with MRV. This query string is useful for querying high frequency data',
        value: 'frequency'
      },
      footnote: {
        name: 'For fetching footnote detail in data calls',
        value: 'footnote'
      },
    }

    return {
      getSources: {
        method: 'GET',
        endpoint: '/v2/sources',
        description: 'Get all sources (databases)',
        parameters: {
          query: queryForAll
        }
      },
      getSource: {
        method: 'GET',
        endpoint: '/v2/sources/:sourceId',
        description: 'Get metadata about specific source',
        parameters: {
          path: {
            sourceId: { name: 'Source ID', value: 'sourceId', required: true }
          },
          query: queryForAll
        }
      },
      getConcepts: {
        method: 'GET',
        endpoint: '/v2/sources/:sourceId/concepts',
        description: 'Get list of concepts/dimensions for a source',
        parameters: {
          path: {
            sourceId: { name: 'Source ID', value: 'sourceId', required: true }
          },
          query: queryForAll
        }
      },
      getConceptMetadata: {
        method: 'GET',
        endpoint: '/v2/sources/:sourceId/concepts/:conceptId/metadata',
        description: 'Get metadata (metatypes) for specific concept',
        parameters: {
          path: {
            sourceId: { name: 'Source ID', value: 'sourceId', required: true },
            conceptId: { name: 'Concept ID', value: 'conceptId', required: true }
          },
          query: queryForAll
        }
      },
      getMetadata: {
        method: 'GET',
        endpoint: '/v2/sources/:sourceId/:conceptId/:variableIds/metatypes/:metatypeId/metadata',
        description: 'Get metadata values for combinations of concept variables and metatypes',
        parameters: {
          path: {
            sourceId: { name: 'Source ID', value: 'sourceId', required: true },
            conceptId: { name: 'Concept ID', value: 'conceptId', required: true },
            variableIds: { name: 'Variable IDs (semicolon-separated)', value: 'variableIds', required: true },
            metatypeId: { name: 'Metatype ID (e.g. incomegroup)', value: 'metatypeId', required: true }
          },
          query: queryForAll
        }
      },
      searchMetadata: {
        method: 'GET',
        endpoint: '/v2/sources/:sourceId/search/:searchTerm',
        description: 'Search metadata by keyword',
        parameters: {
          path: {
            sourceId: { name: 'Source ID', value: 'sourceId', required: true },
            searchTerm: { name: 'Search term (URL-encoded)', value: 'searchTerm', required: true }
          },
          query: queryForAll
        }
      },
      getConceptForSource: {
        method: 'GET',
        endpoint: '/v2/sources/:sourceId/concepts/:conceptId/data',
        description: 'Retrieve list of concepts (dimensions) for a source',
        parameters: {
          path: {
            sourceId: { name:'Source ID', value: 'sourceId', required:true},
            conceptId: { name:'Concept ID', value: 'conceptId', required:true}
          },
          query: queryForAll
        }
      },
      getConceptVariables: {
        method: 'GET',
        endpoint: '/v2/sources/:sourceId/:conceptId/data',
        description: 'Retrieve variables within a concept (e.g. country codes for Country concept)',
        parameters: {
          path: {
            sourceId: { name:'Source ID', value: 'sourceId', required:true},
            conceptId: { name:'Concept ID', value: 'conceptId', required:true}
          },
          query: queryForAll
        }
      },
      getAdvancedData: {
        method: 'GET',
        endpoint: '/v2/sources/:sourceId/country/:country/series/:series/time/:time/version/:version/data',
        description: 'Retrieve data for a combination of concepts (source, country, series, time, version)',
        parameters: {
          path: {
            sourceId: { name:'Source ID', value: 'sourceId', required:true},
            country: { name:'Country code', value: 'country', required:true },
            series: { name:'Series code', value: 'series', required:true },
            time: { name:'Time period (e.g. yr1975 or all)', value: 'time', required:true },
            version: { name:'Version (e.g. 199704)', value: 'version', required:true }
          },
          query: queryForAll
        }
      },
      getAllTopics: {
        method: 'GET',
        endpoint: '/v2/topic',
        description: 'List all topics (high‑level indicator categories)',
        parameters: {
          query: queryForAll
        }
      },
      getTopicsById: {
        method: 'GET',
        endpoint: '/v2/topic/:topicIds',
        description: 'Get metadata about one or more topics',
        parameters: {
          path: {
            topicIds: {
              name: 'Topic ID(s), semicolon‑separated',
              value: 'topicIds',
              required: true
            }
          },
          query: queryForAll
        }
      },
      getIndicatorsByTopic: {
        method: 'GET',
        endpoint: '/v2/topic/:topicId/indicator',
        description: 'List all indicators under a given topic',
        parameters: {
          path: {
            topicId: {
              name: 'Topic ID',
              value: 'topicId',
              required: true
            }
          },
          query: queryForAll
        }
      },
      getAllIndicators: {
        method: 'GET',
        endpoint: '/v2/indicator',
        description: 'List all indicators (metadata: code, name, unit, topics, source, etc.)',
        parameters: {
          query: queryForAll
        }
      },
      getIndicatorById: {
        method: 'GET',
        endpoint: '/v2/indicator/:indicatorId',
        description: 'Get metadata about a specific indicator',
        parameters: {
          path: {
            indicatorId: { name: 'Indicator code (e.g. NY.GDP.MKTP.CD)', value: 'indicatorId', required: true }
          },
          query: queryForAll
        }
      },
      getAllCountries: {
        method: 'GET',
        endpoint: '/v2/country',
        description: 'List all countries and aggregates (regions, income levels, lending types)',
        parameters: {
          query: queryForAll
        }
      },
      getCountryByCode: {
        method: 'GET',
        endpoint: '/v2/country/:countryCode',
        description: 'Get detailed info about one country (incl. region, income level, capital, geo‑coords)',
        parameters: {
          path: {
            countryCode: {
              name: 'Two‑letter ISO code or aggregate code',
              value: 'countryCode',
              required: true
            }
          },
          query: queryForAll
        }
      },
      filterCountries: {
        method: 'GET',
        endpoint: '/v2/country',
        description: 'Filter countries by aggregates',
        parameters: {
          query: {
            ...queryForAll,
            region: { name: 'Region code (e.g. LCN)', value: 'region', required: false },
            incomeLevel: { name: 'Income level code (e.g. UMC)', value: 'incomeLevel', required: false },
            lendingType: { name: 'Lending type code (e.g. IBD)', value: 'lendingType', required: false },
          }
        }
      }
    }

  }
}
