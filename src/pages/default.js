export default function(host) {
    host.page.define('default', {
        view: 'switch',
        content: [
            {
                when: 'no #.datasets',
                content: 'preset/welcome-block'
            },
            {
                content: [
                    'page-header{ content: "h1:#.name" }',
                    { view: 'struct', expanded: 1 }
                ]
            }
        ]
    });

    // default welcome block
    host.preset.define('welcome-block', {
        view: 'block',
        className: 'welcome-block',
        data: '#.model',
        content: [
            'app-header',

            {
                view: 'block',
                className: 'upload-data',
                when: '#.actions.uploadFile',
                content: [
                    'preset/upload',
                    {
                        view: 'block',
                        className: 'upload-notes',
                        content: 'html:name + " is a server-less application that securely opens and analyzes your data directly on your device,<br>ensuring all processing is done locally without transmitting your data elsewhere."'
                    }
                ]
            }
        ]
    });
}
