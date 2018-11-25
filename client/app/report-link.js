import { encodeParams } from '../pages/report.js';

export function reportLink(options) {
    if (typeof options === 'string') {
        return reportLink.call(this, { query: options });
    }

    const params = encodeParams(options);
    const page = this.modelfree ? '' : 'report';

    return params.length ? `#${page}&${params}` : `#${page}`;
}
