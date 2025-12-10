import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
    BaseIntegrationService,
    ExecuteParams,
    MethodMap,
} from '../base-integration-service.js';
import { IntegrationDataTypes, ParseTypes } from '@guardian/interfaces';
import csvParse from 'papaparse';
import { fromArrayBuffer } from 'geotiff';

type ServiceConfig = {
    token?: string;
}

export class GlobalForestWatchService extends BaseIntegrationService {
    private readonly token: string;
    private readonly client: AxiosInstance;
    static readonly baseUrl: string = 'https://data-api.globalforestwatch.org';

    constructor({ token = process.env.GLOBAL_FOREST_WATCH_API_KEY || '' }: ServiceConfig = {}) {
        super();
        if (!token || token.length < 5) {
            throw new Error('API token is required.');
        }
        this.token = token;

        this.client = axios.create({
            baseURL: GlobalForestWatchService.baseUrl,
            headers: {
                'x-api-key': this.token
            },
        });
    }

    static override getBaseUrl(): string {
        return GlobalForestWatchService.baseUrl;
    }

    public async executeRequest<T = any, P = any>(
        methodName: string,
        params: ExecuteParams = {}
    ): Promise<{ data: T; type?: IntegrationDataTypes; parsedData: P }> {
        try {
            const method = GlobalForestWatchService.getAvailableMethods()[methodName];

            if (!method) {
                throw new Error(`Unsupported method: "${methodName}".`);
            }

            const dataForReq = GlobalForestWatchService.getDataForRequest(
                method,
                params,
            );

            if (!dataForReq.params) {
                dataForReq.params = {}
            }

            dataForReq.params['x-api-key'] = this.token;

            let parsedData = null;
            let result = null;
            let overrideType = null;

            if (method.type === IntegrationDataTypes.GEOTIFF) {
                const {
                    data: fullData,
                    parsedData: bbox,
                    type
                } = await this.getResponseDataFromGeoTiff(dataForReq, params);

                parsedData = bbox;
                result = fullData;
                overrideType = type;
            } else {
                const response = await this.client.request<T>(dataForReq);

                result = response.data;

                if (method.type === IntegrationDataTypes.CSV) {
                    result = csvParse.parse(result, {
                        header: true,
                        skipEmptyLines: true,
                        dynamicTyping: true,
                    }).data
                }
            }

            return {
                data: result,
                type: overrideType || method.type || IntegrationDataTypes.JSON,
                parsedData,
            };
        } catch (err) {
            console.error(err);
            throw err;
        }
    }

