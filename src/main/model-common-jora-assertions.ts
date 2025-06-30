import { isImageContent } from '../core/utils/image.js';
import { isError } from '../core/utils/is-type.js';

export default {
    error: isError,
    imagecontent: isImageContent
};
