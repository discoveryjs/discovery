const onChange = () => {
    alert('changed!'); // eslint-disable-line no-undef
};

export default [
    {
        title: 'Default usage',
        view: {
            view: 'checkbox',
            content: [
                'text:"label"'
            ]
        }
    },
    {
        title: 'Checked checkbox',
        view: {
            view: 'checkbox',
            checked: true,
            content: [
                'text:"label"'
            ]
        }
    },
    {
        title: 'Readonly checkbox',
        view: {
            view: 'checkbox',
            readonly: true,
            content: [
                'text:"label"'
            ]
        }
    },
    {
        title: 'On change',
        view: {
            view: 'checkbox',
            onChange: onChange,
            content: [
                'text:"click me!"'
            ]
        }
    }
];
