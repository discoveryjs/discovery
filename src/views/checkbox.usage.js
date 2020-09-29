/* eslint-env browser */

export default [
    {
        title: 'Default usage',
        view: {
            view: 'checkbox',
            content: 'text:"label"'
        }
    },
    {
        title: 'Checked checkbox',
        view: {
            view: 'checkbox',
            checked: true,
            content: 'text:"label"'
        }
    },
    {
        title: 'Readonly checkbox',
        view: {
            view: 'checkbox',
            readonly: true,
            content: 'text:"label"'
        }
    },
    {
        title: 'On change',
        view: {
            view: 'checkbox',
            // eslint-disable-next-line no-unused-vars
            onChange: (value, name, data, context) => alert(`Changed to ${value}!`),
            content: 'text:"click me!"'
        }
    }
];
