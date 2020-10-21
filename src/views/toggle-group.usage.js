/* eslint-env browser */

export default {
    demo: {
        view: 'context',
        modifiers: {
            view: 'toggle-group',
            name: 'toggleValue',
            data: [
                { value: 'one', text: 'One' },
                { value: 'two', text: 'Two' },
                { value: 'three', text: 'Three' }
            ]
        },
        content: {
            view: 'switch',
            content: [
                {
                    when: '#.toggleValue="one"',
                    content: 'text:"One"'
                },
                {
                    when: '#.toggleValue="two"',
                    content: 'text:"Two"'
                },
                {
                    when: '#.toggleValue="three"',
                    content: 'text:"Three"'
                }
            ]
        }
    },
    examples: [
        {
            title: 'With before and after content',
            demo: {
                view: 'toggle-group',
                data: [
                    { value: 'one', text: 'One' },
                    { value: 'two', text: 'Two' },
                    { value: 'three', text: 'Three' }
                ],
                beforeToggles: 'text:"<Content before toggles>"',
                afterToggles: 'text:"<Content after toggles>"'
            }
        },
        {
            title: 'On change handler',
            demo: {
                view: 'toggle-group',
                name: 'example',
                onChange: new Function('return (value) => alert("changed to " + value)')(),
                data: [
                    { value: 'one', text: 'One' },
                    { value: 'two', text: 'Two' },
                    { value: 'three', text: 'Three' }
                ]
            }
        }
    ]
};
