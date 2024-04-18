import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { StatusService } from './services/status.service';
import { provideHttpClient } from '@angular/common/http';
import { LogsService } from './services/logs.service';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { ElasticService } from './services/elastic.service';
import { SearchService } from './services/search.service';

export const appConfig: ApplicationConfig = {
    providers: [
        StatusService,
        LogsService,
        ElasticService,
        SearchService,
        provideHttpClient(),
        provideRouter(routes), provideAnimationsAsync()
    ]
};
