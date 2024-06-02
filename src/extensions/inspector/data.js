import { normalizeSource } from './utils.js';

const dataTransitionsList = {
    view: 'list',
    className: 'data-flow-transitions',
    limit: 1,
    when: '.[view]',
    data: `
        [null]    // to show empty list on first render
        + .[view] // filter viewRoot
        .(
            $parent;
            $parentName: parent.view.config.view;
            $queryData: view | inputDataIndex != undefined ? inputData[inputDataIndex] : inputData;

            view | [
                ...'data' in config ? { inputData: $queryData, transition: config.data, name: config.view, view: $, $parent } : [],
                ...inputDataIndex != undefined ? { inputData, transition: \`$[\${inputDataIndex}]\`, name: \`\${$parentName} → \${config.view}\`, view: $, $parent } : []
            ]
        )
    `,
    whenData: 'size() > 1',
    itemConfig: {
        when: true // to show empty list on first render
    },
    item: [
        {
            view: 'block',
            className: 'root-data',
            when: 'inputData = ..parent.viewRoot[].data',
            content: 'badge:"Root data"'
        },
        {
            view: 'struct',
            data: 'inputData'
        },
        {
            view: 'block',
            className: 'data-flow-transition',
            content: [{
                view: 'switch',
                content: [
                    {
                        when: 'transition is (string or undefined)',
                        content: {
                            view: 'context',
                            data(data) {
                                const content = normalizeSource(data.transition);
                                const refs = [];
                                // const stat = context.host.queryFnFromString(content, { tolerant: true, stat: true })(data, context);

                                // for (let range of stat.getAllRanges().filter(({ context }) => context === 'path')) {
                                //     refs.push({
                                //         range: [range.from, range.to],
                                //         className: 'ttt',
                                //         tooltip: 'struct{ expanded: 1, data: range_.values }',
                                //         values: [...range.values],
                                //         range_: range
                                //     });
                                // }

                                // console.log({
                                //     data,
                                //     context,
                                //     stat,
                                //     ranges: stat.getAllRanges()
                                // });

                                return {
                                    content,
                                    refs
                                };
                            },
                            content: {
                                view: 'source',
                                data: `{
                                    ...,
                                    syntax: "jora",
                                    lineNum: false
                                }`
                            }
                        }
                    },
                    {
                        content: {
                            view: 'struct',
                            data: 'transition'
                        }
                    }
                ]
            }, {
                view: 'block',
                className: 'view-name',
                content: 'text:name'
            }]
        }
    ]
};

export const dataView = {
    view: 'block',
    className: 'content-section data',
    data: '#.view',
    content: [
        { view: 'context', data: '..parent', content: dataTransitionsList },
        { view: 'context', content: { ...dataTransitionsList, limit: false } },
        {
            view: 'block',
            className: 'root-data',
            when: 'view or viewRoot | data = ([@] + @..parent).viewRoot[].data',
            content: 'badge:"Root data"'
        },
        {
            view: 'struct',
            expanded: 1,
            data: 'view or viewRoot | data'
        }
    ]
};
