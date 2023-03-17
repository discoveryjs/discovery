export function randomId() {
    return [
        parseInt(performance.timeOrigin, 10).toString(16),
        parseInt(10000 * performance.now(), 10).toString(16),
        String(Math.random().toString(16).slice(2))
    ].join('-');
}
