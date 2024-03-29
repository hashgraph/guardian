import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { StatusService } from './services/status.service';
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
    providers: [
        StatusService,
        provideHttpClient(),
        provideRouter(routes)
    ]
};
