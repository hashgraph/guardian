import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
    NotificationAction,
    NotificationType,
    NotifyAPI,
} from '@guardian/interfaces';
import { ToastrService } from 'ngx-toastr';
import { Subscription, forkJoin } from 'rxjs';
import { NotifyService } from 'src/app/services/notify.service';
import { WebSocketService } from 'src/app/services/web-socket.service';

@Component({
    selector: 'app-notification',
    templateUrl: './notification.component.html',
    styleUrls: ['./notification.component.scss'],
})
export class NotificationComponent implements OnInit {
    progressNotifications: any[] = [];
    notifications: any[] = [];
    subscription = new Subscription();
    unreadNotifications = 0;
    readFirstNotificationTimeout: any = null;
    menuOpened: boolean = false;

    constructor(
        private ws: WebSocketService,
        private notifier: NotifyService,
        private toastr: ToastrService,
        private router: Router
    ) {}

    ngOnInit() {
        forkJoin([this.notifier.get(), this.notifier.progresses()]).subscribe(
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
                this.toastr.success(notification.message, notification.action, {
                    timeOut: 3000,
                    closeButton: true,
                    positionClass: 'toast-bottom-right',
                    enableHtml: true,
                });
                break;
            case NotificationType.ERROR:
                this.toastr.error(notification.message, notification.action, {
                    timeOut: 3000,
                    closeButton: true,
                    positionClass: 'toast-bottom-right',
                    enableHtml: true,
                });
                break;
            case NotificationType.WARN:
                this.toastr.warning(notification.message, notification.action, {
                    timeOut: 3000,
                    closeButton: true,
                    positionClass: 'toast-bottom-right',
                    enableHtml: true,
                });
                break;
            default:
                this.toastr.info(notification.message, notification.action, {
                    timeOut: 3000,
                    closeButton: true,
                    positionClass: 'toast-bottom-right',
                    enableHtml: true,
                });
                break;
        }
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
            this.toastNotification(notification);
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
                return 'warning';
            default:
                return 'info_outline';
        }
    }

    viewProgress(taskId: string) {
        this.router.navigate(['task', taskId]);
    }

    viewDetails(notification: any) {
        switch (notification.action) {
            case NotificationAction.POLICY_CLONED:
            case NotificationAction.POLICY_CREATED:
            case NotificationAction.POLICY_IMPORTED:
                this.router.navigate(['policy-configuration'], {
                    queryParams: {
                        policyId:
                            notification.result?.policyId ||
                            notification.result,
                    },
                });
                break;
        }
    }

    detailsVisibility(notification: any) {
        return (
            [
                NotificationAction.POLICY_CLONED,
                NotificationAction.POLICY_CREATED,
                NotificationAction.POLICY_IMPORTED,
            ].includes(notification.action) && notification.result
        );
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
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
                    }, 1000);
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
        if (this.readFirstNotificationTimeout) {
            return;
        }
        this.readFirstNotificationTimeout = setTimeout(() => {
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
            this.readFirstNotificationTimeout = null;
        }, 5000);
    }

    onMenuOpened() {
        this.menuOpened = true;
        this.readFirstNotification();
    }
}
