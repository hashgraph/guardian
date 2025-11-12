
export class SheetName {
    private readonly nameCache = new Set<string>();

    public getSheetName(name: string, size: number): string {
        let id = ((name || '')
            .replace(/[\*,\?,\:,\\,\/,\[,\]]/ig, '')
            .slice(0, Math.min(size, 30)))
            .trim();

        if (!id) {
            id = 'blank';
        }

        const key = id.toLocaleLowerCase();

        if (this.nameCache.has(key)) {
            const base = id.slice(0, Math.min(size - 3, 27));

            let index = 1;
            let newId = base;
            let newKey = key;
            do {
                index++;
                newId = base + ' ' + index;
                newKey = newId.toLocaleLowerCase().trim();
            } while (this.nameCache.has(newKey));

            this.nameCache.add(newKey);
            return newId;

        } else {
            this.nameCache.add(key);
            return id;
        }
    }

    public getSchemaName(name: string): string {
        return this.getSheetName(name, 30);
    }

    public getToolName(name: string): string {
        return this.getSheetName(name, 23) + ' (tool)';
    }

    public getEnumName(name: string): string {
        return this.getSheetName(name, 23) + ' (enum)';
    }
}
