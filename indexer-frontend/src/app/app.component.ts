import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, MatToolbarModule, MatButtonModule, RouterModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
    public title = 'Indexer';
}
