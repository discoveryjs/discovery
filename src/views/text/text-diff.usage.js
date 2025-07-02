const types = ['char', 'word', 'wordws', 'sentence', 'line'];
const deltas = ['both', 'added', 'removed'];
const sameText = 'The sun is shining brightly. Birds are singing in the trees.';
const beforeText = 'The quick brown fox jumps over the lazy dog. It lands softly and runs away.\n' + sameText;
const afterText = 'A quick brown fox jumped over a lazy dog. It landed softly, then ran away.\n' + sameText;

export default {
    demo: {
        view: 'text-diff',
        before: 'Hello world!',
        after: 'Hello Discovery.js!'
    },
    examples: [
        {
            title: 'Types',
            demoData: types.map(type => ({ type, before: beforeText, after: afterText })),
            demo: {
                view: 'table',
                cols: [
                    { header: 'Type', content: ['text:type', { view: 'text', when: 'type="wordws"', text: ' (default)' }] },
                    { header: 'Preview', content: 'text-diff{ type }' }
                    // { header: 'Example', content: { view: 'source', syntax: 'discovery-view', source: '=`{ view: "text-diff", type: "${type}" }`', lineNum: false } }
                ]
            }
        },
        {
            title: 'Delta kinds',
            demoData: deltas.map(delta => ({ delta, before: beforeText, after: afterText })),
            demo: {
                view: 'table',
                cols: [
                    { header: 'Type', content: ['text:delta', { view: 'text', when: 'delta="both"', text: ' (default)' }] },
                    { header: 'Preview', content: 'text-diff{ delta }' }
                    // { header: 'Example', content: { view: 'source', syntax: 'discovery-view', source: '=`{ view: "text-diff", delta: "${delta}" }`', lineNum: false } }
                ]
            }
        }
    ]
};
