import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_BASE_URL } from './api';
import { DataLoadingProgress, LandingAnalytics, ProjectCoordinates } from '@indexer/interfaces';
import { interval, Observable, startWith, Subject, Subscription, switchMap } from 'rxjs';

@Injectable()
export class LandingService {
    private readonly url: string = `${API_BASE_URL}/landing`;

    private dataLoadingProgressSubscription: Subscription | null = null;
    private dataLoadingProgressSubject = new Subject<DataLoadingProgress>();
    public dataLoadingProgress$ = this.dataLoadingProgressSubject.asObservable();

    constructor(private http: HttpClient) { }

    public ngOnDestroy(): void {
        this.stopPollingDataLoadingProgress();
    }

    public getAnalytics(): Observable<LandingAnalytics[]> {
        return this.http.get<LandingAnalytics[]>(`${this.url}/analytics`);
    }

    public getProjectsCoordinates(): Observable<ProjectCoordinates[]> {
        return this.http.get<ProjectCoordinates[]>(
            `${this.url}/projects-coordinates`
        );
    }

    public startPollingDataLoadingProgress() {
        this.dataLoadingProgressSubscription = interval(30000).pipe(startWith(0), switchMap(() => this.getDataLoadingProgress())).subscribe(data => {
            this.dataLoadingProgressSubject.next(data);
        })
    }

    public stopPollingDataLoadingProgress() {
        if (this.dataLoadingProgressSubscription) {
            this.dataLoadingProgressSubscription.unsubscribe();
            this.dataLoadingProgressSubscription = null;
        }
    }

    public getDataLoadingProgress(): Observable<DataLoadingProgress> {
        return this.http.get<DataLoadingProgress>(
            `${this.url}/data-loading-progress`
        );
    }
}
