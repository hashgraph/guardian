import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProjectComparisonService } from 'src/app/services/project-comparison.service';

interface IField {
    property?: string;
    type?: string;
    value?: any;
    title?: string;
    description?: string;
    items?: any[];
    path?: any;
}

interface IDocumentsProperty {
    item: IField;
    items: IField[];
}

interface IDocuments {
    document_type: string;
    documents: IDocumentsProperty[] | IDocumentsProperty[][];
}

interface IProject {
    title?: string;
    id: string;
}

interface IValue {
    green: boolean;
    value: any;
    displayValue: string;
}

interface IProperty {
    key: string;
    items: any[];
    title: string;
    fields: IValue[];
}

interface ITable {
    columns: any[];
    report: IDocuments[]
}

interface IData {
    size?: number;
    documents: ITable;
    left: any;
    right?: any;
    rights?: any[];
    total: number | number[];
}

interface IGroup {
    root: boolean;
    projects: IProject[];
    title: string;
    type: string;
    index: number;
    filteredProperties: IProperty[];
    mergedProperties: IPropertyRow[];
    propertyCount: number;
    size: number;
}

interface IPropertyRow {
    isGroup: boolean;
    collapsed: boolean;
    key: string;
    title: string;
    fields: IValue[];
    properties: IProperty[];
}

@Component({
    selector: 'app-projects-comparison-table',
    templateUrl: './projects-comparison-table.component.html',
    styleUrls: ['./projects-comparison-table.component.scss'],
})
export class ProjectsComparisonTableComponent implements OnInit {
    public vpDocuments: any[] = [];
    public loading: boolean = true;
    public columns: boolean[];
    public groups: IGroup[];
    public propertyCount: number = 0;
    public columnCount: number = 0;
    private rawData: IData;
    private properties: any[];
    private projectsCount: number = 0;
    private projectIds: string[];

    constructor(
        private projectComparisonService: ProjectComparisonService,
        private router: Router,
        private activatedRoute: ActivatedRoute
    ) {
        this.projectIds = [];
    }

    ngOnInit(): void {
        this.projectIds = [];
        this.groups = [];
        this.activatedRoute.queryParams.subscribe((queryParams) => {
            const projectIds = queryParams['projectIds'] ? queryParams['projectIds'].split(',') : [];
            this.loadData(projectIds);
        });
    }

    ngOnDestroy() {
        localStorage.setItem('active-projects', JSON.stringify(this.projectIds));
    }

    public deleteColumn(id: string, i: number): void {
        for (const group of this.groups) {
            for (const prop of group.filteredProperties) {
                prop.items = prop.items.filter((f: any, index: number) => i !== index);
                prop.fields = this.comparisonResult(prop.items);
            }
            if (group.projects) {
                group.projects = group.projects.filter(f => f.id !== id);
            }
            group.mergedProperties = this.mergeProperties(group.filteredProperties);
        }
        this.projectIds = this.projectIds.filter((projectId: string) => projectId !== id);
        this.columns = this.columns.filter((f: any, index: number) => i !== index);
        this.columnCount = this.projectsCount + 1;
    }

    public navigateToProjectsOverview(): void {
        this.router.navigate(['/projects']);
    }

    public isCollapsed(i: number): boolean {
        return this.columns[i];
    }

    public toggleColumn(i: number): void {
        this.columns[i] = !this.columns[i];
    }

    public toggleRow(row: IPropertyRow): void {
        row.collapsed = !row.collapsed;
        this.propertyCount = 1;
        for (const group of this.groups) {
            for (const p of group.mergedProperties) {
                this.propertyCount++;
                if (p.isGroup && !p.collapsed) {
                    this.propertyCount += p.properties.length;
                }
            }
        }
    }

