export default {
    demo: {
        view: 'source',
        data: { content: 'var hello = "world";', syntax: 'js' }
    },
    examples: [
        {
            title: 'Supported syntaxes',
            beforeDemo: [
                'md:"Following values (for both `name` and `mime`) are supported for `syntax` option:"',
                {
                    view: 'table',
                    data: '#.options.syntaxes',
                    cols: {
                        name: { content: 'comma-list:name' },
                        mime: { content: 'comma-list:mime' }
                    }
                },
                'md:"More syntaxes may be added via `import \'codemirror/mode/[name]/[name]\';`"'
            ],
            source: false
        }
    ]
};
