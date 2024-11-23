/* eslint-env browser */
import { Marked } from 'marked';
import { CustomMarkedRenderer } from './markdown-marked-renderer.js';
import usage from './markdown.usage.js';

function applyTextInterpolation(value, values) {
    return value.replace(/{{(\d+)}}/gs, (_, index) => values[index]);
}

function applyInterpolations(el, values) {
    for (const child of el.childNodes) {
        switch (child.nodeType) {
            case document.ELEMENT_NODE:
                if (!child.classList.contains('view-source')) {
                    applyInterpolations(child, values);

                    for (const attribute of child.attributes) {
                        attribute.nodeValue = applyTextInterpolation(attribute.nodeValue, values);
                    }
                }
                break;

            case document.TEXT_NODE:
                child.nodeValue = applyTextInterpolation(child.nodeValue, values);
                break;
        }
    }
}

function indexMarkdownSections(el) {
    const sectionByHeaderEl = new Map();
    let startSectionKey = { after: el.prepend.bind(el) };
    let prevSection = {
        next: null,
        data: {
            sectionIdx: 0,
            slug: null,
            text: null,
            href: null
        }
    };

    sectionByHeaderEl.set(startSectionKey, prevSection);

    for (const headerEl of [...el.querySelectorAll(':scope > :is(h1, h2, h3, h4, h5, h6)')]) {
        if (headerEl === el.firstElementChild) {
            sectionByHeaderEl.delete(startSectionKey);
            startSectionKey = headerEl;
            prevSection = null;
        }

        const anchorEl = headerEl.querySelector(':scope > a[id^="!anchor:"]');
        const section = {
            next: null,
            data: {
                sectionIdx: sectionByHeaderEl.size,
                slug: headerEl.dataset.slug,
                text: headerEl.textContent.trim(),
                href: anchorEl?.hash
            }
        };

        sectionByHeaderEl.set(headerEl, section);

        if (prevSection) {
            prevSection.next = headerEl;
        }

        prevSection = section;
    }

    return {
        sectionByHeaderEl,
        findSectionByEl(cursor) {
            let section = sectionByHeaderEl.get(startSectionKey);

            while (cursor !== null && cursor !== el) {
                if (sectionByHeaderEl.has(cursor)) {
                    section = sectionByHeaderEl.get(cursor);
                    break;
                }

                cursor = cursor.previousSibling || cursor.parentNode;
            }

            return section?.data || null;
        }
    };
}

const props = `is not array? | {
    source: #.props has no 'source' ? is (string or array) ?,
    anchors: true,
    sectionPrelude: undefined,
    sectionPostlude: undefined,
    codeConfig: undefined
} | overrideProps()`;

export default function(host) {
    const marked = new Marked().setOptions({
        smartLists: true,
        renderer: new CustomMarkedRenderer()
    });

    function render(el, config, data, context) {
        const interpolations = new Map();
        const codes = [];
        const promises = [];
        const {
            anchors = true,
            sectionPrelude,
            sectionPostlude
        } = config;
        let {
            source,
            codeConfig
        } = config;

        if (Array.isArray(source)) {
            source = source.join('\n');
        }

        source = source.replace(/{{(.+?)}}/gs, (_, query) => {
            query = query.trim();

            if (!interpolations.has(query)) {
                interpolations.set(query, interpolations.size);
            }

            return `{{${interpolations.get(query)}}}`;
        });

        el.classList.add('view-markdown');
        el.innerHTML = marked.parse(source, {
            discoveryjs: {
                host,
                useAnchors: anchors,
                codes
            }
        });

        // interpolations
        if (interpolations.size > 0) {
            const interpolationValues = new Array(interpolations.size);

            for (const [query, index] of interpolations.entries()) {
                try {
                    interpolationValues[index] = host.query(query, data, context);
                } catch (e) {
                    host.logger.error('Interpolation query error in markdown:', e.message);
                }
            }

            applyInterpolations(el, interpolationValues);
        }

        // index sections if needed
        const { sectionByHeaderEl, findSectionByEl } =
            codes.length || sectionPrelude || sectionPostlude
                ? indexMarkdownSections(el)
                : { sectionByHeaderEl: new Map(), findSectionByEl: () => null };

        // highlight code with a source view
        {
            codeConfig = typeof codeConfig === 'object'
                ? { view: 'source', ...codeConfig }
                : codeConfig || 'source';

            for (const codeEl of [...el.querySelectorAll('.discoveryjs-code')]) {
                const section = findSectionByEl(codeEl);
                const buffer = document.createDocumentFragment();
                const id = codeEl.dataset.id;
                const { syntax, source } = codes[id];

                promises.push(
                    this.render(buffer, codeConfig, { syntax, source }, { ...context, section })
                        .then(() => codeEl.replaceWith(buffer))
                );
            }
        }

        // render section prefix/postfix
        if (sectionPrelude || sectionPostlude) {
            const renderSectionPrePost = (renderConfig, section, insertCallback) => {
                const buffer = document.createDocumentFragment();
                promises.push(
                    this.render(
                        buffer,
                        renderConfig,
                        data,
                        { ...context, section: section.data }
                    ).then(() => insertCallback(buffer))
                );
            };

            for (const [sectionStartEl, section] of sectionByHeaderEl) {
                if (sectionPrelude) {
                    renderSectionPrePost(sectionPrelude, section, buffer =>
                        sectionStartEl.after(buffer)
                    );
                }

                if (sectionPostlude) {
                    renderSectionPrePost(sectionPostlude, section, buffer =>
                        section.next ? section.next.before(buffer) : el.append(buffer)
                    );
                }
            }
        }

        return Promise.all(promises);
    }

    host.view.define('markdown', render, { props, usage });
    host.view.define('md', render, { props, usage });
}
