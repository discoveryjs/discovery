export default (view, group) => ({
    demo: `${view}:'just a text'`,
    examples: [
        {
            title: 'Variations',
            demo: group.map(name => [
                `header:"${name}"`,
                'text:"…text…"',
                `${name}:"<${name}>"`,
                'text:"…text…"',
                `${name}:"<${name}\\nmulti-line>"`,
                'text:"…text…"',
                `${name}:"<${name}\\nmulti-line\\nmore…>"`,
                'text:"…text…"'
            ]).flat()
        },
        {
            title: 'Variations with border',
            demo: group.map(name => [
                `header:"${name}"`,
                'text:"…text…"',
                `${name}{ border: "#", data:"<${name}>" }`,
                'text:"…text…"',
                `${name}{ border: "#", data:"<${name}\\nmulti-line>" }`,
                'text:"…text…"',
                `${name}{ border: "#", data:"<${name}\\nmulti-line\\nmore…>" }`,
                'text:"…text…"'
            ]).flat()
        }
    ]
});
