import { Routes } from '@angular/router';
import { StatusComponent } from './views/status/status.component';
import { MessagesComponent } from './views/messages/messages.component';

export const routes: Routes = [
    { path: 'status', component: StatusComponent },
    { path: 'messages', component: MessagesComponent },
];
