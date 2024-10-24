import CodeMirror from 'codemirror';

const beforeChange = function (cm: any, event: any) {
    // Identify typing events that add a newline to the buffer.
    const hasTypedNewline = (
        event.origin === '+input' &&
        typeof event.text === 'object' &&
        event.text.join('') === '');

    // Prevent newline characters from being added to the buffer.
    if (hasTypedNewline) {
        return event.cancel();
    }

    // Identify paste events.
    const hasPastedNewline = (
        event.origin === 'paste' &&
        typeof event.text === 'object' &&
        event.text.length > 1);

    // Format pasted text to replace newlines with spaces.
    if (hasPastedNewline) {
        const newText = event.text.join(' ');
        return event.update(null, null, [newText]);
    }

    return null;
}

CodeMirror.defineOption('singleLine', false, function (cm, val, old) {
    if (val === true && old !== true) {
        cm.on('beforeChange', beforeChange)
    } else if (val === false && old === true) {
        cm.off('beforeChange', beforeChange)
    }
})