export function normalizeSource(text) {
    text = text
        // cut first empty lines
        .replace(/^(?:\s*[\n]+)+?([ \t]*)/, '$1')
        .trimRight();

    // fix empty strings
    text = text.replace(/\n[ \t]+(?=\n)/g, '\n');

    // normalize text offset
    const lines = text.split(/\n+/);
    const startLine = Number(text.match(/^\s/) === null);
    let minOffset = 1000;

    for (var i = startLine; i < lines.length; i++) {
        const m = lines[i].match(/^\s*/);

        if (m[0].length < minOffset) {
            minOffset = m[0].length;
        }

        if (minOffset == 0) {
            break;
        }
    }

    if (minOffset > 0) {
        text = text.replace(new RegExp('^ {' + minOffset + '}', 'gm'), '$1');
    }

    return text;
}
