/* eslint-env browser */
const onChange = new Function('return (value) => alert(`Changed to ${value}!`)')();

export default {
    demo: {
        view: 'context',
        modifiers: {
            view: 'dropdown',
            name: 'demo',
            value: { foo: 'two', bar: 'hello' },
            caption: 'struct:#',
            content: [
                { view: 'select', name: 'foo', data: ['one', 'two', 'three', 'four'] },
                { view: 'input', name: 'bar' }
            ]
        },
        content: { view: 'struct', expanded: 1, data: '#' }
    },
    examples: [
        {
            title: 'Select with value',
            demo: {
                view: 'dropdown',
                value: '"three"',
                data: ['one', 'two', 'three', 'four']
            }
        },
        {
            title: 'Select with reset option',
            demo: {
                view: 'dropdown',
                resetItem: true,
                value: '"three"',
                data: ['one', 'two', 'three', 'four']
            }
        },
        {
            title: 'Select with placeholder',
            demo: {
                view: 'dropdown',
                placeholder: 'placeholder',
                data: ['one', 'two', 'three', 'four']
            }
        },
        {
            title: 'Select with onChange',
            demo: {
                view: 'dropdown',
                onChange,
                data: ['one', 'two', 'three', 'four']
            }
        },
        {
            title: 'Select with custom options',
            demo: {
                view: 'dropdown',
                item: 'h1:text',
                data: ['one', 'two', 'three', 'four']
            }
        }
    ]
};
