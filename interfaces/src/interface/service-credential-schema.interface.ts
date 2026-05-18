import { IntegrationType } from '../type/integration-type.type.js';

/**
 * Service credential field
 */
export interface IServiceCredentialField {
    /**
     * Field identifier
     */
    name: string;
    /**
     * UI label
     */
    label: string;
    /**
     * Field type
     */
    type: 'string';
    /**
     * True if field value should always be masked in UI responses
     */
    secret: boolean;
}

/**
 * Service credential schema
 */
export interface IServiceCredentialSchema {
    /**
     * External service type
     */
    serviceType: IntegrationType;
    /**
     * Human-readable service name
     */
    label: string;
    /**
     * Credential fields required by this service
     */
    fields: IServiceCredentialField[];
}

/**
 * Static registry of credential schemas for supported external services
 */
export const SERVICE_CREDENTIAL_SCHEMAS: IServiceCredentialSchema[] = [
    {
        serviceType: IntegrationType.GLOBAL_FOREST_WATCH,
        label: 'Global Forest Watch',
        fields: [
            { name: 'apiKey', label: 'API Key', type: 'string', secret: true }
        ]
    },
    {
        serviceType: IntegrationType.KANOP_IO,
        label: 'Kanop.io',
        fields: [
            { name: 'bearerToken', label: 'Bearer Token', type: 'string', secret: true }
        ]
    },
    {
        serviceType: IntegrationType.FIRM,
        label: 'NASA FIRMS',
        fields: [
            { name: 'mapKey', label: 'Map Key', type: 'string', secret: true }
        ]
    },
];
