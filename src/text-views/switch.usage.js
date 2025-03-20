export default {
    demo: {
        view: 'switch',
        content: [
            {
                when: 'expr',
                content: 'text:"Renders when `expr` is truthy"'
            },
            {
                content: 'text:"Renders when all other `when` conditions are falsy"'
            }
        ]
    }
};
