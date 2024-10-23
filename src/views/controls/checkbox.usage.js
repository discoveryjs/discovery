/* eslint-env browser */

export default {
    demo: {
        view: 'checkbox',
        content: 'text:"checkbox caption"'
    },
    examples: [
        {
            title: 'Checked state',
            beforeDemo: 'Checked state is set up with `checked` property. Its value can be a query',
            demo: [
                {
                    view: 'checkbox',
                    checked: true,
                    content: 'text:"should be checked"'
                },
                {
                    view: 'checkbox',
                    checked: '1 > 5',
                    content: 'text:"shouldn\'t be checked"'
                },
                {
                    view: 'checkbox',
                    checked: '1 < 5',
                    content: 'text:"should be checked"'
                }
            ]
        },
        {
            title: 'Readonly checkbox',
            demo: {
                view: 'checkbox',
                readonly: true,
                content: 'text:"checkbox caption"'
            }
        },
        {
            title: 'On change',
            demo: {
                view: 'checkbox',
                // eslint-disable-next-line no-unused-vars
                onChange: Function('return (value, name, data, context) => alert(`Changed to ${value}!`)')(),
                content: 'text:"click me!"'
            }
        }
    ]
};
