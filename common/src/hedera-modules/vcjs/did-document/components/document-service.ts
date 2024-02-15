import { IService } from "../types/did-document";
import { ServiceProperties } from "../types/service-properties";


export class DocumentService {
    /**
     * Id
     * @protected
     */
    protected id: string;

    /**
     * Type
     * @protected
     */
    protected type: string;

    /**
     * Service Endpoint
     * @protected
     */
    protected serviceEndpoint: string | string[] | { [x: string]: string; } | { [x: string]: string; }[];

    /**
     * From
     * @param method
     */
    public static from(service: IService): DocumentService {
        const result = new DocumentService();
        result.id = service[ServiceProperties.ID];
        result.type = service[ServiceProperties.TYPE];
        result.serviceEndpoint = service[ServiceProperties.SERVICE_ENDPOINT];
        return result;
    }

    /**
     * From
     * @param method
     */
    public static fromArray(services: IService[]): DocumentService[] {
        const result: DocumentService[] = [];
        for (const service of services) {
            result.push(DocumentService.from(service));
        }
        return result;
    }

    /**
     * Convert method to object
     * @param privateKey
     */
    public toObject(): IService {
        const result: any = {};
        result[ServiceProperties.ID] = this.id;
        result[ServiceProperties.TYPE] = this.type;
        result[ServiceProperties.SERVICE_ENDPOINT] = this.serviceEndpoint;
        return result;
    }
}
