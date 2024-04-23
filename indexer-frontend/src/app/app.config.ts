import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { StatusService } from './services/status.service';
import { provideHttpClient } from '@angular/common/http';
import { LogsService } from './services/logs.service';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ElasticService } from './services/elastic.service';
import { SearchService } from './services/search.service';
import { provideEcharts } from 'ngx-echarts';
import { TranslocoHttpLoader } from './transloco-loader';
import { provideTransloco } from '@jsverse/transloco';

export const appConfig: ApplicationConfig = {
    providers: [
        StatusService,
        LogsService,
        ElasticService,
        SearchService,
        provideHttpClient(),
        provideRouter(routes), 
        provideAnimationsAsync(),
        provideEcharts(), 
        provideHttpClient(), 
        provideTransloco({
            config: {
                availableLangs: ['en'],
                defaultLang: 'en',
                // reRenderOnLangChange: true,
                prodMode: !isDevMode(),
            },
            loader: TranslocoHttpLoader
        }),
    ]
};
