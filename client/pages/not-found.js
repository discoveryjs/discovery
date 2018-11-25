export default function(discovery) {
    discovery.definePage('not-found', [
        'alert-warning:"Page \`" + name + "\` not found"'
    ]);
}
