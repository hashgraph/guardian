import axios, { AxiosInstance } from 'axios';
import {
  BaseIntegrationService,
  ExecuteParams,
  MethodMap
} from '../base-integration-service.js';

type ServiceConfig = {
  token?: string;
}

export class KanopioService extends BaseIntegrationService {
  private readonly token: string;
  private readonly client: AxiosInstance;
  static readonly baseUrl: string = 'https://main.api.kanop.io';

  constructor({ token = process.env.KANOP_IO_AUTH_TOKEN || '' }: ServiceConfig = {}) {
    super();
    if (!token || token.length < 5) {
      throw new Error('API token is required.');
    }
    this.token = token;

    this.client = axios.create({
      baseURL: KanopioService.baseUrl,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Accept-version': 'v1'
      },
    });
  }

  static override getBaseUrl(): string {
    return KanopioService.baseUrl;
  }

  public async executeRequest<T = any>(
    methodName: string,
    params: ExecuteParams = {}
  ): Promise<{ data: T }> {
    try {
      const method = KanopioService.getAvailableMethods()[methodName];

      if (!method) {
        throw new Error(`Unsupported method: "${methodName}".`);
      }

      const response = await this.client.request<T>(KanopioService.getDataForRequest(
        method,
        params,
      ));

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
    return {
      getProjects: {
        method: 'GET',
        endpoint: '/projects/',
        description: 'Get Projects'
      },
      getProject: {
        method: 'GET',
        endpoint: '/projects/:projectId',
        description: 'Get Project',
        parameters: {
          path: {
            projectId: {
              name: 'Project ID',
              value: 'projectId',
              required: true
            }
          }
        }
      },
      getProjectReferences: {
        method: 'GET',
        endpoint: '/projects/references',
        description: 'Get Project References'
      },
      getRequests: {
        method: 'GET',
        endpoint: '/projects/:projectId/requests',
        description: 'Get Requests',
        parameters: {
          path: {
            projectId: {
              name: 'Project ID',
              value: 'projectId',
              required: true
            }
          }
        }
      },
      getDataRequest: {
        method: 'GET',
        endpoint: '/projects/:projectId/requests/:requestId',
        description: 'Get Data Request',
        parameters: {
          path: {
            projectId: {
              name: 'Project ID',
              value: 'projectId',
              required: true
            },
            requestId: {
              name: 'Request ID',
              value: 'requestId',
              required: true
            }
          }
        }
      },
      getAvailableFilesForRequest: {
        method: 'GET',
        endpoint: '/projects/:projectId/requests/:requestId/gisFiles',
        description: 'Get Available Files For Request',
        parameters: {
          path: {
            projectId: {
              name: 'Project ID',
              value: 'projectId',
              required: true
            },
            requestId: {
              name: 'Request ID',
              value: 'requestId',
              required: true
            }
          }
        }
      },
      getSummaryMetricsForRequest: {
        method: 'GET',
        endpoint: '/projects/:projectId/requests/:requestId/metrics',
        description: 'Get Summary Metrics For Request',
        parameters: {
          path: {
            projectId: { name: 'Project ID', value: 'projectId', required: true },
            requestId: { name: 'Request ID', value: 'requestId', required: true }
          }
        }
      },
      getProjectIndicatorsForRequest: {
        method: 'GET',
        endpoint: '/projects/:projectId/requests/:requestId/metrics/:indicators',
        description: 'Get Project Indicators For Request',
        parameters: {
          path: {
            projectId: { name: 'Project ID', value: 'projectId', required: true },
            requestId: { name: 'Request ID', value: 'requestId', required: true },
            indicators: { name: 'Indicators', value: 'indicators', required: true }
          }
        }
      },
      getVariationGisFiles: {
        method: 'GET',
        endpoint: '/projects/:projectId/requests/:requestId/variationGisFiles',
        description: 'Get Variation Gis Files',
        parameters: {
          path: {
            projectId: { name: 'Project ID', value: 'projectId', required: true },
            requestId: { name: 'Request ID', value: 'requestId', required: true }
          }
        }
      },
      getChangeMetricForPolygon: {
        method: 'GET',
        endpoint: '/projects/:projectId/requests/:requestId/geoChange/:indicator',
        description: 'Get Change Metric For Polygon',
        parameters: {
          path: {
            projectId: { name: 'Project ID', value: 'projectId', required: true },
            requestId: { name: 'Request ID', value: 'requestId', required: true },
            indicator: { name: 'Indicator', value: 'indicator', required: true }
          }
        }
      },
      getStockMetricForPolygons: {
        method: 'GET',
        endpoint: '/projects/:projectId/requests/:requestId/geoMetrics/:indicator',
        description: 'Get Stock Metric For Polygons',
        parameters: {
          path: {
            projectId: { name: 'Project ID', value: 'projectId', required: true },
            requestId: { name: 'Request ID', value: 'requestId', required: true },
            indicator: { name: 'Indicator', value: 'indicator', required: true }
          }
        }
      },
      getPolygonsForProject: {
        method: 'GET',
        endpoint: '/projects/:projectId/polygons',
        description: 'Get Polygons For Project',
        parameters: {
          path: {
            projectId: { name: 'Project ID', value: 'projectId', required: true }
          }
        }
      },
      getAggregationLevelForProject: {
        method: 'GET',
        endpoint: '/projects/:projectId/aggregationLevels',
        description: 'Get Aggregation Level For Project',
        parameters: {
          path: {
            projectId: { name: 'Project ID', value: 'projectId', required: true }
          }
        }
      },
      getAggregationLevelValues: {
        method: 'GET',
        endpoint: '/projects/:projectId/aggregationLevels/:level',
        description: 'Get Aggregation Level Values',
        parameters: {
          path: {
            projectId: { name: 'Project ID', value: 'projectId', required: true },
            level: { name: 'Level', value: 'level', required: true }
          }
        }
      },
      getConfiguration: {
        method: 'GET',
        endpoint: '/projects/:projectId/configurations',
        description: 'Get Configuration',
        parameters: {
          path: {
            projectId: { name: 'Project ID', value: 'projectId', required: true }
          }
        }
      },
      getProjectTsEvolutionIndicators: {
        method: 'GET',
        endpoint: '/projects/:projectId/evolution/:indicators',
        description: 'Get Project Ts Evolution Indicators',
        parameters: {
          path: {
            projectId: { name: 'Project ID', value: 'projectId', required: true },
            indicators: { name: 'Indicators', value: 'indicators', required: true }
          }
        }
      },
      getProjectTsVariationIndicators: {
        method: 'GET',
        endpoint: '/projects/:projectId/variation/:indicators',
        description: 'Get Project Ts Variation Indicators',
        parameters: {
          path: {
            projectId: { name: 'Project ID', value: 'projectId', required: true },
            indicators: { name: 'Indicators', value: 'indicators', required: true }
          }
        }
      }
    }
  }
}
