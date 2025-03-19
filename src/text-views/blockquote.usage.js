export default (view) => ({
    demo: {
        view,
        content: [
            'text:"Some text"',
            { view, content: 'text:"Nested blockquote\\nmulti-line text"' }
        ]
    }
});
