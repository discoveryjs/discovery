export default {
    demo: {
        view: 'app-header',
        name: 'My app',
        version: '1.2.3',
        description: 'The best of the best app'
    },
    examples: [
        {
            title: 'Variations',
            demo: [
                'app-header',
                'app-header{ name: "Only name" }',
                'app-header{ name: "Name and version", version: "1.2.3" }',
                'app-header{ name: "Name and description", description: "Some description" }',
                'app-header{ name: "Everything set", version: "1.2.3", description: "Very useful description" }'
            ]
        }
    ]
};
