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
                if (UserCategory.isAdministrator(user.role)) {
                    this.router.navigate(['/config']);
                } else if (UserCategory.isAudit(user.role)) {
                    this.router.navigate(['/audit']);
                } else if (UserCategory.isUser(user.role)) {
                    this.router.navigate(['/user-profile']);
                } else {
                    this.router.navigate(['/']);
                }
            } else {
                this.router.navigate(['/login']);
            }
        }, () => {
            this.router.navigate(['/login']);
        });
    }
}
