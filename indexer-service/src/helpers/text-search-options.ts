export function textSearch(document: any) {
    return `${document.topicId}|${document.owner}|${
        document.consensusTimestamp
    }|${document.uuid}|${document.status}|${document.type}|${
        document.lang
    }|${textSearchOptions(document.options)}`;
}

export function textSearchOptions(options: any) {
    let search = '';
    if (!options) {
        return search;
    }
    for (const key in options) {
        if (typeof options[key] === 'string') {
            search += `|${options[key]}`;
        }
    }
    return search;
}
