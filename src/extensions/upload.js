import { createElement } from '../core/utils/dom.js';

// export an integration with default settings
export default Object.assign(setup(), { setup });

const isExtension = (value) => /^\./.test(value);

function setup(options) {
    options = options || true;

    return function(host) {
        const accept = options.accept
            ? String(options.accept)
            : 'application/json,.json';
        const dragdrop = Boolean(options.dragdrop || options.dragdrop === undefined);
        const acceptTokens = accept.split(',');

        // setup the drag&drop listeners for upload data if not disabled
        if (dragdrop) {
            host.dom.container.addEventListener('drop', event => {
                host.loadDataFromEvent(event);
            }, true);
            host.dom.container.addEventListener('dragover', event => {
                event.stopPropagation();
                event.preventDefault();
            }, true);
        }

        // define view preset
        host.preset.define('upload', [
            {
                view: 'button-primary',
                onClick: '=#.actions.uploadFile',
                content: 'text:`Open file ${#.actions.uploadFile.fileExtensions | $ ? "(" + join(", ") + ")" : ""}`'
            },
            {
                view: 'context',
                when: '#.actions.uploadFile.dragdrop',
                content: [
                    'html:"<span style=\\"color: #888; padding: 0 1ex\\"> or </span>"',
                    'text:"drop a file on the page"'
                ]
            }
        ]);

        // add actions
        host.actions.unloadData = () => {
            host.unloadData();
        };
        host.actions.uploadFile = Object.assign(
            () => {
                createElement('input', {
                    type: 'file',
                    accept,
                    onchange: event => host.loadDataFromEvent(event)
                }).click();
            },
            {
                fileExtensions: acceptTokens.filter(token => isExtension(token)),
                mimeTypes: acceptTokens.filter(token => !isExtension(token)),
                dragdrop
            }
        );
    };
}
