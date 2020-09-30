export default [
    {
        title: 'Default usage',
        view: {
            view: 'switch',
            data: { enabled: true },
            content: [
                {
                    when: 'no enabled',
                    content: 'text:"I am disabled"'
                },
                {
                    when: 'enabled',
                    content: 'text:"I am enabled"'
                }
            ]
        }
    },
    {
        title: 'When no cases',
        view: {
            view: 'switch',
            data: {},
            content: [
                {
                    when: 'enabled',
                    content: 'text:"I am enabled"'
                }
            ]
        }
    }
];
