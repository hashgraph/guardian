import { isSafeHref } from './rich-text-view';

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

const ESCAPED_MARKER = /\\([\\*`\[\]#+.-])/g;

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
