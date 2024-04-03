import { Routes } from '@angular/router';
import { StatusComponent } from './views/status/status.component';
import { MessagesComponent } from './views/logs/messages/messages.component';
import { TopicsComponent } from './views/logs/topics/topics.component';
import { DocumentsComponent } from './views/logs/documents/documents.component';

export const routes: Routes = [
    { path: 'status', component: StatusComponent },
    { path: 'messages', component: MessagesComponent },
    { path: 'topics', component: TopicsComponent },
    { path: 'documents', component: DocumentsComponent },
];
