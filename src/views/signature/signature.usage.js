export default {
    beforeDemo: ['md:"The `signature` view is used to output a type definition for current data using TypeScript like style:"'],
    demoData: [
        { name: 'John', age: 33, married: true, children: [{ name: 'Alice', age: 5 }, { name: 'Bob', age: 8 }] },
        { name: 'Mary', age: 29, married: false }
    ],
    demo: {
        view: 'signature',
        expanded: true
    }
};
