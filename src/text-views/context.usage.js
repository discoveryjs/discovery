export default {
    beforeDemo: ['md:"A non-visual view used to group views, manage their visibility, or explicitly define data and context for nested views. In the example, the `context` view sets up specific data and context, allowing nested views (`content`) to utilize these shared definitions directly:"'],
    demo: {
        view: 'context',
        data: { name: 'World', age: '1000 years' },
        context: '{ ...#, greeting: "Hello" }',
        content: [
            'text:`${#.greeting}, ${name}!`',
            'table'
        ]
    }
};
