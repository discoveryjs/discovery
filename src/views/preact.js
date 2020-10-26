// import 'https://unpkg.com/preact@10.5.5/debug/dist/debug.module.js?module';
import { h, Component, render, createContext } from 'https://unpkg.com/preact?module';
import { useContext, useState, useMemo, useRef, useEffect } from './preact-hooks.js';

export default function(discovery) {
    // Create your app
    const discoveryData = createContext('data');
    const discoveryContext = createContext('context');
    const useDiscoveryData = () => useContext(discoveryData);
    const useDiscoveryContext = () => useContext(discoveryContext);
    const viewToComponents = {
        text: Text,
        counter: Counter,
        block: Block,
        expand: Expand,
        fc: ForeignContent
    };
    const app = h('h1', null, [
        'Hello World!',
        h('pre', null, [
            h(discoveryData.Provider, { value: { test: 'data' } },
                h(Counter)
            ),
            h(DataQuery, { query: Promise.resolve({ promise: 'ok' }) }, [
                h('h3', null, '[async Promise OK]'),
                h(Counter)
            ])
        ])
    ]);

    function Counter(props, state) {
        const data = useDiscoveryData();
        const [x, setX] = useState(0);

        return [
            h('button', { onClick() { setX(x + 123) }}, 'test'),
            JSON.stringify([data, x])
        ];
    }

    function Text() {
        const data = useDiscoveryData();

        return String(data && data.text || data);
    }

    function Expand({ expanded: initialExpanded, header, content }) {
        const [expanded, setExpanded] = useState(Boolean(initialExpanded));

        return h('div', { class: 'view-expand' + (expanded ? ' expanded' : '') }, [
            h('div', { class: 'header', onClick: () => setExpanded(!expanded) }, [
                h('div', { class: 'header-content' }, renderView(header)),
                h('div', { class: 'trigger' })
            ]),
            expanded && renderView(content || 'text:"No content"')
        ]);
    }

    function Block({ content }) {
        return h('div', { style: 'outline:1px solid green;padding: 5px' }, renderView(content));
    }

    function ForeignContent({ tag, content }) {
        const data = useDiscoveryData();
        const context = useDiscoveryContext();
        const elRef = useRef(null)
        const ref = el => console.log('el', el && el.xxx) || (el.xxx = el.xxx || Date.now(), 0) || console.log('el2', el && el.xxx) || elRef.current !== el
            ? ((elRef.current = el), discovery.view.render(el, content || [], data, context))
            : null;

        return h(String(tag || 'div'), { ref });
    }

    const notInited = {};
    function DataQuery({ query, children }) {
        const data = useDiscoveryData();
        const context = useDiscoveryContext();
        const [result, setResult] = useState(notInited);

        useMemo(
            async () => setResult(await discovery.query(query, data, context)),
            [query, data, context]
        );

        if (result !== notInited) {
            return h(discoveryData.Provider, { value: result }, children);
        }
    }

    function When({ condition, children }) {
        const data = useDiscoveryData();
        const context = useDiscoveryContext();

        if (discovery.queryBool(condition === true ? '' : condition, data, context)) {
            return children;
        }
    }

    function hasCondition(config, type) {
        return hasOwnProperty.call(config, type) && config[type] !== undefined;
    }

    function renderView(config) {
        return h(Render, { config });
    }

    function Render({ config }) {
        if (!config) {
            return;
        }

        if (Array.isArray(config)) {
            return config.map(renderView);
        }

        config = discovery.view.ensureValidConfig(discovery.view.normalizeConfig(config));

        const data = useDiscoveryData();
        const context = useDiscoveryContext();
        const props = discovery.view.propsFromConfig(config, data, context);
        let res = h(viewToComponents[config.view], props);

        if (hasCondition(config, 'whenData')) {
            res = h(When, { condition: config.whenData }, res);
        }

        if ('data' in config) {
            res = h(DataQuery, { query: config.data }, res);
        }

        if (hasCondition(config, 'when')) {
            res = h(When, { condition: config.when }, res);
        }

        return res;
    }

    discovery.view.define('preact', function(el, props, data, context) {
        render(
            h(discoveryData.Provider, { value: data },
                h(discoveryContext.Provider, { value: context },
                    renderView(props.content)
                )
            ),
            el
        );
    });
}
