const onChange = () => {
    alert('changed!'); // eslint-disable-line no-undef
};

export default [
    {
        title: 'Default usage',
        view: {
            view: 'select',
            data: ['one', 'two', 'three', 'four']
        }
    },
    {
        title: 'Select with value',
        view: {
            view: 'select',
            value: '"three"',
            data: ['one', 'two', 'three', 'four']
        }
    },
    {
        title: 'Select with reset option',
        view: {
            view: 'select',
            resetItem: true,
            value: '"three"',
            data: ['one', 'two', 'three', 'four']
        }
    },
    {
        title: 'Select with placeholder',
        view: {
            view: 'select',
            placeholder: 'placeholder',
            data: ['one', 'two', 'three', 'four']
        }
    },
    {
        title: 'Select with onChange',
        view: {
            view: 'select',
            onChange: onChange,
            data: ['one', 'two', 'three', 'four']
        }
    },
    {
        title: 'Select with custom options',
        view: {
            view: 'select',
            item: 'h1:text',
            data: ['one', 'two', 'three', 'four']
        }
    }
];
