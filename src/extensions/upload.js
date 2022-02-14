import { createElement } from '../core/utils/dom.js';

const isExtension = (value) => /^\./.test(value);

export default function(host) {
    const upload = host.options.upload || true;
    const accept = upload.accept
        ? String(upload.accept)
        : 'application/json,.json';
    const acceptTokens = accept.split(',');
    const preset = [
        {
            view: 'button-primary',
            onClick: '=#.actions.uploadFile',
            content: 'text:`Open file ${#.actions.uploadFile.fileExtensions | $ ? "(" + join(", ") + ")" : ""}`'
        }
    ];

    // setup the drag&drop listeners for upload data if not disabled
    if (upload.dragdrop || upload.dragdrop === undefined) {
        host.dom.container.addEventListener('drop', event => {
            host.loadDataFromEvent(event);
        }, true);
        host.dom.container.addEventListener('dragover', event => {
            event.stopPropagation();
            event.preventDefault();
        }, true);

        preset.push(
            'html:"<span style=\\"color: #888; padding: 0 1ex\\"> or </span>"',
            'text:"drop a file on the page"'
        );
    }

    // define view preset
    host.preset.define('upload', preset);

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
            mimeTypes: acceptTokens.filter(token => !isExtension(token))
        }
    );
}
