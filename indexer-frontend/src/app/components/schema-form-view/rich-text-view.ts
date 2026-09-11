const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

const PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

export function isSafeHref(value: string): boolean {
    const url = value.replace(/[\s\u0000-\u001F]/g, '');
    if (!url) {
        return false;
    }
    const protocol = PROTOCOL_PATTERN.exec(url);
    if (!protocol) {
        return true;
    }
    return ALLOWED_PROTOCOLS.includes(protocol[0].toLowerCase());
}

export function withNewTabLinks(value: unknown): string {
    if (typeof value !== 'string') {
        return '';
    }
    const inert = document.implementation.createHTMLDocument('');
    inert.body.innerHTML = value;
    for (const link of Array.from(inert.body.querySelectorAll('a[href]'))) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    }
    return inert.body.innerHTML;
}
