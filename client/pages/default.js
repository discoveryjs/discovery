export default function(discovery) {
    discovery.definePage('default', {
        view: 'switch',
        content: [
            {
                when: '#.modelfree',
                content: [
                    {
                        view: 'h1',
                        className: 'modelfree',
                        content: [
                            'text:"Discovery "',
                            'badge:{ text: "model free mode" }'
                        ]
                    },
                    'html:"<p>Running in <b>model free mode</b>, because no config or no models is set up. Please, read <a href=\\"/link-to-documentation\\" href=\\"_blank\\">documention</a> to learn how to set up models."',
                    'html:"<p>In this mode you can load a data (JSON), via a button in top right corner or via dropping a file on the page.</p>"'
                ]
            },
            {
                content: [
                    'h1:#.name',
                    'struct'
                ]
            }
        ]
    });
}
