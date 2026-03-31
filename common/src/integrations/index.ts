import { AxiosRequestConfig } from 'axios';
import { BaseIntegrationService, ExecuteParams, MethodDefinition, MethodMap } from './base-integration-service.js';
import { GlobalForestWatchService } from './services/global-forest-watch-service.js';
import { KanopioService } from './services/kanopio-service.js';
import { WorldBankService } from './services/world-bank-service.js';
import { FIRMSService } from './services/firms-service.js';
import { IntegrationType } from '@guardian/interfaces';

export class IntegrationServiceFactory {
  public static getIntegrationTypes(): { value: IntegrationType; label: string }[] {
    return [
      {
        label: 'Global forest watch',
        value: IntegrationType.GLOBAL_FOREST_WATCH,
      },
      {
        label: 'Kanop io',
        value: IntegrationType.KANOP_IO,
      },
      {
        label: 'World bank',
        value: IntegrationType.WORLD_BANK,
      },
      {
        label: 'FIRM',
        value: IntegrationType.FIRM,
      },
    ];
  }
  public static create(type: IntegrationType, token?: string): BaseIntegrationService {
    switch (type) {
      case IntegrationType.GLOBAL_FOREST_WATCH:
        return new GlobalForestWatchService(token);
      case IntegrationType.KANOP_IO:
        return new KanopioService(token);
      case IntegrationType.WORLD_BANK:
        return new WorldBankService();
      case IntegrationType.FIRM:
        return new FIRMSService(token);
      default:
        throw new Error(`Unsupported integration type: "${type}"`);
    }
  }

  public static getAvailableMethods(type: IntegrationType): MethodMap {
    switch (type) {
      case IntegrationType.GLOBAL_FOREST_WATCH:
        return GlobalForestWatchService.getAvailableMethods();
      case IntegrationType.KANOP_IO:
        return KanopioService.getAvailableMethods();
      case IntegrationType.WORLD_BANK:
        return WorldBankService.getAvailableMethods();
      case IntegrationType.FIRM:
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
      case IntegrationType.GLOBAL_FOREST_WATCH:
        return GlobalForestWatchService.getDataForRequest(method, params, true, undefined, {
          'x-api-key': 'secret_api_key'
        });
      case IntegrationType.KANOP_IO:
        return KanopioService.getDataForRequest(method, params, true);
      case IntegrationType.WORLD_BANK:
        return WorldBankService.getDataForRequest(method, params, true);
      case IntegrationType.FIRM:
        return FIRMSService.getDataForRequest(method, params, true, FIRMSService.secretTokenParamName);
      default:
        throw new Error(`Unsupported integration type: "${type}"`);
    }
  }
}
