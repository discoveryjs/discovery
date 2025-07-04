import { hasOwn } from '../core/utils/object-utils.js';
import { jsonSafeParse, jsonSafeStringify, jsonStringifyInfo } from '../core/utils/json';
import { getImageContent, getImageDataUri, getImageSrc } from '../core/utils/image.js';

export default {
    overrideProps,
    jsonInfo: jsonStringifyInfo,
    jsonParse: jsonSafeParse,
    jsonStringify: jsonSafeStringify,
    imagecontent: getImageContent,
    imagedatauri: getImageDataUri,
    imagesrc: getImageSrc
};

function overrideProps(current: any, props = this.context.props) {
    if (!props) {
        return current;
    }

    const result = { ...current };

    for (const key of Object.keys(result)) {
        if (hasOwn(props, key)) {
            result[key] = props[key];
        }
    }

    return result;
}
