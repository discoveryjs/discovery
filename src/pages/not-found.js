export default function(host) {
    host.page.define('not-found', [
        'alert-warning:"Page \`" + name + "\` not found"'
    ]);
}
