export default {
    demo: {
        view: 'struct',
        data: {
            foo: 'bar',
            baz: [1, 2, 3]
        }
    },
    examples: [
        {
            title: 'Define expanded levels by default and limit entries when collapsed and expanded',
            demo: {
                view: 'struct',
                expanded: 2,
                limit: 5,
                limitCollapsed: 1,
                data: {
                    level1: {
                        level2: {
                            level3: {
                                level4: {}
                            },
                            level3_2: 2,
                            level3_3: 3,
                            level3_4: 4,
                            level3_5: 5,
                            level2_6: 6
                        },
                        level2_2: 2,
                        level2_3: 3,
                        level2_4: 4,
                        level2_5: 5,
                        level2_6: 6
                    },
                    level1_2: 2,
                    level1_3: 3,
                    level1_4: 4,
                    level1_5: 5,
                    level1_6: 6,
                    level1_7: 7
                }
            }
        },
        {
            title: 'Setup maximum length for strings',
            beforeDemo: ['md:"There 3 options to define limit for a string length:\\n* `maxStringLength` (default: 150) defines max length for strings in expanded values\\n* `maxCompactStringLength` (default: 40) defines max length for strings in collapsed objects and arrays\\n* `allowedExcessStringLength` (default: 10) defines allowed excess in length before a string will be cut and \\"N more\\" label will be added"'],
            demo: {
                view: 'struct',
                expanded: 1,
                maxStringLength: 30,
                maxCompactStringLength: 10,
                data: {
                    stringInExpandedObject: 'Quite a long string value Quite a long string value',
                    level2: {
                        stringInCollapsedObject: 'Quite a long string value Quite a long string value'
                    }
                }
            }
        }
    ]
};
