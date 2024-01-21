import { getBoundingRect, getOverflowParent } from '../../core/utils/layout.js';

let viewTreeScrollTopBeforeSelect = 0;
const sidebarLeafBadges = [
    {
        view: 'badge',
        when: 'view.data != parent.(view or viewRoot).data or "data" in view.config',
        data: { text: 'D' },
        tooltip: 'text:"Data value was changed"'
    },
    {
        view: 'badge',
        when: 'view.context != parent.(view or viewRoot).context',
        data: { text: 'C' },
        tooltip: 'text:"Context value was changed"'
    }
];

function scrollIntoViewIfNeeded(element) {
    const viewportEl = getOverflowParent(element);
    const elementRect = getBoundingRect(element, viewportEl);
    const scrollMarginTop = 0;
    const scrollMarginLeft = 0;

    const { scrollTop, scrollLeft, clientWidth, clientHeight } = viewportEl;
    const viewportTop = scrollTop + scrollMarginTop;
    const viewportLeft = scrollLeft + scrollMarginLeft;
    const viewportRight = scrollLeft + clientWidth;
    const viewportBottom = scrollTop + clientHeight;
    const elementTop = scrollTop + elementRect.top;
    const elementLeft = scrollLeft + elementRect.left;
    const elementRight = elementLeft + elementRect.width;
    let scrollToTop = scrollTop;
    let scrollToLeft = scrollLeft;

    if (elementTop < viewportTop || elementTop > viewportBottom) {
        scrollToTop = elementTop - scrollMarginTop;
    }

    if (elementLeft < viewportLeft) {
        scrollToLeft = elementLeft - scrollMarginLeft;
    } else if (elementRight > viewportRight) {
        scrollToLeft = Math.max(elementLeft, scrollLeft - (elementRight - viewportRight)) - scrollMarginLeft;
    }

    viewportEl?.scrollTo(scrollToLeft, scrollToTop);
}

export function resetViewTreeScrollTopBeforeSelect() {
    viewTreeScrollTopBeforeSelect = 0;
}

export function viewTree(el, { selectTreeViewLeaf, detailsSidebarLeafExpanded }) {
    return {
        view: 'tree',
        when: '#.selectedView',
        data: '$[0]',
        className: 'sidebar',
        limitLines: false,
        itemConfig: {
            collapsible: '=not viewRoot',
            expanded: leaf => leaf.viewRoot || detailsSidebarLeafExpanded.has(leaf),
            onToggle: (state, _, leaf) => state
                ? detailsSidebarLeafExpanded.add(leaf)
                : detailsSidebarLeafExpanded.delete(leaf)
        },
        item: {
            view: 'switch',
            content: [
                {
                    when: 'viewRoot',
                    content: {
                        view: 'block',
                        className: 'view-root',
                        content: 'text:viewRoot.name'
                    }
                },
                {
                    when: '$ = #.selectedView',
                    content: [
                        {
                            view: 'block',
                            className: [
                                data => data.view?.skipped ? 'skipped' : false,
                                'selected'
                            ],
                            content: 'text:view.config.view or "#root" | is string ?: "ƒn"',
                            postRender(el_) {
                                requestAnimationFrame(() => {
                                    el.querySelector('.sidebar').scrollTop = viewTreeScrollTopBeforeSelect;
                                    scrollIntoViewIfNeeded(el_);
                                });
                            }
                        },
                        ...sidebarLeafBadges
                    ]
                },
                {
                    content: [
                        {
                            view: 'link',
                            className: data => data.view?.skipped ? 'skipped' : false,
                            data: '{ text: view.config.view or "#root" | is string ?: "ƒn", href: false, view, self: $ }',
                            onClick(_, data) {
                                viewTreeScrollTopBeforeSelect = el.querySelector('.sidebar')?.scrollTop || 0;
                                selectTreeViewLeaf(data.self);
                            }
                        },
                        ...sidebarLeafBadges
                    ]
                }
            ]
        }
    };
}
