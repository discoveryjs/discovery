/* eslint-env browser */
export default {
    demo: {
        view: 'context',
        modifiers: {
            view: 'dropdown',
            name: 'demo',
            value: { foo: 'two', bar: 'hello' },
            resetValue: { foo: 'one', bar: '' },
            caption: 'text:`${#.demo.foo} / ${#.demo.bar}`',
            content: [
                { view: 'select', name: 'foo', data: ['one', 'two', 'three', 'four'] },
                { view: 'input', name: 'bar' }
            ]
        },
        content: [
            { view: 'block', content: 'text:"Modified context (see values in \\"demo\\" section):"' },
            { view: 'struct', expanded: 1, data: '#' }
        ]
    }
};
