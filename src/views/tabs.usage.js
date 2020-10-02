/* eslint-env browser */
const onChange = () => alert('changed!');

export default {
    demo: {
        view: 'tabs',
        name: 'tabs',
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
            title: 'With before and after content',
            demo: {
                view: 'tabs',
                name: 'tabs',
                tabs: [
                    { value: 'one', text: 'One' },
                    { value: 'two', text: 'Two' },
                    { value: 'three', text: 'Three' }
                ],
                beforeTabs: 'h1:"I am before tabs"',
                afterTabs: 'h1:"I am after tabs"',
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
            }
        },
        {
            title: 'On change handler',
            demo: {
                view: 'tabs',
                name: 'tabs',
                tabs: [
                    { value: 'one', text: 'One' },
                    { value: 'two', text: 'Two' },
                    { value: 'three', text: 'Three' }
                ],
                onChange: onChange,
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
            }
        }
    ]
};
