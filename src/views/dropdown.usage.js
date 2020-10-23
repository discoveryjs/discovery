/* eslint-env browser */
const onChange = new Function('return (value) => alert(`Changed to ${value}!`)')();

export default {
    demo: {
        view: 'context',
        modifiers: {
            view: 'dropdown',
            name: 'demo',
            value: { foo: 'two', bar: 'hello' },
            resetValue: { foo: 'one', bar: '' },
            caption: { view: 'struct', expanded: 1, data: '#' },
            content: [
                { view: 'select', name: 'foo', data: ['one', 'two', 'three', 'four'] },
                { view: 'input', name: 'bar' }
            ]
        },
        content: { view: 'struct', expanded: 1, data: '#' }
    }
};
