export default function(discovery) {
    discovery.page.define('not-found', [
        'alert-warning:"Page \`" + name + "\` not found"'
    ]);
}
