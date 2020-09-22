export default [
    {
        title: 'Default usage',
        view: {
            view: 'indicator',
            data: {
                label: 'Label',
                value: '1234'
            }
        }
    },
    {
        title: 'Indicator as link',
        view: {
            view: 'indicator',
            data: {
                label: 'Label',
                value: '4321',
                href: '#'
            }
        }
    }
];
