import { Component } from '@angular/core';
import { AuthStateService } from './services/auth-state.service';
import { WebSocketService } from './services/web-socket.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'guardian';

  constructor(public authState: AuthStateService, public wsService: WebSocketService) {}
}
