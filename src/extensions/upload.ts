import type { ViewModel } from '../main/view-model.js';
import { createElement } from '../core/utils/dom.js';

// export an integration with default settings
export default Object.assign(setup(), { setup });
export type UploadOptions = Partial<{
    accept: string | string[];
    dragdrop: boolean;
}>;

const isExtension = (value: string) => /^\./.test(value);

function setup(options?: UploadOptions) {
    options = options || {};

    return function(host: ViewModel) {
        const dragdrop = Boolean(options.dragdrop || options.dragdrop === undefined);
        const accept = options.accept
            ? String(options.accept)
            : 'application/json,application/jsonxl,.json,.jsonxl';
        const acceptTokens = accept.split(',');

        if (dragdrop) {
            // setup the drag&drop listeners for upload data from event.dataTransfer
            host.dom.container.addEventListener('drop', event => {
                host.loadDataFromEvent(event);
            }, true);
            host.dom.container.addEventListener('dragover', event => {
                event.stopPropagation();
                event.preventDefault();
            }, true);

            // setup the paste listener for upload a file from clipboard if any
            document.addEventListener('paste', (e) => {
                const { files } = e.clipboardData || { files: [] };

                if (files?.length > 0) {
                    host.loadDataFromEvent(e);
                }
            });
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
        host.action.define('unloadData', () => {
            host.unloadData();
        });
        host.action.define('uploadFile', Object.assign(
            () => {
                createElement('input', {
                    type: 'file',
                    accept,
                    onchange: (event: InputEvent) => host.loadDataFromEvent(event)
                }).click();
            },
            {
                fileExtensions: acceptTokens.filter(token => isExtension(token)),
                mimeTypes: acceptTokens.filter(token => !isExtension(token)),
                dragdrop
            }
        ));
    };
}
