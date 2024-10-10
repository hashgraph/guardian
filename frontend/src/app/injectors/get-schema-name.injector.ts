import { InjectionToken } from '@angular/core';
import { SchemaHelper } from '@guardian/interfaces';

export const GET_SCHEMA_NAME = new InjectionToken<
    typeof SchemaHelper.getSchemaName
>('get-schema-name');
