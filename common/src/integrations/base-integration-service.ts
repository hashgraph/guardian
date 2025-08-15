import { IntegrationDataTypes, ParseTypes } from '@guardian/interfaces';
import { AxiosRequestConfig } from 'axios';

export type ExecuteParams = Record<string, string | number | boolean | undefined>;

export type Param = {
  name: string;
  value: string;
  required?: boolean;
  parseType?: ParseTypes;
}

export interface MethodDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  description: string;
  type?: IntegrationDataTypes;
  download?: boolean;
  parameters?: {
    path?: Record<string, Param>;
    query?: Record<string, Param>;
    body?: Record<string, Param>;
  };
}

export type MethodMap = Record<string, MethodDefinition>;

export abstract class BaseIntegrationService {
  abstract executeRequest<T = any, P = any>(methodName: string, params?: ExecuteParams): Promise<{ data: T; type?: IntegrationDataTypes; parsedData?: P; }>;

  /**
   * Optional: subclasses can override to define their own base URL
   */
  static getBaseUrl(): string {
    return '';
  }

  static getAvailableMethods(): MethodMap {
    return {};
  }

  static getDataForRequest(
    method: MethodDefinition,
    params: ExecuteParams = {},
    fullUrl = false,
    paramNameForSkipReplace = '',
    additionalParams = {},
  ): AxiosRequestConfig {
    if (!method) {
      throw new Error(`Unsupported method`);
    }

    let endpoint = method.endpoint.replace(/:([a-zA-Z_]+)/g, (_, key) => {
      if (!params[key] && method.parameters?.path?.[key]?.required) {
        throw new Error(`Missing required path parameter: "${key}"`);
      }

      if (key === paramNameForSkipReplace) {
        return `:${paramNameForSkipReplace}`;
      }

      return encodeURIComponent(String(params[key] || ''));
    });

    endpoint = endpoint.replaceAll('//', '/');

    const queryParams: Record<string, string> = {};

    if (method.parameters?.query) {
      Object.keys(method.parameters.query).forEach((query) => {
        if (params[query]) {
          queryParams[query] = `${params[query]}`;
        }

        if (method.parameters.query[query].required && !params[query]) {
          throw new Error(`Missing required path parameter: "${query}"`);
        }
      });
    }

    const bodyParams: Record<string, any> = {};

    if (method.parameters?.body) {
      Object.keys(method.parameters.body).forEach((body) => {
        if (params[body]) {
          if (method.parameters.body[body]?.parseType === ParseTypes.NUMBER) {
            bodyParams[body] = Number(params[body]);
          } else if (method.parameters.body[body]?.parseType === ParseTypes.JSON) {
            bodyParams[body] = params[body] ? JSON.parse(params[body] as string) : '';
          } else {
            bodyParams[body] = params[body];
          }
        }

        if (method.parameters.body[body].required && !params[body]) {
          throw new Error(`Missing required body parameter: "${body}"`);
        }
      });
    }

    // Use `this` to allow static method overriding in subclasses
    // tslint:disable-next-line:static-this
    const baseUrl = this.getBaseUrl();

    return {
      url: fullUrl && baseUrl ? `${baseUrl}${endpoint}` : endpoint,
      method: method.method,
      params: {
        ...queryParams,
        ...additionalParams,
      },
      data: method.method !== 'GET' ? bodyParams : undefined,
    };
  }
}