    private loadData(ids: string[]) {
        forkJoin([
            this.projectComparisonService.getProperties(),
            this.projectComparisonService.compareProjects(ids)
        ]).subscribe((result: any) => {
            const [properties, data] = result;
            this.properties = properties;
            this.setData(data.projects);
            this.vpDocuments = data.presentations.map((vp: any) => {
                console.log(vp);
                vp.size = 2;
                return vp;
            })
            this.loading = false;
        })
    }

    private setData(data: IData) {
        if (!data) {
            return;
        }

        this.rawData = data;
        if (data.size && data.size > 2) {
            this.projectsCount = this.rawData.size || 0;
        } else {
            this.projectsCount = 2;
        }

        this.groups = [];

        const documents = this.rawData.documents.report;

        // Projects
        const projects = [];
        projects.push(this.rawData.left);
        if (this.rawData.right) {
            projects.push(this.rawData.right);
        } else if (Array.isArray(this.rawData.rights)) {
            for (const right of this.rawData.rights) {
                projects.push(right);
            }
        }
        this.projectIds = projects.map((p: any) => p.id);

        let samePolicy: boolean = true;
        for (let index = 1; index < projects.length; index++) {
            if (projects[index - 1].policy !== projects[index].policy) {
                samePolicy = false;
                break;
            }
        }

        // Project Documents
        if (documents.length) {
            const projectDocuments = documents[0];
            const schemaName = this.getSchemaName(projectDocuments);
            const filteredProperties = this.getProperties(projectDocuments, samePolicy);
            const mergedProperties = this.mergeProperties(filteredProperties);
            this.groups.push({
                root: true,
                projects,
                index: 0,
                size: this.projectsCount,
                title: schemaName,
                type: `${projectDocuments.document_type} Document`,
                filteredProperties,
                mergedProperties,
                propertyCount: filteredProperties.length
            });
        }

        // Other Documents
        for (let i = 1; i < documents.length; i++) {
            const otherDocuments = documents[i];
            const schemaName = this.getSchemaName(otherDocuments);
            const filteredProperties = this.getProperties(otherDocuments, samePolicy);
            const mergedProperties = this.mergeProperties(filteredProperties);
            this.groups.push({
                root: false,
                projects: [],
                index: i,
                size: this.projectsCount,
                title: schemaName,
                type: `${otherDocuments.document_type} Document`,
                filteredProperties,
                mergedProperties,
                propertyCount: filteredProperties.length
            });
        }

        for (let index = 0; index < projects.length; index++) {
            const project = projects[index];
            project.title = this.getProjectTitle(project, this.groups[0], index);
        }

        this.propertyCount = 0;
        for (const group of this.groups) {
            this.propertyCount++;
            for (const p of group.mergedProperties) {
                this.propertyCount++;
                if (p.isGroup && !p.collapsed) {
                    this.propertyCount += p.properties.length;
                }
            }
        }

        this.columns = [];
        for (let i = 0; i < this.projectIds.length; i++) {
            this.columns.push(false);
        }
        this.columnCount = this.projectsCount + 1;
    }

    private getProperties(documents: IDocuments, samePolicy: boolean): IProperty[] {
        const result: IProperty[] = [];
        if (samePolicy) {
            const schemaNames = this.getSchemaNames(documents, this.projectIds.length);
            result.push({
                key: '',
                items: schemaNames,
                title: 'Schema',
                fields: schemaNames.map(name => {
                    const green = schemaNames.every((v: any) => name === v);
                    return {
                        green,
                        value: name,
                        displayValue: name || 'N/A'
                    }
                })
            });
        }

        const allProperties = documents.documents;
        if (!allProperties) {
            return result;
        }

        for (const property of allProperties) {
            let items: IField[] = [];
            if (Array.isArray(property)) {
                for (const item of property) {
                    items.push(item?.item);
                }
            } else {
                items.push(property.items[0]);
                items.push(property.items[1]);
            }

            let propertyTitle = '';
            let propertyKey = '';
            let validProperty = false;
            for (const field of items) {
                if (samePolicy) {
                    if (field?.title || field?.description) {
                        propertyKey = field?.path;
                        validProperty = true;
                        propertyTitle = field?.description || '';
                        break;
                    }
                } else {
                    if (field?.property) {
                        propertyKey = field?.property;
                        validProperty = true;
                        propertyTitle = this.getFieldName(field);
                        break;
                    }
                }
            }
            if (validProperty) {
                const mappedProperty: IProperty = {
                    key: propertyKey,
                    items,
                    title: propertyTitle,
                    fields: this.comparisonResult(items)
                };
                result.push(mappedProperty);
            }
        }
        ;
        return result;
    }

