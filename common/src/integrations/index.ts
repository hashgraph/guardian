import { AxiosRequestConfig } from 'axios';
import { BaseIntegrationService, ExecuteParams, MethodDefinition, MethodMap } from './base-integration-service.js';
import { GlobalForestWatchService } from './services/global-forest-watch-service.js';
import { KanopioService } from './services/kanopio-service.js';
import { WorldBankService } from './services/world-bank-service.js';
import { FIRMSService } from './services/firms-service.js';

const globalforestwatch = 'GLOBAL_FOREST_WATCH' as const;
const kanopio = 'KANOP_IO' as const;
const worldbank = 'WORLD_BANK' as const;
const firm = 'FIRM' as const;

export type IntegrationType = typeof globalforestwatch | typeof kanopio | typeof worldbank | typeof firm;
type ServiceConfig = Record<string, string>;

export class IntegrationServiceFactory {
  public static getIntegrationTypes(): { value: IntegrationType; label: string }[] {
    return [
      {
        label: 'Global forest watch',
        value: globalforestwatch,
      },
      {
        label: 'Kanop io',
        value: kanopio,
      },
      {
        label: 'World bank',
        value: worldbank,
      },
      {
        label: 'FIRM',
        value: firm,
      },
    ];
  }
  public static create(type: IntegrationType, serviceConfig?: ServiceConfig): BaseIntegrationService {
    switch (type) {
      case globalforestwatch:
        return new GlobalForestWatchService(serviceConfig);
      case kanopio:
        return new KanopioService(serviceConfig);
      case worldbank:
        return new WorldBankService(serviceConfig);
      case firm:
        return new FIRMSService(serviceConfig);
      default:
        throw new Error(`Unsupported integration type: "${type}"`);
    }
  }

  public static getAvailableMethods(type: IntegrationType): MethodMap {
    switch (type) {
      case globalforestwatch:
        return GlobalForestWatchService.getAvailableMethods();
      case kanopio:
        return KanopioService.getAvailableMethods();
      case worldbank:
        return WorldBankService.getAvailableMethods();
      case firm:
        return FIRMSService.getAvailableMethods();
      default:
        throw new Error(`Unsupported integration type: "${type}"`);
    }
  }

  public static getDataForRequest(
    type: IntegrationType,
    method: MethodDefinition,
    params: ExecuteParams = {},
  ): AxiosRequestConfig {
    switch (type) {
      case globalforestwatch:
        return GlobalForestWatchService.getDataForRequest(method, params, true, undefined, {
          'x-api-key': 'secret_api_key'
        });
      case kanopio:
        return KanopioService.getDataForRequest(method, params, true);
      case worldbank:
        return WorldBankService.getDataForRequest(method, params, true);
      case firm:
        return FIRMSService.getDataForRequest(method, params, true, FIRMSService.secretTokenParamName);
      default:
        throw new Error(`Unsupported integration type: "${type}"`);
    }
  }
}
