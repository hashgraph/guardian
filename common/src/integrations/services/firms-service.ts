import axios, { AxiosInstance } from 'axios';
import {
  BaseIntegrationService,
  ExecuteParams,
  MethodMap
} from '../base-integration-service.js';
import csvParse from 'papaparse';
import { IntegrationDataTypes } from '@guardian/interfaces';

type ServiceConfig = {
  token?: string;
}

export class FIRMSService extends BaseIntegrationService {
  static readonly secretTokenParamName = 'firm_map_key';
  private readonly token: string;
  private readonly client: AxiosInstance;
  static readonly baseUrl: string = 'https://firms.modaps.eosdis.nasa.gov';

  constructor({ token = process.env.FIRMS_AUTH_TOKEN || '' }: ServiceConfig = {}) {
    super();
    if (!token || token.length < 5) {
      throw new Error('API token is required.');
    }
    this.token = token;

    this.client = axios.create({
      baseURL: FIRMSService.baseUrl,
    });
  }

  static override getBaseUrl(): string {
    return FIRMSService.baseUrl;
  }

  public async executeRequest<T = any>(
    methodName: string,
    params: ExecuteParams = {}
  ): Promise<{ data: T; type: IntegrationDataTypes }> {
    try {
      const method = FIRMSService.getAvailableMethods()[methodName];

      if (!method) {
        throw new Error(`Unsupported method: "${methodName}".`);
      }

      const dataForReq = FIRMSService.getDataForRequest(
        method,
        params,
        false,
        FIRMSService.secretTokenParamName
      );

      dataForReq.url = dataForReq.url.replace(`:${FIRMSService.secretTokenParamName}`, this.token);

      const response = await this.client.request<T, { data: string }>(dataForReq);

      return {
        data: csvParse.parse(response.data, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        }).data,
        type: IntegrationDataTypes.CSV
      };
    } catch (err) {
      console.error(err);
      throw new Error('The firm is not working right now. Please try again later');
    }
  }

  /**
   * Returns a map of all supported API methods for Global Forest Watch.
   */
  public static getAvailableMethods(): MethodMap {
    return {
      getDataAvailability: {
        method: 'GET',
        endpoint: `/api/data_availability/csv/:${FIRMSService.secretTokenParamName}/:sensor`,
        description: 'Retrieve date range availability for a sensor dataset',
        parameters: {
          path: {
            sensor: {
              name: 'Sensor',
              value: 'sensor',
              required: true,
            }
          }
        }
      },
      getAreaData: {
        method: 'GET',
        endpoint: `/api/area/csv/:${FIRMSService.secretTokenParamName}/:source/:area_coordinates/:day_range`,
        description: 'Get fire detections for specified bounding box area',
        parameters: {
          path: {
            source: {
              name: 'Source',
              value: 'source',
              required: true,
            },
            area_coordinates: {
              name: 'Area coordinates',
              value: 'area_coordinates',
              required: true,
            },
            day_range: {
              name: 'Day range',
              value: 'day_range',
              required: true,
            }
          }
        }
      },
      getAreaDataWithDate: {
        method: 'GET',
        endpoint: `/api/area/csv/:${FIRMSService.secretTokenParamName}/:source/:area_coordinates/:day_range/:date`,
        description: 'Get fire detections for specified bounding box area with date',
        parameters: {
          path: {
            source: {
              name: 'Source',
              value: 'source',
              required: true,
            },
            area_coordinates: {
              name: 'Area coordinates',
              value: 'area_coordinates',
              required: true,
            },
            day_range: {
              name: 'Day range',
              value: 'day_range',
              required: true,
            },
            date: {
              name: 'Date',
              value: 'date',
              required: true,
            }
          }
        }
      },
      getCountryData: {
        method: 'GET',
        endpoint: `/api/country/csv/:${FIRMSService.secretTokenParamName}/:source/:country_code/:day_range`,
        description: 'Get fire detections for a specific country by ISO code',
        parameters: {
          path: {
            source: {
              name: 'Source',
              value: 'source',
              required: true,
            },
            country_code: {
              name: 'Country code',
              value: 'country_code',
              required: true,
            },
            day_range: {
              name: 'Day range',
              value: 'day_range',
              required: true,
            }
          }
        }
      },
      getCountryDataWithDate: {
        method: 'GET',
        endpoint: `/api/country/csv/:${FIRMSService.secretTokenParamName}/:source/:country_code/:day_range/:date`,
        description: 'Get fire detections for a specific country by ISO code with date',
        parameters: {
          path: {
            source: {
              name: 'Source',
              value: 'source',
              required: true,
            },
            country_code: {
              name: 'Country code',
              value: 'country_code',
              required: true,
            },
            day_range: {
              name: 'Day range',
              value: 'day_range',
              required: true,
            },
            date: {
              name: 'Date',
              value: 'date',
              required: true,
            }
          }
        }
      },
    }
  }
}
