import { HttpParams } from '@angular/common/http';

interface IFilters {
    [field: string]: any;
}

export class ApiUtils {
    public static getQueryParams(filters: IFilters): HttpParams | null {
        if (typeof filters === 'object') {
            let params: HttpParams = new HttpParams();
            for (const key of Object.keys(filters)) {
                params = params.set(key, filters[key]);
            }
            return params;
        } else {
            return null;
        }
    }

    public static getOptions(filters: IFilters): any {
        const params = ApiUtils.getQueryParams(filters);
        return params ? { params } : {};
    }
}
