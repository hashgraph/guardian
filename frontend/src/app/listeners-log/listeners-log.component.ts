import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-listeners-log',
    templateUrl: './listeners-log.component.html',
    styleUrls: ['./listeners-log.component.css']
})

export class ListenersLogComponent implements OnInit {
    logs: any[];
    interval: any;

    constructor(private http: HttpClient) {
        this.logs = [];
    }

    ngOnInit() {
        this.load()
        this.interval = setInterval(() => {
            this.load();
        }, 3000);
    }

    ngOnDestroy(): void {
        clearInterval(this.interval)
    }

    load() {
        this.http.get<any[]>('/api/get-listeners').subscribe((logs: any) => {
            this.logs = logs || [];
        }, () => {
            this.logs = [];
        });
    }

    reboot() {
        this.http.get<any[]>('/api/reboot-listeners').subscribe((logs: any) => {
        }, () => {
        });
    }
}