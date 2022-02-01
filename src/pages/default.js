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
                        when: '#.modelfree',
                        source: 'Running in `model free mode` since no config or model is set. However, you can load the JSON file, analyse it, and create your own report.\n\nSee <a class="view-link" href="https://github.com/discoveryjs/discovery/blob/master/README.md" href="_blank">documention</a> for details.'
                    },
                    {
                        view: 'markdown',
                        when: 'meta.description',
                        source: '=meta.description'
                    },
                    'html:"<br>"',
                    {
                        view: 'button-primary',
                        onClick: '=#.actions.uploadFile',
                        content: 'text:`Open file ${#.actions.uploadFile.fileExtensions | $ ? "(" + join(", ") + ")" : ""}`'
                    },
                    'html:"<span style=\\"color: #888; padding: 0 1ex\\"> or </span>"',
                    'text:"drop a file on the page"'
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
