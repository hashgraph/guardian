
export interface XlsxError {
    type: 'error' | 'warning' | 'info';
    text: string;
    worksheet?: string;
    cell?: string;
    row?: number;
    col?: number;
    message?: string;
}
