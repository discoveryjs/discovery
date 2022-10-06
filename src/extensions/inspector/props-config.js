export const propsConfigView = {
    view: 'block',
    className: ['content', 'props-config'],
    data: '#.view | view or viewRoot',
    content: [
        {
            view: 'block',
            className: 'content-section skip',
            when: 'skipped',
            content: 'block{ content: "badge:{ text: skipped }" }'
        },
        {
            view: 'block',
            className: 'content-section render',
            when: 'config | view + "" != view',
            content: 'source:{ content: config.view + "", syntax: "js" }'
        },
        {
            view: 'block',
            when: 'props != undefined',
            className: 'content-section props',
            content: {
                view: 'struct',
                expanded: 2,
                data: 'props'
            }
        },
        {
            view: 'block',
            className: 'content-section config',
            content: [
                {
                    view: 'struct',
                    expanded: 1,
                    data: 'config'
                },
                {
                    view: 'tree',
                    data: (data, context) =>
                        context.host.view.getViewConfigTransitionTree(data.config).deps,
                    whenData: true,
                    expanded: 3,
                    children: 'deps',
                    item: {
                        view: 'struct',
                        expanded: 1,
                        data: 'value'
                    }
                }
            ]
        }
    ]
};
