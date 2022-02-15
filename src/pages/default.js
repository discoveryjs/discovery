export default function(host) {
    host.page.define('default', {
        view: 'switch',
        content: [
            {
                when: 'not #.dataLoaded',
                content: [
                    {
                        view: 'h1',
                        className: 'no-data-loaded',
                        content: 'text:"Discovery.js"'
                    },
                    {
                        view: 'markdown',
                        when: '#.meta.description',
                        source: '=#.meta.description'
                    },
                    'html:"<br>"',
                    'preset/upload'
                ]
            },
            {
                content: [
                    'page-header{ content: "h1:#.name" }',
                    { view: 'struct', expanded: 1 }
                ]
            }
        ]
    });
}