    private async getResponseDataFromGeoTiff(
        tiffDataForReq: AxiosRequestConfig,
        params: ExecuteParams = {}
    ): Promise<{
        data: any;
        parsedData: {
            bbox: number[];
        };
        type: IntegrationDataTypes;
    }> {
        const method = GlobalForestWatchService.getAvailableMethods().getAssets;

        const dataForReq = GlobalForestWatchService.getDataForRequest(
            method,
            {
                dataset: params.dataset,
                version: params.version,
                asset_type: 'Raster tile set',
            }
        );

        const response = await this.client.request<{ data: { asset_uri: string; asset_id: string; }[] }>(dataForReq);

        const assetId = response.data?.data?.find(({ asset_uri = '' }) => asset_uri.includes(`/${params.pixel_meaning}/`))?.asset_id;

        if (assetId) {
            const tilesMethod = GlobalForestWatchService.getAvailableMethods().getTilesInfoForAsset;

            const tilesDataForReq = GlobalForestWatchService.getDataForRequest(
                tilesMethod,
                {
                    asset_id: assetId,
                }
            );

            const tilesInfo = await this.client.request(tilesDataForReq);

            const tilesBbox = tilesInfo.data?.features?.find(({ properties }) => properties?.name?.includes(`/${params.tile_id}.tif`));

            if (tilesBbox?.properties?.extent?.length >= 4) {
                return {
                    data: tilesBbox,
                    parsedData: {
                        bbox: tilesBbox?.properties?.extent
                    },
                    type: IntegrationDataTypes.GEOJSON
                };
            }
        }

        const MAX_SIZE = 100 * 1024 * 1024; // bytes

        tiffDataForReq.responseType = 'arraybuffer';

        const bufferResponse = await this.client.request<Buffer>(tiffDataForReq);

        const buffer = bufferResponse.data;

        if (buffer.length > MAX_SIZE) {
            return {
                data: null,
                parsedData: {
                    bbox: null
                },
                type: IntegrationDataTypes.GEOJSON
            }
        }

        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
        const tiff = await fromArrayBuffer(arrayBuffer);
        const image = await tiff.getImage();

        const resBbox = image.getBoundingBox();

        return {
            data: buffer,
            parsedData: {
                bbox: resBbox,
            },
            type: IntegrationDataTypes.GEOTIFF
        };
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
                description: 'Query (JSON) Execute a READ-ONLY SQL query on the given dataset version',
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
            queryDatasetJsonPost: {
                method: 'POST',
                endpoint: '/dataset/:dataset/:version/query/json',
                description: 'Query with geometry (JSON) Execute a READ-ONLY SQL query on the given dataset version',
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
                    body: {
                        sql: {
                            name: 'SQL',
                            value: 'sql',
                            required: true
                        },
                        geometry: {
                            name: 'Geometry (stringify object)',
                            value: 'geometry',
                            required: false,
                            parseType: ParseTypes.JSON,
                        },
                    }
                },
            },
            queryDatasetCsv: {
                method: 'GET',
                endpoint: '/dataset/:dataset/:version/query/csv',
                description: 'Query (CSV) Execute a READ-ONLY SQL query on the given dataset version',
                type: IntegrationDataTypes.CSV,
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
            queryDatasetCsvPost: {
                method: 'POST',
                endpoint: '/dataset/:dataset/:version/query/csv',
                description: 'Query with geometry (CSV) Execute a READ-ONLY SQL query on the given dataset version',
                type: IntegrationDataTypes.CSV,
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
                    body: {
                        sql: {
                            name: 'SQL',
                            value: 'sql',
                            required: true
                        },
                        geometry: {
                            name: 'Geometry (stringify object)',
                            value: 'geometry',
                            required: false,
                            parseType: ParseTypes.JSON,
                        },
                    }
                },
            },
            queryDatasetListPost: {
                method: 'POST',
                endpoint: '/dataset/:dataset/:version/query/batch',
                description: 'Query execute a READ-ONLY SQL query on the specified raster-based dataset version (batch)',
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
                    body: {
                        sql: {
                            name: 'SQL',
                            value: 'sql',
                            required: true
                        },
                        feature_collection: {
                            name: 'Feature collection (stringify object)',
                            value: 'feature_collection',
                            required: false,
                            parseType: ParseTypes.JSON,
                        },
                        uri: {
                            name: 'URI to a vector file in a variety of formats supported by Geopandas',
                            value: 'uri',
                            required: false,
                        },
                        geostore_ids: {
                            name: 'An inline list of ResourceWatch geostore ids',
                            value: 'geostore_ids',
                            required: false,
                            parseType: ParseTypes.JSON,
                        },
                        id_field: {
                            name: 'An inline list of ResourceWatch geostore ids',
                            value: 'id_field',
                            required: false,
                            parseType: ParseTypes.JSON,
                        },
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
            downloadJSON: {
                method: 'GET',
                endpoint: '/dataset/:dataset/:version/download/json',
                description: '(JSON) Execute a READ-ONLY SQL query on the given dataset version',
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
                        },
                    }
                },
            },
            downloadJSONPost: {
                method: 'POST',
                endpoint: '/dataset/:dataset/:version/download/json',
                description: 'With geometry (JSON) Execute a READ-ONLY SQL query on the given dataset version for datasets with (geo-)database tables',
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
                    body: {
                        sql: {
                            name: 'SQL',
                            value: 'sql',
                            required: true
                        },
                        geometry: {
                            name: 'Geometry (stringify object)',
                            value: 'geometry',
                            required: false,
                            parseType: ParseTypes.JSON,
                        },
                    }
                },
            },
            downloadCSV: {
                method: 'GET',
                endpoint: '/dataset/:dataset/:version/download/csv',
                description: '(CSV) Execute a READ-ONLY SQL query on the given dataset version',
                type: IntegrationDataTypes.CSV,
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
                        },
                    }
                },
            },
            downloadCsvPost: {
                method: 'POST',
                endpoint: '/dataset/:dataset/:version/download/csv',
                description: 'With geometry (CSV) Execute a READ-ONLY SQL query on the given dataset version for datasets with (geo-)database tables',
                type: IntegrationDataTypes.CSV,
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
                    body: {
                        sql: {
                            name: 'SQL',
                            value: 'sql',
                            required: true
                        },
                        geometry: {
                            name: 'Geometry (stringify object)',
                            value: 'geometry',
                            required: false,
                            parseType: ParseTypes.JSON,
                        },
                    }
                },
            },
            downloadCSVByAoi: {
                method: 'GET',
                endpoint: '/dataset/:dataset/:version/download_by_aoi/csv',
                description: 'Aoi (CSV) Execute a READ-ONLY SQL query on the given dataset version',
                type: IntegrationDataTypes.CSV,
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
                        aoi: {
                            name: '	GeostoreAreaOfInterest or AdminAreaOfInterest or Global or WdpaAreaOfInterest',
                            value: 'aoi',
                            required: true
                        },
                    }
                },
            },
            downloadJSONByAoi: {
                method: 'GET',
                endpoint: '/dataset/:dataset/:version/download_by_aoi/json',
                description: 'Aoi (JSON) Execute a READ-ONLY SQL query on the given dataset version',
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
                        aoi: {
                            name: '	GeostoreAreaOfInterest or AdminAreaOfInterest or Global or WdpaAreaOfInterest',
                            value: 'aoi',
                            required: true
                        },
                    }
                },
            },
            downloadGeoTiff: {
                method: 'GET',
                endpoint: '/dataset/:dataset/:version/download/geotiff',
                description: 'Get geotiff raster tile',
                type: IntegrationDataTypes.GEOTIFF,
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
                        grid: {
                            name: 'Grid',
                            value: 'grid',
                            required: true
                        },
                        tile_id: {
                            name: 'Tile ID',
                            value: 'tile_id',
                            required: true
                        },
                        pixel_meaning: {
                            name: 'Pixel meaning',
                            value: 'pixel_meaning',
                            required: true
                        }
                    }
                },
            },
        };
    }
}
