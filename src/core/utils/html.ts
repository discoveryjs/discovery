export function escapeHtml(str: string) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export function numDelim(value: any, escape = true) {
    const strValue = escape && typeof value !== 'number'
        ? escapeHtml(String(value))
        : String(value);

    if (strValue.length > 3) {
        return strValue.replace(
            /\.\d+(eE[-+]?\d+)?|\B(?=(\d{3})+(\D|$))/g,
            m => m || '<span class="num-delim"></span>'
        );
    }

    return strValue;
}
