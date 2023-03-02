import { HttpClient } from '@angular/common/http';
import { Component, HostListener } from '@angular/core';
import { AuthStateService } from './services/auth-state.service';
import { MapService } from './services/map.service';
import { WebSocketService } from './services/web-socket.service';
import { BrandingService } from './services/branding.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    title = 'guardian';

    constructor(
      public authState: AuthStateService,
      public wsService: WebSocketService,
      private brandingService: BrandingService,
      mapService: MapService,
      httpClient: HttpClient
    ) {
        const mapRequest = (value?: string) => {
            httpClient
                .jsonp(
                    `https://maps.googleapis.com/maps/api/js${
                        value ? '?key=' + value : ''
                    }`,
                    'callback'
                )
                .subscribe();
        };
        mapService.getApiKey().subscribe(mapRequest, () => mapRequest());
    }

    ngOnInit(): void {
      //this.brandingService.loadBrandingData();
    }

  @HostListener('window:resize')
  onResize() {
    // update the --vh variable with the new viewport height
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
}
