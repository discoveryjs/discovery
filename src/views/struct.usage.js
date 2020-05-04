export default [
    {
        title: 'Basic',
        view: [
            'struct',
            'struct:#'
        ]
    },
    {
        title: 'Define expanded levels by default and limit entries when collapsed and expanded',
        view: {
            view: 'struct',
            expanded: 2,
            limit: 5,
            limitCollapsed: 1
        }
    }
];
