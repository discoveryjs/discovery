import { decode } from './jsonxl-snapshot9.js';

export const JSONXL_MAGIC_NUMBER = [0x00, 0x00, 0x4a, 0x53, 0x4f, 0x4e, 0x58, 0x4c]; // \0\0JSONXL
export function test(chunk) {
    return JSONXL_MAGIC_NUMBER.every((code, idx) => code === chunk[idx]);
}

export default Object.freeze({
    name: 'jsonxl/snapshot9',
    test,
    streaming: false,
    decode
});
