export function randomId() {
    return [
        performance.timeOrigin.toString(16),
        (10000 * performance.now()).toString(16),
        Math.random().toString(16).slice(2)
    ].join('-');
}
