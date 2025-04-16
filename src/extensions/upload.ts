import type { ViewModel } from '../main/view-model.js';
import { createElement } from '../core/utils/dom.js';

// export an integration with default settings
export default Object.assign(setup(), { setup });
export type UploadOptions = {
    accept: string | string[];
    useAcceptForFilePicker: boolean;
    dragdrop: boolean;
    clipboard: boolean;
};

const isExtension = (value: string) => /^\./.test(value);

function setup(options?: Partial<UploadOptions>) {
    options = {
        accept: 'application/json,application/jsonxl,.json,.jsonxl',
        useAcceptForFilePicker: false,
        dragdrop: true,
        clipboard: false,
        ...options
    };

    return function(host: ViewModel) {
        const useAcceptForFilePicker = Boolean(options.useAcceptForFilePicker);
        const dragdrop = Boolean(options.dragdrop);
        const clipboard = Boolean(options.clipboard);
        const accept = String(options.accept);
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
                text: '=`Open file${#.actions.uploadFile.fileExtensions |? " (" + join(", ") + ")" : "" | size() > 1 and size() <= 17 ?: "…"}`',
                onClick: '=#.actions.uploadFile'
            },
            {
                view: 'context',
                when: '#.actions.uploadDataFromClipboard',
                content: [
                    'html:"<span style=\\"color: #888; padding: 0 1ex\\"> or </span>"',
                    {
                        view: 'button',
                        text: 'Paste from clipboard',
                        onClick: '=#.actions.uploadDataFromClipboard'
                    }
                ]
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
                    accept: useAcceptForFilePicker ? accept : undefined,
                    onchange: (event: InputEvent) => host.loadDataFromEvent(event)
                }).click();
            },
            {
                fileExtensions: acceptTokens.filter(token => isExtension(token)),
                mimeTypes: acceptTokens.filter(token => !isExtension(token)),
                dragdrop,
                clipboard
            }
        ));

        if (clipboard) {
            host.action.define('uploadDataFromClipboard', async () => {
                // const items = await.clipboard.read();
                // const blob = await items[0].getType('text/plain');
                const items = await navigator.clipboard.readText(); // {"a":123}
                host.loadDataFromStream(new Blob([items]).stream());
            });
        }
    };
}
