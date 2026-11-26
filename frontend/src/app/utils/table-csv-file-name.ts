export function tableCsvFileName(label?: string | null): string {
    const name = (label ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim();
    return name ? `${name}.csv` : `table-${Date.now()}.csv`;
}
