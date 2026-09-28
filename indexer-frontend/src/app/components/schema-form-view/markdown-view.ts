import { isSafeHref } from './rich-text-view';

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const ESCAPED_MARKER = /\\([\\*`\[\]#+.-])/g;

const IPFS_REFERENCE = /^ipfs:\/\/[a-zA-Z0-9]+$/;

const IMAGE_MARKER = /!\[((?:\\.|[^\]\\])*)\]\(([^)\s]+)\)/g;

function isSafeImageReference(value: string): boolean {
    return IPFS_REFERENCE.test(value) || isSafeHref(value);
}

export function collectImageReferences(markdown: string | null | undefined): string[] {
    if (typeof markdown !== 'string' || !markdown) {
        return [];
    }
    const references: string[] = [];
    for (const match of Array.from(markdown.matchAll(IMAGE_MARKER))) {
        const reference = match[2];
        if (IPFS_REFERENCE.test(reference) && !references.includes(reference)) {
            references.push(reference);
        }
    }
    return references;
}

function inline(text: string, resolved?: Map<string, string>): string {
    const escaped: string[] = [];
    let out = escapeHtml(text).replace(ESCAPED_MARKER, (match, char) => {
        escaped.push(char);
        return `\u0000${escaped.length - 1}\u0000`;
    });
    out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (match, alt, url) =>
        isSafeImageReference(url)
            ? `<img src="${resolved?.get(url) || ''}" data-src="${url}" alt="${alt}">`
            : match
    );
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) =>
        isSafeHref(url)
            ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
            : match
    );
    out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    out = out.replace(/\*([^*]+)\*/g, '<i>$1</i>');
    return out.replace(/\u0000(\d+)\u0000/g, (match, index) => escaped[Number(index)]);
}

const LIST_LINE = /^( *)(?:[-*]|\d+\.)\s+(.*)$/;

const ORDERED_LIST_LINE = /^ *\d+\./;

const INDENT = '  ';

interface MarkdownListItem {
    content: string;
    children: MarkdownList | null;
}

interface MarkdownList {
    ordered: boolean;
    items: MarkdownListItem[];
}

function renderList(list: MarkdownList): string {
    const tag = list.ordered ? 'ol' : 'ul';
    const items = list.items
        .map((item) => `<li>${item.content}${item.children ? renderList(item.children) : ''}</li>`)
        .join('');
    return `<${tag}>${items}</${tag}>`;
}

const TABLE_ROW = /^\s*\|.*\|\s*$/;

const TABLE_DIVIDER = /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/;

function splitTableRow(line: string): string[] {
    const body = line.trim().replace(/^\|/, '').replace(/\|$/, '');
    const cells: string[] = [];
    let current = '';
    for (let index = 0; index < body.length; index++) {
        const character = body[index];
        if (character === '\\' && body[index + 1] === '|') {
            current += '|';
            index++;
            continue;
        }
        if (character === '|') {
            cells.push(current.trim());
            current = '';
            continue;
        }
        current += character;
    }
    cells.push(current.trim());
    return cells;
}

function tableAt(lines: string[], index: number): { rows: string[][], next: number } | null {
    if (!TABLE_ROW.test(lines[index]) || !TABLE_DIVIDER.test(lines[index + 1] || '')) {
        return null;
    }
    const rows = [splitTableRow(lines[index])];
    let next = index + 2;
    while (next < lines.length && TABLE_ROW.test(lines[next]) && !TABLE_DIVIDER.test(lines[next])) {
        rows.push(splitTableRow(lines[next]));
        next++;
    }
    return { rows, next };
}

function renderTable(rows: string[][], resolved?: Map<string, string>): string {
    const width = Math.max(...rows.map((row) => row.length));
    const cells = (row: string[], tag: string): string => '<tr>'
        + Array.from({ length: width }, (unused, index) =>
            `<${tag}>${inline(row[index] ?? '', resolved)}</${tag}>`).join('')
        + '</tr>';
    const head = `<thead>${cells(rows[0], 'th')}</thead>`;
    const body = rows.length > 1
        ? `<tbody>${rows.slice(1).map((row) => cells(row, 'td')).join('')}</tbody>`
        : '';
    return `<table>${head}${body}</table>`;
}

export function markdownToHtml(markdown: string | null | undefined, resolved?: Map<string, string>): string {
    if (!markdown) {
        return '';
    }
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const blocks: string[] = [];
    let root: MarkdownList | null = null;
    let stack: MarkdownList[] = [];
    const flush = (): void => {
        if (root) {
            blocks.push(renderList(root));
            root = null;
            stack = [];
        }
    };
    const start = (ordered: boolean, content: string): void => {
        root = { ordered, items: [{ content, children: null }] };
        stack = [root];
    };
    const openItem = (): MarkdownListItem | null => {
        const list = stack[stack.length - 1];
        return list && list.items.length ? list.items[list.items.length - 1] : null;
    };
    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        const heading = /^(#{1,3})\s+(.*)$/.exec(line);
        const listLine = LIST_LINE.exec(line);
        const table = tableAt(lines, index);
        if (heading) {
            flush();
            blocks.push(`<h${heading[1].length}>${inline(heading[2], resolved)}</h${heading[1].length}>`);
        } else if (table) {
            flush();
            blocks.push(renderTable(table.rows, resolved));
            index = table.next - 1;
        } else if (listLine) {
            const ordered = ORDERED_LIST_LINE.test(line);
            const content = inline(listLine[2], resolved);
            if (!root) {
                start(ordered, content);
                continue;
            }
            const depth = Math.min(Math.floor(listLine[1].length / INDENT.length), stack.length);
            if (depth === stack.length) {
                const parent = openItem();
                if (parent) {
                    const child: MarkdownList = { ordered, items: [] };
                    parent.children = child;
                    stack.push(child);
                }
            } else {
                stack.length = depth + 1;
            }
            const target = stack[stack.length - 1];
            if (target === root && target.ordered !== ordered) {
                flush();
                start(ordered, content);
                continue;
            }
            target.items.push({ content, children: null });
        } else if (openItem() && /^ {2,}\S/.test(line)) {
            const item = openItem()!;
            item.content += '<br>' + inline(line.trim(), resolved);
        } else if (line.trim()) {
            flush();
            blocks.push(`<p>${inline(line, resolved)}</p>`);
        } else {
            flush();
        }
    }
    flush();
    return blocks.join('');
}
