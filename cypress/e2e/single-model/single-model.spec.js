describe('Single model', () => {
    it('Has model name', () => {
        cy.visit('localhost:8124');
        cy.contains('Single model');
    });

    it('Opens report page', () => {
        cy.visit('localhost:8124');
        cy.contains('Discover').click();
        cy.get('input').should('have.attr', 'placeholder', 'Untitled discovery');
    });
});

describe('Inspector', () => {
    const popupSelector = '.discovery-inspect-details-popup';
    const overlaySelector = '.discovery-view-inspector-overlay';

    beforeEach(() => {
        cy.visit('localhost:8124');
        cy.contains('Single model');
        cy.get('.loading-overlay').should('have.css', 'visibility', 'hidden');
    });

    function render(config) {
        cy.window().its('discovery').then(discovery => {
            discovery.page.define('inspector-test', [config]);
            discovery.setPage('inspector-test');
        });
    }

    function inspect(selector, text = false) {
        cy.get(selector).should('be.visible').then(([element]) => {
            const doc = element.ownerDocument;
            const win = doc.defaultView;
            let rect = element.getBoundingClientRect();

            if (text) {
                const range = doc.createRange();
                const walker = doc.createTreeWalker(element, win.NodeFilter.SHOW_TEXT);

                range.selectNodeContents(walker.nextNode());
                const rects = [...range.getClientRects()];

                rect = rects[rects.length - 1];
            }

            doc.dispatchEvent(new win.PointerEvent('pointermove', {
                clientX: rect.left + 2,
                clientY: rect.top + rect.height / 2
            }));
            win.discovery.inspectMode.set(true);
        });
    }

    function expectView(name) {
        cy.get(`${popupSelector} .stack-view-chain .checked`).should('have.text', name);
    }

    function nextFrame(win) {
        return new Cypress.Promise(resolve => win.requestAnimationFrame(resolve));
    }

    function highlightAlpha(win, left, top) {
        const canvas = win.discovery.dom.container.querySelector('canvas');

        return canvas.getContext('2d').getImageData(
            Math.floor(left * win.devicePixelRatio),
            Math.floor(top * win.devicePixelRatio),
            1,
            1
        ).data[3];
    }

    it('Finds later fragment children after a skipped view', () => {
        render({
            view: 'context',
            content: [
                { view: 'block', when: false },
                { view: 'button', text: 'First' },
                { view: 'button', text: 'Second', className: 'inspector-target' }
            ]
        });
        inspect('.inspector-target');
        expectView('button');
    });

    it('Selects wrapped text inside a fragment view', () => {
        render({
            view: 'block',
            className: 'inspector-target',
            content: {
                view: 'context',
                content: 'text:"Text that wraps onto several lines"'
            },
            postRender(element) {
                element.style.cssText = 'width:100px;padding:20px';
            }
        });
        inspect('.inspector-target', true);
        expectView('text');
        cy.get(overlaySelector).trigger('click');
        cy.get(`${popupSelector} .sidebar .selected`).should('have.text', 'text');
    });

    it('Clips text highlights against their immediate overflow container', () => {
        render({
            view: 'block',
            className: 'inspector-target',
            content: 'text:"A long line of text that overflows its container"',
            postRender(element) {
                element.style.cssText = 'width:80px;height:24px;line-height:24px;white-space:nowrap;overflow:hidden';
            }
        });
        inspect('.inspector-target', true);
        expectView('text');
        cy.get('.inspector-target').then(([element]) => {
            const win = element.ownerDocument.defaultView;
            const rect = element.getBoundingClientRect();

            expect(highlightAlpha(win, rect.left + 5, rect.top + 12)).to.be.greaterThan(0);
            expect(highlightAlpha(win, rect.right + 5, rect.top + 12)).to.equal(0);
        });
    });

    it('Preserves visible overflow on the other axis', () => {
        render({
            view: 'block',
            className: 'inspector-clip',
            postRender(element) {
                element.style.cssText = 'width:80px;height:24px;overflow-x:clip;overflow-y:visible';
            },
            content: {
                view: 'block',
                className: 'inspector-target',
                postRender(element) {
                    element.style.cssText = 'width:160px;height:60px';
                }
            }
        });
        inspect('.inspector-target');
        expectView('block');
        cy.get('.inspector-clip').then(([element]) => {
            const win = element.ownerDocument.defaultView;
            const rect = element.getBoundingClientRect();

            expect(highlightAlpha(win, rect.left + 5, rect.bottom + 5)).to.be.greaterThan(0);
            expect(highlightAlpha(win, rect.right + 5, rect.top + 5)).to.equal(0);
        });
    });

    it('Distinguishes view roots and selects roots with Ctrl-click', () => {
        render([
            { view: 'block', className: 'inspector-first', content: 'text:"First"' },
            { view: 'block', className: 'inspector-second', content: 'text:"Second"' }
        ]);
        for (const name of ['first', 'second']) {
            cy.get(`.inspector-${name}`).then(([element]) => {
                element.style.cssText = 'width:100px;height:60px;padding:20px';
                element.ownerDocument.defaultView.discovery.view.setViewRoot(element, name, {});
            });
            inspect(`.inspector-${name}`);
            expectView(name);
        }
        cy.get(overlaySelector).trigger('click', { ctrlKey: true });
        cy.get(popupSelector).should('have.class', 'frozen');
        cy.hash().should('equal', '#inspector-test');
    });

    it('Selects functional views with Cmd-click instead of navigating', () => {
        render({
            view(element) {
                element.textContent = 'Functional view';
                element.style.cssText = 'width:100px;height:60px';
            },
            className: 'inspector-target'
        });
        inspect('.inspector-target');
        cy.get(`${popupSelector} .stack-view-chain .checked`).should('exist');
        cy.get(overlaySelector).trigger('click', { metaKey: true });
        cy.get(popupSelector).should('have.class', 'frozen');
        cy.hash().should('equal', '#inspector-test');
    });

    it('Opens documentation for a named view with Ctrl-click', () => {
        render({ view: 'button', text: 'Target', className: 'inspector-target' });
        inspect('.inspector-target');
        expectView('button');
        cy.get(overlaySelector).trigger('click', { ctrlKey: true });
        cy.hash().should('contain', 'views-showcase:button');
        cy.get(overlaySelector).should('not.exist');
    });

    it('Does not reopen after selection followed by Escape in the same frame', () => {
        render({ view: 'button', text: 'Target', className: 'inspector-target' });
        inspect('.inspector-target');
        expectView('button');
        cy.get(overlaySelector).then(([element]) => {
            const doc = element.ownerDocument;
            const win = doc.defaultView;

            element.click();
            doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape' }));
            return nextFrame(win);
        });
        cy.get(popupSelector).should('not.exist');
        cy.get(overlaySelector).should('not.exist');
        cy.get('.discovery-root').should('not.have.class', 'discovery-inspect-mode');
        inspect('.inspector-target');
        expectView('button');
        cy.get(popupSelector).should('not.have.class', 'frozen');
    });

    it('Cancels selection before the next animation frame', () => {
        render({ view: 'button', text: 'Target', className: 'inspector-target' });
        inspect('.inspector-target');
        expectView('button');
        cy.get(overlaySelector).then(([element]) => {
            element.click();
            element.click();
            return nextFrame(element.ownerDocument.defaultView);
        });
        expectView('button');
        cy.get(popupSelector).should('not.have.class', 'frozen');
    });
});
