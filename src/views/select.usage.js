/* eslint-env browser */
const onChange = new Function('return (value) => alert(`Changed to ${value}!`)')();

export default {
    demo: {
        view: 'select',
        data: ['one', 'two', 'three', 'four']
    },
    examples: [
        {
            title: 'Select with value',
            demo: {
                view: 'select',
                value: '"three"',
                data: ['one', 'two', 'three', 'four']
            }
        },
        {
            title: 'Select with reset option',
            demo: {
                view: 'select',
                resetItem: true,
                value: '"three"',
                data: ['one', 'two', 'three', 'four']
            }
        },
        {
            title: 'Select with placeholder',
            demo: {
                view: 'select',
                placeholder: 'placeholder',
                data: ['one', 'two', 'three', 'four']
            }
        },
        {
            title: 'Select with onChange',
            demo: {
                view: 'select',
                onChange: onChange,
                data: ['one', 'two', 'three', 'four']
            }
        },
        {
            title: 'Select with custom options',
            demo: {
                view: 'select',
                item: 'h1:text',
                data: ['one', 'two', 'three', 'four']
            }
        }
    ]
};
