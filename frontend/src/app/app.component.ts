import { HttpClient } from '@angular/common/http';
import { Component, HostListener } from '@angular/core';
import { AuthStateService } from './services/auth-state.service';
import { MapService } from './services/map.service';
import { WebSocketService } from './services/web-socket.service';
import { BrandingService } from './services/branding.service';
import './modules/policy-engine/policy-lang-modes/policy-json-lang.mode';
import './modules/policy-engine/policy-lang-modes/policy-yaml-lang.mode';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    title = 'guardian';
    public innerWidth: any;

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
      this.innerWidth = window.innerWidth;
      this.brandingService.loadBrandingData(this.innerWidth);
    }

  @HostListener('window:resize')
  onResize() {
    // update the --vh variable with the new viewport height
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
}
