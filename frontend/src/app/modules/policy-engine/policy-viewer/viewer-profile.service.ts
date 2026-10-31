import { Injectable } from '@angular/core';
import { IUser } from '@guardian/interfaces';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { ProfileService } from 'src/app/services/profile.service';

/**
 * Viewer-scoped cache of the current profile.
 * Blocks read it instead of fetching the profile once per block instance.
 */
@Injectable()
export class ViewerProfileService {
    private _profile$: Observable<IUser> | null = null;

    constructor(private profileService: ProfileService) {
    }

    public get profile$(): Observable<IUser> {
        if (!this._profile$) {
            this._profile$ = this.profileService.getProfile().pipe(shareReplay(1));
        }
        return this._profile$;
    }

    /**
     * Drop the cached profile. Call it when the acting user can change.
     */
    public reset(): void {
        this._profile$ = null;
    }
}
