import { MatDialogConfig } from "@angular/material/dialog";

export function mobileDialog<T>(config: MatDialogConfig<T>): MatDialogConfig<T> {
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    if (innerWidth <= 810) {
        const bodyStyles = window.getComputedStyle(document.body);
        const headerHeight: number = parseInt(bodyStyles.getPropertyValue('--header-height'));
        config = Object.assign(config, {
            width: `${innerWidth.toString()}px`,
            height: `${innerHeight - headerHeight}px`,
            maxWidth: '100vw',
            position: {
                'bottom': '0'
            },
            hasBackdrop: true, // Shadows beyond the dialog
            closeOnNavigation: true,
            autoFocus: false
        });
    }
    return config;
}