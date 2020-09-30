const onChange = () => {
    alert('changed!'); // eslint-disable-line no-undef
};

export default [
    {
        title: 'Default usage',
        view: {
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
        }
    },
    {
        title: 'With before and after content',
        view: {
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
        view: {
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
];
