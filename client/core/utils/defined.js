export default function defined(values, fallback) {
    for (let i = 0; i < values.length; i++) {
        if (typeof values[i] !== 'undefined') {
            return values[i];
        }
    }

    return fallback;
}
