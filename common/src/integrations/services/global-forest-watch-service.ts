import axios, { AxiosInstance } from 'axios';
import {
  BaseIntegrationService,
  ExecuteParams,
  MethodMap
} from '../base-integration-service.js';

type ServiceConfig = {
  token?: string;
}

export class GlobalForestWatchService extends BaseIntegrationService {
  // private readonly token: string;
  private readonly client: AxiosInstance;
  static readonly baseUrl: string = 'https://data-api.globalforestwatch.org';

  constructor({ token = process.env.GLOBAL_FOREST_WATCH_TOKEN || '' }: ServiceConfig = {}) {
    super();
    // if (!token || token.length < 5) {
    //   throw new Error('API token is required.');
    // }
    // this.token = token;

    this.client = axios.create({
      baseURL: GlobalForestWatchService.baseUrl,
      // headers: {
      //   'Content-Type': 'application/json',
      //   Authorization: `Bearer ${this.token}`,
      // },
    });
  }

  static override getBaseUrl(): string {
    return GlobalForestWatchService.baseUrl;
  }

  public async executeRequest<T = any>(
    methodName: string,
    params: ExecuteParams = {}
  ): Promise<{ data: T }> {
    try {
      const method = GlobalForestWatchService.getAvailableMethods()[methodName];

      if (!method) {
        throw new Error(`Unsupported method: "${methodName}".`);
      }

      const response = await this.client.request<T>(GlobalForestWatchService.getDataForRequest(
        method,
        params,
      ));

      return {
        data: response.data
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
      getDatasets: {
        method: 'GET',
        endpoint: '/datasets',
        description: 'Get list of all datasets',
        parameters: {
          query: {
            'page[size]': {
              name: 'Items count',
              value: 'page[size]',
              required: false,
            },
          }
        }
      },
      getDatasetById: {
        method: 'GET',
        endpoint: '/dataset/:dataset',
        description: 'Get basic metadata and available versions for a given dataset',
        parameters: {
          path: {
            dataset: {
              name: 'Dataset',
              value: 'dataset',
              required: true,
            }
          },
        },
      },
      getVersion: {
        method: 'GET',
        endpoint: '/dataset/:dataset/:version',
        description: 'Get basic metadata for a given version',
        parameters: {
          path: {
            dataset: {
              name: 'Dataset',
              value: 'dataset',
              required: true,
            },
            version: {
              name: 'Version',
              value: 'version',
              required: true,
            },
          },
        },
      },
      getChangeLog: {
        method: 'GET',
        endpoint: '/dataset/:dataset/:version/change_log',
        description: 'Get change log',
        parameters: {
          path: {
            dataset: {
              name: 'Dataset',
              value: 'dataset',
              required: true,
            },
            version: {
              name: 'Version',
              value: 'version',
              required: true,
            },
          },
        },
      },
      getCreationOptions: {
        method: 'GET',
        endpoint: '/dataset/:dataset/:version/creation_options',
        description: 'Get creation options',
        parameters: {
          path: {
            dataset: {
              name: 'Dataset',
              value: 'dataset',
              required: true,
            },
            version: {
              name: 'Version',
              value: 'version',
              required: true,
            },
          },
        },
      },
      getExtent: {
        method: 'GET',
        endpoint: '/dataset/:dataset/:version/extent',
        description: 'Get extent',
        parameters: {
          path: {
            dataset: {
              name: 'Dataset',
              value: 'dataset',
              required: true,
            },
            version: {
              name: 'Version',
              value: 'version',
              required: true,
            },
          },
        },
      },
      retrieveAssetStatistics: {
        method: 'GET',
        endpoint: '/dataset/:dataset/:version/stats',
        description: 'Retrieve Asset Statistics',
        parameters: {
          path: {
            dataset: {
              name: 'Dataset',
              value: 'dataset',
              required: true,
            },
            version: {
              name: 'Version',
              value: 'version',
              required: true,
            },
          },
        },
      },
      getFields: {
        method: 'GET',
        endpoint: '/dataset/:dataset/:version/fields',
        description: 'Get the fields of a version. For a version with a vector default asset',
        parameters: {
          path: {
            dataset: {
              name: 'Dataset',
              value: 'dataset',
              required: true,
            },
            version: {
              name: 'Version',
              value: 'version',
              required: true,
            },
          },
        },
      },
      getMetadata: {
        method: 'GET',
        endpoint: '/dataset/:dataset/:version/metadata',
        description: 'Get metadata record for a dataset version',
        parameters: {
          path: {
            dataset: {
              name: 'Dataset',
              value: 'dataset',
              required: true,
            },
            version: {
              name: 'Version',
              value: 'version',
              required: true,
            },
          },
          query: {
            include_dataset_metadata: {
              name: 'Include dataset metadata',
              value: 'include_dataset_metadata',
              required: false,
            }
          }
        },
      },
      getNasaViirsFireAlertsFeatures: {
        method: 'GET',
        endpoint: '/dataset/nasa_viirs_fire_alerts/:version/features',
        description: 'Get Nasa Viirs fire alerts features',
        parameters: {
          path: {
            version: {
              name: 'Version',
              value: 'version',
              required: true,
            }
          },
          query: {
            lat: {
              name: 'Latitude',
              value: 'lat',
              required: true,
            },
            lng: {
              name: 'Longitude',
              value: 'lng',
              required: true,
            },
            z: {
              name: 'Zoom level',
              value: 'z',
              required: true,
            },
            start_date: {
              name: 'Start date',
              value: 'start_date',
              required: false,
            },
            end_date: {
              name: 'End date',
              value: 'end_date',
              required: false,
            }
          },
        },
      },
      getFeatures: {
        method: 'GET',
        endpoint: '/dataset/:dataset/:version/features',
        description: 'Get features',
        parameters: {
          path: {
            dataset: {
              name: 'Dataset',
              value: 'dataset',
              required: true,
            },
            version: {
              name: 'Version',
              value: 'version',
              required: true,
            }
          },
          query: {
            lat: {
              name: 'Latitude',
              value: 'lat',
              required: true,
            },
            lng: {
              name: 'Longitude',
              value: 'lng',
              required: true,
            },
            z: {
              name: 'Zoom level',
              value: 'z',
              required: true,
            }
          },
        },
      },
      getVersionAssets: {
        method: 'GET',
        endpoint: '/dataset/:dataset/:version/assets',
        description: 'Get all assets for a given dataset version',
        parameters: {
          path: {
            dataset: {
              name: 'Dataset',
              value: 'dataset',
              required: true,
            },
            version: {
              name: 'Version',
              value: 'version',
              required: true,
            }
          },
          query: {
            asset_type: {
              name: 'Asset type',
              value: 'asset_type',
              required: false,
            },
            asset_uri: {
              name: 'Asset URI',
              value: 'asset_uri',
              required: false,
            },
            is_latest: {
              name: 'Is latest',
              value: 'is_latest',
              required: false,
            },
            is_default: {
              name: 'Is default',
              value: 'is_default',
              required: false,
            },
            'page[size]': {
              name: 'Items count',
              value: 'page[size]',
              required: false,
            },
          },
        },
      },
      getAssets: {
        method: 'GET',
        endpoint: '/assets',
        description: 'Get Assets',
        parameters: {
          query: {
            dataset: {
              name: 'Dataset',
              value: 'dataset',
              required: false,
            },
            version: {
              name: 'Version',
              value: 'version',
              required: false,
            },
            asset_type: {
              name: 'Asset type',
              value: 'asset_type',
              required: false,
            },
            asset_uri: {
              name: 'Asset URI',
              value: 'asset_uri',
              required: false,
            },
            is_latest: {
              name: 'Is latest',
              value: 'is_latest',
              required: false,
            },
            is_default: {
              name: 'Is default',
              value: 'is_default',
              required: false,
            },
            'page[size]': {
              name: 'Items count',
              value: 'page[size]',
              required: false,
            },
          },
        },
      },
      getAsset: {
        method: 'GET',
        endpoint: '/asset/:asset_id',
        description: 'Get asset',
        parameters: {
          path: {
            asset_id: {
              name: 'Asset ID',
              value: 'asset_id',
              required: true,
            }
          },
        },
      },
      getTasksForAsset: {
        method: 'GET',
        endpoint: '/asset/:asset_id/tasks',
        description: 'Get tasks for asset',
        parameters: {
          path: {
            asset_id: {
              name: 'Asset ID',
              value: 'asset_id',
              required: true,
            }
          },
          query: {
            'page[size]': {
              name: 'Items count',
              value: 'page[size]',
              required: false,
            }
          }
        },
      },
      getChangeLogForAsset: {
        method: 'GET',
        endpoint: '/asset/:asset_id/change_log',
        description: 'Get change log for asset',
        parameters: {
          path: {
            asset_id: {
              name: 'Asset ID',
              value: 'asset_id',
              required: true,
            }
          },
        },
      },
      getCreationOptionsForAsset: {
        method: 'GET',
        endpoint: '/asset/:asset_id/creation_options',
        description: 'Get creation options for asset',
        parameters: {
          path: {
            asset_id: {
              name: 'Asset ID',
              value: 'asset_id',
              required: true,
            }
          },
        },
      },
      getExtentForAsset: {
        method: 'GET',
        endpoint: '/asset/:asset_id/extent',
        description: 'Get extent for asset',
        parameters: {
          path: {
            asset_id: {
              name: 'Asset ID',
              value: 'asset_id',
              required: true,
            }
          },
        },
      },
      getTilesInfoForAsset: {
        method: 'GET',
        endpoint: '/asset/:asset_id/tiles_info',
        description: 'Get tiles info for asset',
        parameters: {
          path: {
            asset_id: {
              name: 'Asset ID',
              value: 'asset_id',
              required: true,
            }
          },
        },
      },
      getStats: {
        method: 'GET',
        endpoint: '/asset/:asset_id/stats',
        description: 'Get stats for asset',
        parameters: {
          path: {
            asset_id: {
              name: 'Asset ID',
              value: 'asset_id',
              required: true,
            }
          },
        },
      },
      getFieldsForAsset: {
        method: 'GET',
        endpoint: '/asset/:asset_id/fields',
        description: 'Get Fields for asset',
        parameters: {
          path: {
            asset_id: {
              name: 'Asset ID',
              value: 'asset_id',
              required: true,
            }
          },
        },
      },
      getFieldMetadataForAsset: {
        method: 'GET',
        endpoint: '/asset/:asset_id/fields/:field_name',
        description: 'Get field metadata for asset',
        parameters: {
          path: {
            asset_id: {
              name: 'Asset ID',
              value: 'asset_id',
              required: true,
            },
            field_name: {
              name: 'Field name',
              value: 'field_name',
              required: true,
            }
          },
        },
      },
      getMetadataForAsset: {
        method: 'GET',
        endpoint: '/asset/:asset_id/metadata',
        description: 'Get metadata for asset',
        parameters: {
          path: {
            asset_id: {
              name: 'Asset ID',
              value: 'asset_id',
              required: true,
            }
          },
        },
      },
      getGeostoreByVersion: {
        method: 'GET',
        endpoint: '/dataset/:dataset/:version/geostore/:geostore_id',
        description: 'Retrieve GeoJSON representation for a given geostore ID of a dataset version',
        parameters: {
          path: {
            dataset: {
              name: 'Dataset',
              value: 'dataset',
              required: true,
            },
            version: {
              name: 'Version',
              value: 'version',
              required: true,
            },
            geostore_id: {
              name: 'Geostore ID',
              value: 'geostore_id',
              required: true,
            }
          },
        },
      },
      getAnyGeostore: {
        method: 'GET',
        endpoint: '/geostore/:geostore_id',
        description: 'Retrieve GeoJSON representation for a given geostore ID of any dataset',
        parameters: {
          path: {
            geostore_id: {
              name: 'Geostore ID',
              value: 'geostore_id',
              required: true,
            }
          },
        },
      },
      queryDatasetJson: {
        method: 'GET',
        endpoint: '/dataset/:dataset/:version/query/json',
        description: 'Execute a READ-ONLY SQL query on the given dataset version',
        parameters: {
          path: {
            dataset: {
              name: 'Dataset',
              value: 'dataset',
              required: true,
            },
            version: {
              name: 'Version',
              value: 'version',
              required: true,
            }
          },
          query: {
            sql: {
              name: 'SQL',
              value: 'sql',
              required: true
            },
            geostore_id: {
              name: 'Geostore ID',
              value: 'geostore_id',
              required: false
            },
            geostore_origin: {
              name: 'Geostore origin',
              value: 'geostore_origin',
              required: false
            }
          }
        },
      },
      getSingleTask: {
        method: 'GET',
        endpoint: '/task/:task_id',
        description: 'Get single tasks by task ID',
        parameters: {
          path: {
            task_id: {
              name: 'Task ID',
              value: 'task_id',
              required: true,
            }
          },
        },
      },
    };
  }
}
