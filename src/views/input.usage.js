/* eslint-env browser */
const onChange = new Function('return (value) => alert(`Changed to ${value}!`)')();

export default {
    examples: [
        {
            title: 'Input with value',
            demo: {
                view: 'input',
                value: '"value"'
            }
        },
        {
            title: 'Input with placeholder',
            demo: {
                view: 'input',
                placeholder: 'placeholder'
            }
        },
        {
            title: 'Input type number with min and max',
            demo: {
                view: 'input',
                htmlType: 'number',
                htmlMin: 10,
                htmlMax: 20
            }
        },
        {
            title: 'Input with onChange',
            demo: {
                view: 'input',
                onChange: onChange
            }
        },
        {
            title: 'Input with onChange debounced',
            demo: {
                view: 'input',
                onChange: onChange,
                debounce: 300
            }
        }
    ]
};
