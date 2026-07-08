import { Component, OnDestroy, OnInit } from '@angular/core';
import { IUser, UserPermissions } from '@guardian/interfaces';
import { Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';

@Component({
    selector: 'app-toast',
    templateUrl: './app-toast.component.html',
    styleUrls: ['./app-toast.component.scss'],
    standalone: false
})
export class AppToastComponent implements OnInit, OnDestroy {
    public canReadLogs: boolean = false;

    private subscription = new Subscription();

    constructor(private profileService: ProfileService) {}

    public ngOnInit(): void {
        this.subscription.add(
            this.profileService.getProfile().subscribe({
                next: (profile: IUser) => {
                    const user = new UserPermissions(profile);
                    this.canReadLogs = !!user.LOG_LOG_READ;
                },
                error: () => {
                    this.canReadLogs = false;
                }
            })
        );
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    public getSeverityIcon(severity: string): string {
        switch (severity) {
            case 'success': return 'pi-check-circle';
            case 'info':    return 'pi-info-circle';
            case 'warn':    return 'pi-exclamation-triangle';
            case 'error':   return 'pi-times-circle';
            default:        return 'pi-info-circle';
        }
    }
}
