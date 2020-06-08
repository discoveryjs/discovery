const PrimitiveType = 1;
const PromiseType = 2;
const ArrayType = 3;
const ObjectType = 4;
const ReadableStringType = 5;
const ReadableObjectType = 6;

function isReadableStream(value) {
    return (
        typeof value.pipe === 'function' &&
        // value.readable !== false &&
        typeof value._read === 'function' &&
        typeof value._readableState === 'object'
    );
}

function getTypeNative(value) {
    if (value !== null && typeof value === 'object') {
        if (Array.isArray(value)) {
            return ArrayType;
        }

        return ObjectType;
    }

    return PrimitiveType;
}

function getTypeAsync(value) {
    if (value !== null && typeof value === 'object') {
        if (typeof value.then === 'function') {
            return PromiseType;
        }

        if (isReadableStream(value)) {
            return value._readableState.objectMode ? ReadableObjectType : ReadableStringType;
        }

        if (Array.isArray(value)) {
            return ArrayType;
        }

        return ObjectType;
    }

    return PrimitiveType;
}

function stringLength(value) {
    // TODO: calculate escape length
    return value.length + 2;
}

function primitiveLength(value) {
    switch (typeof value) {
        case 'string':
            return stringLength(value);

        case 'number':
            return Number.isFinite(value) ? String(value).length : 4 /* null */;

        case 'boolean':
            return value ? 4 /* true */ : 5 /* false */;

        case 'undefined':
        case 'object':
            return 4; /* null */

        default:
            throw new Error(`Unknown type "${typeof value}". Please file an issue!`);
    }
}

function normalizeReplacer(replacer) {
    if (typeof replacer === 'function') {
        return replacer;
    }

    if (Array.isArray(replacer)) {
        const whitelist = new Set(replacer
            .map(item => typeof item === 'string' || typeof item === 'number' ? String(item) : null)
            .filter(item => typeof item === 'string')
        );

        whitelist.add('');

        return (key, value) => whitelist.has(key) ? value : undefined;
    }

    return null;
}

function normalizeSpace(space) {
    if (typeof space === 'number') {
        if (!Number.isFinite(space) || space < 1) {
            return false;
        }

        return ' '.repeat(Math.min(space, 10));
    }

    if (typeof space === 'string') {
        return space.slice(0, 10) || false;
    }

    return false;
}

function spaceLength(space) {
    space = normalizeSpace(space);
    return typeof space === 'string' ? space.length : 0;
}

export function jsonStrinifyInfo(value, replacer, space, options) {
    function walk(key, value) {
        if (stop) {
            return;
        }

        if (value && typeof value.toJSON === 'function') {
            value = value.toJSON();
        }

        if (replacer !== null) {
            value = replacer.call(this, key, value);
        }

        if (typeof value === 'function' || typeof value === 'symbol') {
            value = undefined;
        }

        let type = getType(value);

        // check for circular structure
        if (type !== PrimitiveType && stack.has(value)) {
            circular.add(value);
            length += 4; // treat as null

            if (!options.continueOnCircular) {
                stop = true;
            }

            return;
        }

        switch (type) {
            case PrimitiveType:
                if (value !== undefined || Array.isArray(this)) {
                    length += primitiveLength(value);
                }
                break;

            case ObjectType: {
                if (visited.has(value)) {
                    duplicate.add(value);
                    length += visited.get(value);
                    break;
                }

                const valueLength = length;
                let entries = 0;

                length += 2; // {}

                stack.add(value);

                for (const property in value) {
                    if (hasOwnProperty.call(value, property)) {
                        const prevLength = length;
                        walk.call(value, property, value[property]);

                        if (prevLength !== length) {
                            // value is printed
                            length += stringLength(property) + 1; // "property":
                            entries++;
                        }
                    }
                }

                if (entries > 1) {
                    length += entries - 1; // commas
                }

                stack.delete(value);

                if (space > 0 && entries > 0) {
                    length += (1 + (stack.size + 1) * space + 1) * entries; // for each key-value: \n{space}
                    length += 1 + stack.size * space; // for }
                }

                visited.set(value, length - valueLength);

                break;
            }

            case ArrayType: {
                if (visited.has(value)) {
                    duplicate.add(value);
                    length += visited.get(value);
                    break;
                }

                const valueLength = length;

                length += 2; // []

                stack.add(value);

                for (let i = 0; i < value.length; i++) {
                    walk.call(value, String(i), value[i]);
                }

                if (value.length > 1) {
                    length += value.length - 1; // commas
                }

                stack.delete(value);

                if (space > 0 && value.length > 0) {
                    length += (1 + (stack.size + 1) * space) * value.length; // for each element: \n{space}
                    length += 1 + stack.size * space; // for ]
                }

                visited.set(value, length - valueLength);

                break;
            }

            case PromiseType:
                async.add(value);
                break;

            case ReadableStringType:
            case ReadableObjectType:
                if (type === ReadableObjectType) {
                    length += 2; // []
                }

                async.add(value);
                break;
        }
    }

    replacer = normalizeReplacer(replacer);
    space = spaceLength(space);
    options = options || {};

    const visited = new Map();
    const duplicate = new Set();
    const stack = new Set();
    const circular = new Set();
    const async = new Set();
    const getType = options.async ? getTypeAsync : getTypeNative;
    let stop = false;
    let length = 0;

    walk.call({ '': value }, '', value);

    return {
        minLength: isNaN(length) ? Infinity : length,
        circular: [...circular],
        duplicate: [...duplicate],
        async: [...async]
    };
};
