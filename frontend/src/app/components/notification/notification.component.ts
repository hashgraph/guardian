import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NotificationType, NotifyAPI, } from '@guardian/interfaces';
import { ToastrService } from 'ngx-toastr';
import { forkJoin, Subscription } from 'rxjs';
import { NotificationService } from 'src/app/services/notify.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { MatMenu } from '@angular/material/menu';

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
    subscription = new Subscription();

    @Input() menuCollapsed: boolean;

    @ViewChild('notificationMenu') notificationMenu: MatMenu;

    viewDetails($event: MouseEvent, notification: any) {
        if (!notification.action) {
            $event.stopPropagation();
        }
        this.notificationService.viewDetails(notification);
    }

    constructor(
        private ws: WebSocketService,
        private notificationService: NotificationService,
        private toastr: ToastrService,
        public router: Router,
    ) {
    }

    ngOnInit() {
        forkJoin([
            this.notificationService.new(),
            this.notificationService.progresses(),
        ]).subscribe((value) => {
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
                this.ws.createProgressSubscribe(this.createProgress.bind(this))
            )
            this.subscription.add(
                this.ws.updateProgressSubscribe(this.updateProgress.bind(this))
            );
            this.subscription.add(
                this.ws.deleteProgressSubscribe(this.deleteProgress.bind(this))
            );
        });
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

    createProgress(notification: any) {
        this.progressNotifications.unshift(notification);
        this.toastProgress(notification);
        this.countUnreadNotification();
    }

    updateProgress(notification: any) {
        const existingNotification = this.progressNotifications.find(
            (item) => item.id === notification.id
        );
        if (existingNotification) {
            Object.assign(existingNotification, notification);
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
        this.router.navigate(['task', taskId], {
            replaceUrl: this.router.url.startsWith('/task'),
        });
    }

    onScrollNotifications(event: any) {
        for (const child of event.target.children) {
            if (
                child.offsetTop >= event.target.scrollTop &&
                child.offsetTop + 62 < event.target.scrollTop + 310
            ) {
                if (child.getAttribute('unread') === 'true') {
                    setTimeout(() => {
                        if (child.getAttribute('unread') === 'true') {
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

    readAll(event: MouseEvent) {
        event.stopPropagation();
        this.notificationService.readAll().subscribe((result) => {
            this.unreadNotifications = 0;
            this.notifications = result;
        });
    }

    readFirstNotification() {
        const notificationToRead = this.notifications.slice(0, 4);
        setTimeout(() => {
            notificationToRead.forEach(notification => {
                if (notification.read) {
                    return;
                }
                this.ws.sendMessage(
                    NotifyAPI.READ,
                    notification.id
                );
            })
        }, 5000);
    }

    onMenuOpened($event: MouseEvent) {
        $event.stopPropagation();
        if (this.menuCollapsed) {
            $event.stopImmediatePropagation();
            this.router.navigate(['notifications']);
            return;
        }
        this.menuOpened = true;
        //this.readFirstNotification();
    }

    viewAllNotifications() {
        this.menuOpened = false;
        this.router.navigate(['notifications']);
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
}
