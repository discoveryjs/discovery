import type { Logger } from './logger.js';

export type LocationSync = ReturnType<typeof createLocationSync>;

export function createLocationSync(
    onChange: (newHash: string, oldHash: string) => void,
    logger?: Logger
) {
    const location: Location = globalThis.location;
    const ignoreHashChange: string[] = [];
    const listener = ({ newURL, oldURL }) => {
        const newUrlHash = new URL(newURL).hash || '#';
        const oldUrlHash = new URL(oldURL).hash || '#';

        if (newUrlHash !== ignoreHashChange.shift()) {
            logger?.debug('locationSync onChange:', oldUrlHash, '->', newUrlHash);
            ignoreHashChange.length = 0;

            onChange(newUrlHash, oldUrlHash);
        }
    };

    addEventListener('hashchange', listener);

    return {
        set(hash: string, replace: boolean) {
            const newHash = hash || '#';
            const currentHash = location.hash || '#';

            if (currentHash === newHash) {
                return;
            }

            logger?.debug('locationSync set:', newHash, replace);
            ignoreHashChange.push(hash);

            if (replace) {
                location.replace(hash);
            } else {
                location.hash = hash;
            }
        },
        dispose() {
            removeEventListener('hashchange', listener);
        }
    };
}
