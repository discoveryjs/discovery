const onClick = () => {
    alert('clicked!'); // eslint-disable-line no-undef
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
        title: 'Active & disabled tab',
        view: {
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
        view: {
            view: 'tabs',
            name: 'tabs',
            tabs: [
                { value: 'one', text: 'One', onClick: onClick },
                { value: 'two', text: 'Two', onClick: onClick },
                { value: 'three', text: 'Three', onClick: onClick }
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
];
