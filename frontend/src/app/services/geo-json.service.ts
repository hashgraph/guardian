

import { Injectable } from '@angular/core';
import { GenerateUUIDv4 } from '@guardian/interfaces';

@Injectable()
export class GeoJsonService {
    private readonly files: Map<string, {
        id: string,
        name: string,
        data: any
    }> = new Map();

    constructor() {
    }

    public saveFile(name: string, data: any): string {
        const id = GenerateUUIDv4();
        
        this.files.set(id, { id, name, data });

        return id;
    }

    public getFile(id: string) {
        const file = this.files.get(id);
        
        if (!file) {
            return null;
        }

        return file.data;
    }

    public getFileNames(): Map<string, string> {
        const fileNameIdMap = new Map<string, string>();
        for (const [id, file] of this.files.entries()) {
            fileNameIdMap.set(id, file.name);
        }
        return fileNameIdMap;
    }
}
