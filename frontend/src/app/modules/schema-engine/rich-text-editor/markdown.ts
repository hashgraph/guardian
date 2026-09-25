import { isSafeHref } from './rich-text-sanitizer';

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

function isSafeImageReference(value: string): boolean {
    return IPFS_REFERENCE.test(value) || isSafeHref(value);
}

function escapeMarkdown(text: string): string {
    return text.replace(/[\\*`\[\]]/g, '\\$&');
}

function escapeLineStarts(text: string): string {
    return text
        .split('\n')
        .map((line) => line
            .replace(/^(#{1,3})(\s)/, '\\$1$2')
            .replace(/^([-+])(\s)/, '\\$1$2')
            .replace(/^(\d+)\.(\s)/, '$1\\.$2')
        )
        .join('\n');
}

const IMAGE_MARKER = /!\[((?:\\.|[^\]\\])*)\]\(([^)\s]+)\)/g;

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

export function splitTableRow(line: string): string[] {
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

function inlineNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
        return escapeMarkdown((node.textContent || '').replace(/\u00a0/g, ' '));
    }
    if (!(node instanceof Element)) {
        return '';
    }
    const tag = node.tagName;
    if (tag === 'UL' || tag === 'OL' || tag === 'TABLE') {
        return '';
    }
    const text = inlineToMarkdown(node);
    if (tag === 'B' || tag === 'STRONG') {
        return text ? `**${text}**` : '';
    }
    if (tag === 'I' || tag === 'EM') {
        return text ? `*${text}*` : '';
    }
    if (tag === 'A') {
        const href = node.getAttribute('href') || '';
        return href ? `[${text}](${href})` : text;
    }
    if (tag === 'IMG') {
        const reference = node.getAttribute('data-src') || node.getAttribute('src') || '';
        const alt = escapeMarkdown(node.getAttribute('alt') || '');
        return reference ? `![${alt}](${reference})` : '';
    }
    if (tag === 'BR') {
        return '\n';
    }
    return text;
}

function isNestedBlock(node: Node): boolean {
    return node instanceof Element && (node.tagName === 'DIV' || node.tagName === 'P');
}

function inlineToMarkdown(node: Node): string {
    let out = '';
    for (const child of Array.from(node.childNodes)) {
        const text = inlineNode(child);
        if (!text) {
            continue;
        }
        if (isNestedBlock(child) && out && !out.endsWith('\n')) {
            out += '\n';
        }
        out += text;
    }
    return out;
}

const BLOCK_TAGS = ['H1', 'H2', 'H3', 'UL', 'OL', 'P', 'DIV', 'TABLE'];

function hasBlockChildren(element: Element): boolean {
    return Array.from(element.children).some((child) => BLOCK_TAGS.includes(child.tagName));
}

function singleLine(text: string): string {
    return text.replace(/\s*\n\s*/g, ' ').trim();
}

function continuedLines(text: string, depth: number): string {
    const pad = INDENT.repeat(depth + 1);
    return text
        .split('\n')
        .map((line, index) => (index ? pad + line.trim() : line))
        .filter((line, index) => index === 0 || line.trim())
        .join('\n');
}

function isListElement(node: Node): boolean {
    return node instanceof Element && (node.tagName === 'UL' || node.tagName === 'OL');
}

function listLines(list: Element, depth: number): string[] {
    const ordered = list.tagName === 'OL';
    const lines: string[] = [];
    let index = 0;
    for (const child of Array.from(list.children)) {
        if (isListElement(child)) {
            lines.push(...listLines(child, depth + 1));
            continue;
        }
        if (child.tagName !== 'LI') {
            continue;
        }
        index++;
        const marker = ordered ? `${index}. ` : '- ';
        lines.push(INDENT.repeat(depth) + marker + continuedLines(inlineToMarkdown(child), depth));
        for (const nested of Array.from(child.children)) {
            if (isListElement(nested)) {
                lines.push(...listLines(nested, depth + 1));
            }
        }
    }
    return lines;
}

function tableRowElements(table: Element): Element[] {
    const rows: Element[] = [];
    for (const child of Array.from(table.children)) {
        if (child.tagName === 'THEAD' || child.tagName === 'TBODY' || child.tagName === 'TFOOT') {
            rows.push(...Array.from(child.children).filter((row) => row.tagName === 'TR'));
        } else if (child.tagName === 'TR') {
            rows.push(child);
        }
    }
    return rows;
}

function tableCellText(cell: Element): string {
    return singleLine(inlineToMarkdown(cell)).replace(/\|/g, '\\|');
}

function tableLines(table: Element): string[] {
    const rows = tableRowElements(table).map((row) => Array.from(row.children)
        .filter((cell) => cell.tagName === 'TH' || cell.tagName === 'TD')
        .map((cell) => tableCellText(cell))
    );
    const width = rows.length ? Math.max(...rows.map((row) => row.length)) : 0;
    if (!width) {
        return [];
    }
    const line = (row: string[]): string =>
        '| ' + Array.from({ length: width }, (unused, index) => row[index] ?? '').join(' | ') + ' |';
    return [
        line(rows[0]),
        '| ' + Array.from({ length: width }, () => '---').join(' | ') + ' |',
        ...rows.slice(1).map(line),
    ];
}

function collectBlocks(parent: Node, blocks: string[]): void {
    for (const node of Array.from(parent.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = (node.textContent || '').trim();
            if (text) {
                blocks.push(escapeLineStarts(escapeMarkdown(text)));
            }
            continue;
        }
        if (!(node instanceof Element)) {
            continue;
        }
        const tag = node.tagName;
        if (tag === 'H1' || tag === 'H2' || tag === 'H3') {
            blocks.push('#'.repeat(Number(tag[1])) + ' ' + singleLine(inlineToMarkdown(node)));
        } else if (tag === 'UL' || tag === 'OL') {
            const items = listLines(node, 0);
            if (items.length) {
                blocks.push(items.join('\n'));
            }
        } else if (tag === 'TABLE') {
            const rows = tableLines(node);
            if (rows.length) {
                blocks.push(rows.join('\n'));
            }
        } else if (hasBlockChildren(node)) {
            collectBlocks(node, blocks);
        } else {
            const text = inlineNode(node).trim();
            if (text) {
                blocks.push(escapeLineStarts(text));
            }
        }
    }
}

export function htmlToMarkdown(html: string | null | undefined): string {
    if (!html) {
        return '';
    }
    const inert = document.implementation.createHTMLDocument('');
    inert.body.innerHTML = html;
    const blocks: string[] = [];
    collectBlocks(inert.body, blocks);
    return blocks.join('\n\n');
}
