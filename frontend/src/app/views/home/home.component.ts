import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserRole } from '@guardian/interfaces';
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
                if (user.role === UserRole.STANDARD_REGISTRY) {
                    this.router.navigate(['/config']);
                } else if (user.role === UserRole.AUDITOR) {
                    this.router.navigate(['/audit']);
                } else {
                    this.router.navigate(['/user-profile']);
                }
            } else {
                this.router.navigate(['/login']);
            }
        }, () => {
            this.router.navigate(['/login']);
        });
    }
}
