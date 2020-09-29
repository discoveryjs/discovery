/* eslint-env browser */

export default [
    {
        title: 'Variations',
        view: [
            'button:{ text:"Default button" }',
            'button-primary:{ text:"Primary button" }',
            'button-danger:{ text:"Danger button" }',
            'button-warning:{ text:"Warning button" }'
        ]
    },
    {
        title: 'Default usage',
        view: {
            view: 'button',
            onClick: () => alert('Hi!'),
            data: {
                text: 'Hello world!'
            }
        }
    }
];
