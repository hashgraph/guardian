import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
    NotificationAction,
    NotificationType,
    NotifyAPI,
} from '@guardian/interfaces';
import { ToastrService } from 'ngx-toastr';
import { Subscription, forkJoin } from 'rxjs';
import { NotificationService } from 'src/app/services/notify.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

@Component({
    selector: 'app-notification',
    templateUrl: './notification.component.html',
    styleUrls: ['./notification.component.scss'],
})
export class NotificationComponent implements OnInit {
    notifications: any[] = [];
    unreadNotifications = 0;
    progressNotifications: any[] = [];
    menuOpened: boolean = false;

    readFirstNotificationsTimeout: any = null;
    subscription = new Subscription();

    constructor(
        private ws: WebSocketService,
        private notifier: NotificationService,
        private toastr: ToastrService,
        private router: Router
    ) {}

    ngOnInit() {
        forkJoin([this.notifier.new(), this.notifier.progresses()]).subscribe(
            (value) => {
                this.notifications = value[0];
                this.progressNotifications = value[1];
                this.countUnreadNotification();
                this.subscription.add(
                    this.ws.updateNotificationSubscribe(
                        this.updateNotification.bind(this)
                    )
                );
                this.subscription.add(
                    this.ws.deleteNotificationSubscribe(
                        this.deleteNotification.bind(this)
                    )
                );
                this.subscription.add(
                    this.ws.updateProgressSubscribe(
                        this.updateProgress.bind(this)
                    )
                );
                this.subscription.add(
                    this.ws.deleteProgressSubscribe(
                        this.deleteProgress.bind(this)
                    )
                );
            }
        );
    }

    toastNotification(notification: any) {
        switch (notification.type) {
            case NotificationType.SUCCESS:
                this.toastr.success(notification.message, notification.title, {
                    timeOut: 3000,
                    closeButton: true,
                    positionClass: 'toast-bottom-right',
                    enableHtml: true,
                });
                break;
            case NotificationType.ERROR:
                this.toastr.error(notification.message, notification.title, {
                    timeOut: 3000,
                    closeButton: true,
                    positionClass: 'toast-bottom-right',
                    enableHtml: true,
                });
                break;
            case NotificationType.WARN:
                this.toastr.warning(notification.message, notification.title, {
                    timeOut: 3000,
                    closeButton: true,
                    positionClass: 'toast-bottom-right',
                    enableHtml: true,
                });
                break;
            case NotificationType.INFO:
                this.toastr.info(notification.message, notification.title, {
                    timeOut: 3000,
                    closeButton: true,
                    positionClass: 'toast-bottom-right',
                    enableHtml: true,
                });
                break;
            default:
                break;
        }
    }

    toastProgress(notification: any) {
        this.toastr.info(notification.message, notification.action, {
            timeOut: 3000,
            closeButton: true,
            positionClass: 'toast-bottom-right',
            enableHtml: true,
        });
    }

    countUnreadNotification() {
        this.unreadNotifications =
            this.notifications.filter((item) => !item.read).length +
            this.progressNotifications.length;
    }

    updateNotification(notification: any) {
        const existingNotification = this.notifications.find(
            (item) => item.id === notification.id
        );
        if (existingNotification) {
            Object.assign(existingNotification, notification);
        } else {
            this.notifications.unshift(notification);
            this.toastNotification(notification);
            if (this.menuOpened) {
                this.readFirstNotification();
            }
        }
        this.countUnreadNotification();
    }

    updateProgress(notification: any) {
        const existingNotification = this.progressNotifications.find(
            (item) => item.id === notification.id
        );
        if (existingNotification) {
            Object.assign(existingNotification, notification);
        } else {
            this.progressNotifications.unshift(notification);
            this.toastProgress(notification);
            this.countUnreadNotification();
        }
    }

    deleteNotification(notificationid: string) {
        this.notifications = this.notifications.filter(
            (item) => item.id !== notificationid
        );
        this.countUnreadNotification();
    }

    deleteProgress(notificationid: string) {
        this.progressNotifications = this.progressNotifications.filter(
            (item) => item.id !== notificationid
        );
        setTimeout(this.countUnreadNotification.bind(this), 500);
    }

    getNotificationIcon(type: NotificationType): string {
        switch (type) {
            case NotificationType.SUCCESS:
                return 'check_circle_outline';
            case NotificationType.ERROR:
                return 'error_outline';
            case NotificationType.WARN:
                return 'warning_outline';
            default:
                return 'info_outline';
        }
    }

    viewProgress(taskId: string) {
        this.router.navigate(['task', taskId]);
    }

    viewDetails(notification: any) {
        switch (notification.action) {
            case NotificationAction.POLICIES_PAGE:
                this.router.navigate(['policies']);
                break;
            case NotificationAction.SCHEMAS_PAGE:
                this.router.navigate(['schemas']);
                break;
            case NotificationAction.TOKENS_PAGE:
                this.router.navigate(['tokens']);
                break;
            case NotificationAction.POLICY_CONFIGURATION:
                this.router.navigate(['policy-configuration'], {
                    queryParams: {
                        policyId: notification.result,
                    },
                });
                break;
            case NotificationAction.POLICY_VIEW:
                this.router.navigate(['policy-view'], {
                    queryParams: {
                        policyId: notification.result,
                    },
                });
                break;
        }
    }

    onScrollNotifications(event: any) {
        for (const child of event.target.children) {
            if (
                child.offsetTop >= event.target.scrollTop &&
                child.offsetTop + 62 < event.target.scrollTop + 310
            ) {
                if (child.getAttribute('read') === 'false') {
                    setTimeout(() => {
                        if (child.getAttribute('read') === 'false') {
                            this.ws.sendMessage(
                                NotifyAPI.READ,
                                child.getAttribute('notificationId')
                            );
                        }
                    }, 5000);
                }
            }
        }
    }

    readAll() {
        this.notifier.readAll().subscribe((result) => {
            this.unreadNotifications = 0;
            this.notifications = result;
        });
    }

    readFirstNotification() {
        if (this.readFirstNotificationsTimeout) {
            return;
        }
        this.readFirstNotificationsTimeout = setTimeout(() => {
            for (let i = 0; i < 4; i++) {
                if (!this.notifications[i]) {
                    break;
                }
                if (!this.notifications[i].read) {
                    this.ws.sendMessage(
                        NotifyAPI.READ,
                        this.notifications[i].id
                    );
                }
            }
            this.readFirstNotificationsTimeout = null;
        }, 5000);
    }

    onMenuOpened() {
        this.menuOpened = true;
        this.readFirstNotification();
    }

    viewAllNotifications() {
        this.router.navigate(['notifications']);
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
}
