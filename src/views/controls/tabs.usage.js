/* eslint-env browser */

export default {
    demo: {
        view: 'tabs',
        name: 'tabs',
        value: 'two',
        tabs: [
            { value: 'one', text: 'One' },
            { value: 'two', text: 'Two' },
            { value: 'three', text: 'Three' }
        ],
        content: {
            view: 'switch',
            content: [
                {
                    when: '#.tabs="one"',
                    content: 'text:"One"'
                },
                {
                    when: '#.tabs="two"',
                    content: 'text:"Two"'
                },
                {
                    when: '#.tabs="three"',
                    content: 'text:"Three"'
                }
            ]
        }
    },
    examples: [
        {
            title: 'Value is default text',
            demo: {
                view: 'tabs',
                name: 'tabsValue',
                tabs: ['foo', 'bar', 'baz'],
                content: 'struct:#.tabsValue'
            }
        },
        {
            title: 'With before and after content',
            demo: {
                view: 'tabs',
                name: 'example',
                tabs: [
                    { value: 'one', text: 'One' },
                    { value: 'two', text: 'Two' },
                    { value: 'three', text: 'Three' }
                ],
                beforeTabs: 'text:"<Content before tabs>"',
                afterTabs: 'text:"<Content after tabs>"',
                content: 'text:"Selected: " + #.example'
            }
        },
        {
            title: 'On change handler',
            demo: {
                view: 'tabs',
                tabs: [
                    { value: 'one', text: 'One' },
                    { value: 'two', text: 'Two' },
                    { value: 'three', text: 'Three' }
                ],
                onChange: Function('return (value) => alert("changed to " + value)')(),
                content: 'text:"Selected: " + #.filter'
            }
        }
    ]
};
