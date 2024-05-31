// _DEV
import { StatusService } from '@dev/services/status.service';
import { LogsService } from '@dev/services/logs.service';
import { ElasticService } from '@dev/services/elastic.service';

//
import { ApplicationConfig, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideEcharts } from 'ngx-echarts';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './transloco-loader';
import { SearchService } from '@services/search.service';
import { EntitiesService } from '@services/entities.service';
import { FiltersService } from '@services/filters.service';
import { LandingService } from '@services/landing.service';

export const appConfig: ApplicationConfig = {
    providers: [
        StatusService,
        LogsService,
        ElasticService,
        SearchService,
        EntitiesService,
        FiltersService,
        LandingService,
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
