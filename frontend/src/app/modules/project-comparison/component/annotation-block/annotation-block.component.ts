import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-annotation-block',
    templateUrl: './annotation-block.component.html',
    styleUrls: ['./annotation-block.component.scss']
})
export class AnnotationBlockComponent implements OnInit {
    counters: any = {
        registeredProjects: this.getRandom(30, 500),
        registeredPoAs: this.getRandom(50, 1100),
        cERsIssuedForProjectActivities: this.getRandom(1000, 500000),
        cERsIssuedForProgrammeOfActivities: this.getRandom(20000, 5000505)
    };

    constructor() {
    }

    ngOnInit(): void {
    }

    private getRandom(min: number, max: number) {
        return Math.round(Math.random() * (max - min) + min);
    }
}
