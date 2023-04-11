import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { AuthStateService } from './services/auth-state.service';
import { MapService } from './services/map.service';
import { WebSocketService } from './services/web-socket.service';

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
}
