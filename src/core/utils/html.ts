const delimRegExp = /\.\d+(?:eE[-+]?\d+)?|\B(?=(?:\d{3})+(?:\D|$))/g;

export function escapeHtml(str: string) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export function numDelimOffsets(value: unknown) {
    const strValue = String(value);
    const offsets: number[] = [];
    let match: RegExpExecArray | null = null;

    while ((match = delimRegExp.exec(strValue)) !== null) {
        offsets.push(match.index);
    }

    return offsets;
}

export function numDelim(value: unknown, escape = true) {
    const strValue = escape && typeof value !== 'number'
        ? escapeHtml(String(value))
        : String(value);

    if (strValue.length > 3) {
        return strValue.replace(
            delimRegExp,
            m => m || '<span class="num-delim"></span>'
        );
    }

    return strValue;
}
