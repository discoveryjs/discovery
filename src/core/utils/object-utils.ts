const { toString, hasOwnProperty } = Object.prototype;

export const objectToString = (value: unknown) => toString.call(value);
export const hasOwn = Object.hasOwn || ((object: object, key: PropertyKey) => hasOwnProperty.call(object, key));
