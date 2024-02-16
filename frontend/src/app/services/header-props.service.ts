import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HeaderPropsService {
    private _isLoading: Subject<boolean> = new BehaviorSubject<boolean>(false);

    constructor() {}

    get isLoading$() {
        return this._isLoading.asObservable();
    }

    setLoading(value: boolean) {
        this._isLoading.next(value);
    }
}