    private mergeProperties(data: IProperty[]): IPropertyRow[] {
        const map = new Map<string, IProperty[]>();
        for (const p of data) {
            if (map.has(p.key)) {
                map.get(p.key)?.push(p);
            } else {
                map.set(p.key, [p]);
            }
        }
        const rows: IPropertyRow[] = [];
        for (const properties of map.values()) {
            rows.push({
                key: properties[0].key,
                title: properties[0].title,
                fields: properties[0].fields,
                isGroup: properties.length > 1,
                collapsed: true,
                properties
            });
        }
        rows.sort((a, b) => a.key < b.key ? -1 : 1);
        return rows;
    }

    private getProjectTitle(project: any, data: IGroup, index: number): string {
        if (data && data.filteredProperties) {
            for (const prop of data.filteredProperties) {
                if (prop.key === 'ActivityImpactModule.name') {
                    if (prop.fields && prop.fields[index] && prop.fields[index].value) {
                        return prop.fields[index].value;
                    } else {
                        return project.id;
                    }
                }
            }
        }
        return project.id;
    }

    private getSchemaName(documents: any): string {
        if (documents.left_schema) {
            return documents.left_schema;
        }
        if (documents.right_schema) {
            return documents.right_schema;
        }
        if (documents.size) {
            for (let index = 1; index < documents.size + 1; index++) {
                if (documents[`right_schema_${index}`]) {
                    return documents[`right_schema_${index}`];
                }
            }
        }
        return '';
    }

    private getSchemaNames(documents: any, count: number): string[] {
        const names = new Array<string>(count);
        for (let i = 0; i < count; i++) {
            if (i === 0) {
                names[i] = documents.left_schema;
            } else if (i === 1) {
                if (documents.right_schema) {
                    names[i] = documents.right_schema;
                } else {
                    names[i] = documents[`right_schema_${i}`];
                }
            } else {
                names[i] = documents[`right_schema_${i}`];
            }
        }
        return names;
    }

    private getFieldName(field: IField): string {
        if (this.properties) {
            for (const item of this.properties) {
                if (item.title === field.property) {
                    return item.value;
                }
            }
            return field.property || '';
        } else {
            return field.description || '';
        }
    }

    private comparisonResult(items: IField[]): IValue[] {
        let compFirstValue: any = [];
        for (const field of items) {
            const value = field?.value;
            compFirstValue.push(value);
        }
        const green = compFirstValue.every((v: any) => compFirstValue[0] === v);
        return items.map((field) => {
            if (field) {
                const value = field.value;
                let displayValue: string;
                if (field.type === 'object') {
                    displayValue = value ? '{ ... }' : 'N/A';
                } else if (field.type === 'array') {
                    if (value) {
                        if (Array.isArray(field.items)) {
                            displayValue = field.items.map(e => {
                                if (typeof e === 'object') {
                                    return '{}';
                                }
                                return String(e);
                            }).join(',');
                        } else {
                            displayValue = '[ ... ]';
                        }
                    } else {
                        displayValue = 'N/A';
                    }
                } else {
                    displayValue = value === undefined ? 'N/A' : String(value);
                }
                return { green, value, displayValue };
            } else {
                return { green, value: undefined, displayValue: 'N/A' };
            }
        })
    }
}
