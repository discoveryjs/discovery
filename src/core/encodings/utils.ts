import type { Encoding } from '../utils/load-data.types.js';

export function validateEncodingConfig(config: any) {
    if (!config || typeof config !== 'object') {
        return 'value is not an object';
    }

    const { name, test, decode } = config;

    if (typeof name !== 'string') {
        return 'missed name';
    }

    if (typeof test !== 'function') {
        return 'missed test function';
    }

    if (typeof decode !== 'function') {
        return 'missed decode function';
    }

    return false;
}

export function normalizeEncodingConfig(config: any): Encoding {
    const error = validateEncodingConfig(config);

    if (error) {
        throw new Error(`Bad encoding config${config?.name ? ` "${config.name}"` : ''}: ${error}`);
    }

    const { name, test, streaming, decode } = config as Encoding;

    return Object.freeze(
        streaming
        ? {
            name: name || 'unknown',
            test,
            streaming: true,
            decode
        }
        : {
            name: name || 'unknown',
            test,
            streaming: false,
            decode
        }
    );
}

export function normalizeEncodings(encodings?: any[]): Encoding[] {
    if (!encodings) {
        return [];
    }

    if (!Array.isArray(encodings)) {
        throw new Error('Encodings must be an array');
    }

    return encodings.map(normalizeEncodingConfig);
}
