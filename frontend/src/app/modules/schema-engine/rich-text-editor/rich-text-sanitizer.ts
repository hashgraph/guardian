const ALLOWED_TAGS = new Set([
    'P', 'BR', 'DIV', 'SPAN',
    'B', 'STRONG', 'I', 'EM', 'U',
    'H1', 'H2', 'H3',
    'UL', 'OL', 'LI',
    'A'
]);

const DROPPED_WITH_CONTENT = new Set([
    'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'BASE', 'FORM', 'SVG', 'MATH'
]);

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
    A: ['href']
};

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

export function sanitizeRichText(html: string | null | undefined): string {
    if (!html) {
        return '';
    }
    const inert = document.implementation.createHTMLDocument('');
    inert.body.innerHTML = html;
    cleanChildren(inert.body);
    return inert.body.innerHTML;
}

export function isBlankRichText(html: string | null | undefined): boolean {
    if (!html) {
        return true;
    }
    const inert = document.implementation.createHTMLDocument('');
    inert.body.innerHTML = html;
    return (inert.body.textContent || '').trim() === '';
}

function cleanChildren(parent: Node): void {
    const children = Array.from(parent.childNodes);
    for (const node of children) {
        if (node.nodeType === Node.TEXT_NODE) {
            continue;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            parent.removeChild(node);
            continue;
        }
        const element = node as Element;
        const tag = element.tagName.toUpperCase();
        if (DROPPED_WITH_CONTENT.has(tag)) {
            parent.removeChild(element);
            continue;
        }
        cleanChildren(element);
        if (ALLOWED_TAGS.has(tag)) {
            cleanAttributes(element, tag);
        } else {
            unwrap(element, parent);
        }
    }
}

function cleanAttributes(element: Element, tag: string): void {
    const allowed = ALLOWED_ATTRIBUTES[tag] || [];
    for (const attribute of Array.from(element.attributes)) {
        const name = attribute.name.toLowerCase();
        if (!allowed.includes(name)) {
            element.removeAttribute(attribute.name);
            continue;
        }
        if (name === 'href' && !isSafeHref(attribute.value)) {
            element.removeAttribute(attribute.name);
        }
    }
    if (tag === 'A' && element.hasAttribute('href')) {
        element.setAttribute('rel', 'noopener noreferrer');
    }
}

function unwrap(element: Element, parent: Node): void {
    while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
}
