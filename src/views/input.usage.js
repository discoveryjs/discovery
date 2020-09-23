const onChange = () => {
    alert('changed!'); // eslint-disable-line no-undef
};

export default [
    {
        title: 'Default usage',
        view: {
            view: 'input'
        }
    },
    {
        title: 'Input with value',
        view: {
            view: 'input',
            value: '"value"'
        }
    },
    {
        title: 'Input with placeholder',
        view: {
            view: 'input',
            placeholder: 'placeholder'
        }
    },
    {
        title: 'Input type number with min and max',
        view: {
            view: 'input',
            htmlType: 'number',
            htmlMin: 10,
            htmlMax: 20
        }
    },
    {
        title: 'Input with onChange',
        view: {
            view: 'input',
            onChange: onChange
        }
    },
    {
        title: 'Input with onChange debounced',
        view: {
            view: 'input',
            onChange: onChange,
            debounce: 300
        }
    }
];
