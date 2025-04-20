const defaultDemoData = [
    { name: 'Alice', age: 34, occupation: 'Engineer' },
    { name: 'Bob', age: 42, occupation: 'Doctor' },
    { name: 'Charlie', age: 9, occupation: 'Student' },
    { name: 'David', age: 50, occupation: 'Doctor' },
    { name: 'Eve', age: 15, occupation: 'Engineer' }
];
export default {
    demoData: defaultDemoData,
    demo: {
        view: 'table',
        limit: 2,
        cols: {
            age: { footer: 'text:sum(=>age)' },
            occupation: { footer: {} }
        }
    }
};
