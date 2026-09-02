import { isSafeHref } from './rich-text-sanitizer';

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

const ESCAPED_MARKER = /\\([\\*`\[\]#+.-])/g;

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

function inline(text: string): string {
    const escaped: string[] = [];
    let out = escapeHtml(text).replace(ESCAPED_MARKER, (match, char) => {
        escaped.push(char);
        return `\u0000${escaped.length - 1}\u0000`;
    });
    out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) =>
        isSafeHref(url)
            ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
            : match
    );
    out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    out = out.replace(/\*([^*]+)\*/g, '<i>$1</i>');
    return out.replace(/\u0000(\d+)\u0000/g, (match, index) => escaped[Number(index)]);
}

export function markdownToHtml(markdown: string | null | undefined): string {
    if (!markdown) {
        return '';
    }
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const blocks: string[] = [];
    let list: { ordered: boolean, items: string[] } | null = null;
    const flush = (): void => {
        if (list) {
            const tag = list.ordered ? 'ol' : 'ul';
            blocks.push(`<${tag}>` + list.items.map((item) => `<li>${item}</li>`).join('') + `</${tag}>`);
            list = null;
        }
    };
    for (const line of lines) {
        const heading = /^(#{1,3})\s+(.*)$/.exec(line);
        const bullet = /^[-*]\s+(.*)$/.exec(line);
        const ordered = /^\d+\.\s+(.*)$/.exec(line);
        if (heading) {
            flush();
            blocks.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
        } else if (bullet || ordered) {
            const isOrdered = !!ordered;
            if (!list || list.ordered !== isOrdered) {
                flush();
                list = { ordered: isOrdered, items: [] };
            }
            list.items.push(inline((bullet || ordered)![1]));
        } else if (line.trim()) {
            flush();
            blocks.push(`<p>${inline(line)}</p>`);
        } else {
            flush();
        }
    }
    flush();
    return blocks.join('');
}

function inlineToMarkdown(node: Node): string {
    let out = '';
    for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
            out += escapeMarkdown((child.textContent || '').replace(/ /g, ' '));
            continue;
        }
        if (!(child instanceof Element)) {
            continue;
        }
        const tag = child.tagName;
        const text = inlineToMarkdown(child);
        if (tag === 'B' || tag === 'STRONG') {
            out += text ? `**${text}**` : '';
        } else if (tag === 'I' || tag === 'EM') {
            out += text ? `*${text}*` : '';
        } else if (tag === 'A') {
            const href = child.getAttribute('href') || '';
            out += href ? `[${text}](${href})` : text;
        } else if (tag === 'BR') {
            out += '\n';
        } else {
            out += text;
        }
    }
    return out;
}

export function htmlToMarkdown(html: string | null | undefined): string {
    if (!html) {
        return '';
    }
    const inert = document.implementation.createHTMLDocument('');
    inert.body.innerHTML = html;
    const blocks: string[] = [];
    for (const node of Array.from(inert.body.childNodes)) {
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
            blocks.push('#'.repeat(Number(tag[1])) + ' ' + inlineToMarkdown(node));
        } else if (tag === 'UL' || tag === 'OL') {
            const items = Array.from(node.children).map((item, index) =>
                (tag === 'OL' ? `${index + 1}. ` : '- ') + inlineToMarkdown(item)
            );
            if (items.length) {
                blocks.push(items.join('\n'));
            }
        } else {
            const text = inlineToMarkdown(node).trim();
            if (text) {
                blocks.push(escapeLineStarts(text));
            }
        }
    }
    return blocks.join('\n\n');
}
