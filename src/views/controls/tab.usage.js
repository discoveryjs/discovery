/* eslint-env browser */
const onClick = () => alert('clicked!');

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
            title: 'Active & disabled tab',
            demo: {
                view: 'tabs',
                name: 'tabs',
                tabs: [
                    { value: 'one', text: 'One' },
                    { value: 'two', text: 'Two', active: true },
                    { value: 'three', text: 'Three', disabled: true }
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
            }
        },
        {
            title: 'On click handler',
            demo: {
                view: 'tabs',
                name: 'tabs',
                tabs: [
                    { value: 'one', text: 'One', onClick },
                    { value: 'two', text: 'Two', onClick },
                    { value: 'three', text: 'Three', onClick }
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
            }
        }
    ]
};
