import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { IUser, NotificationAction, PolicyType } from '@guardian/interfaces';
import { HttpResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ProfileService } from 'src/app/services/profile.service';
import { ConfirmationDialogComponent } from 'src/app/modules/common/confirmation-dialog/confirmation-dialog.component';
import { ArtifactService } from 'src/app/services/artifact.service';
import { NotificationService } from 'src/app/services/notify.service';

/**
 * Notifications
 */
@Component({
    selector: 'app-notifications',
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.css'],
})
export class NotificationsComponent implements OnInit {
    loading: boolean = true;
    notifications: any[] = [];
    notificationsCount: any;
    notitifcationColumns: string[] = ['type', 'title', 'message', 'operations'];
    pageIndex: number;
    pageSize: number;

    viewDetails = (notification: any) =>
        this.notificationService.viewDetails(notification);

    constructor(
        private notificationService: NotificationService,
        public dialog: MatDialog,
        private router: Router
    ) {
        this.pageIndex = 0;
        this.pageSize = 100;
    }

    ngOnInit() {
        this.loadNotifications();
    }

    loadNotifications() {
        this.loading = true;
        const request = this.notificationService.all(
            this.pageIndex,
            this.pageSize
        );
        request.subscribe(
            (notificationsResponse: HttpResponse<any[]>) => {
                this.notifications = notificationsResponse.body || [];
                this.notificationsCount =
                    notificationsResponse.headers.get('X-Total-Count') ||
                    this.notifications.length;
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            },
            (e) => {
                console.error(e.error);
                this.loading = false;
            }
        );
    }

    onPage(event: any) {
        if (this.pageSize != event.pageSize) {
            this.pageIndex = 0;
            this.pageSize = event.pageSize;
        } else {
            this.pageIndex = event.pageIndex;
            this.pageSize = event.pageSize;
        }
        this.loadNotifications();
    }

    deleteUpToThis(notificationId: string) {
        this.loading = true;
        this.notificationService.delete(notificationId).subscribe(
            (count) => {
                this.loadNotifications();
            },
            () => (this.loading = false)
        );
    }
}
