import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserRole, ISession } from 'interfaces';

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
        this.auth.getCurrentUser().subscribe((user: ISession | null) => {
            if (user) {
                if (user.role == UserRole.ROOT_AUTHORITY) {
                    this.router.navigate(['/config']);
                } else if (user.role == UserRole.INSTALLER) {
                    this.router.navigate(['/installer-profile']);
                } else if (user.role == UserRole.ORIGINATOR) {
                    this.router.navigate(['/originator-profile']);
                } else {
                    this.router.navigate(['/audit']);
                }
            } else {
                this.router.navigate(['/login']);
            }
        }, () => {
            this.router.navigate(['/login']);
        });
    }
}