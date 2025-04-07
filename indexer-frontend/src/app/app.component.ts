import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { HeaderComponent } from '@components/header/header.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [
        RouterOutlet,
        RouterModule,
        HeaderComponent,
        ToastModule,
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    providers: [MessageService]
})
export class AppComponent {

}
