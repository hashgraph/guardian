import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpResponse } from '@angular/common/http';
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
    notificationColumns: string[] = ['type', 'title', 'message', 'operations'];
    pageIndex: number;
    pageSize: number;

    viewDetails = (notification: any) =>
        this.notificationService.viewDetails(notification);

    constructor(
        private notificationService: NotificationService,
        public dialog: MatDialog,
    ) {
        this.pageIndex = 0;
        this.pageSize = 10;
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
        if (this.pageSize !== event.pageSize) {
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
            () => {
                this.loadNotifications();
            },
            () => (this.loading = false)
        );
    }

    public newOnPage() {
        this.pageIndex = 0;
        this.loadNotifications();
    }

    movePageIndex(inc: number) {
        if (inc > 0 && this.pageIndex < (this.notificationsCount / this.pageSize) - 1) {
            this.pageIndex += 1;
            this.loadNotifications();
        } else if (inc < 0 && this.pageIndex > 0) {
            this.pageIndex -= 1;
            this.loadNotifications();
        }
    }
}
