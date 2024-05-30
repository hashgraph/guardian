import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserCategory, UserRole } from '@guardian/interfaces';
import { AuthService } from 'src/app/services/auth.service';

/**
 * Start page.
 */
@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

    constructor(
        private auth: AuthService,
        private route: ActivatedRoute,
        private router: Router) { }

    ngOnInit() {
        this.redirect()
    }

    async redirect() {
        this.auth.sessions().subscribe((user: any | null) => {
            if (user) {
                const home = this.auth.home(user.role);
                this.router.navigate([home]);
            } else {
                this.router.navigate(['/login']);
            }
        }, () => {
            this.router.navigate(['/login']);
        });
    }
}
