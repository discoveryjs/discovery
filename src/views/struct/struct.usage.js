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
            title: 'Set up maxStringLength and maxLineraStringLength for string values',
            beforeDemo: 'maxStringLength defines max length for string values. maxLinearStringLength defines max length for string values inside objects values ',
            demo: {
                view: 'struct',
                expanded: 2,
                maxStringLength: 20,
                maxLinearStringLength: 10,
                data: {
                    string: 'Quite a long string value',
                    level1: {
                        string: 'Quite a long string value',
                        level2: {
                            linerString: 'Quite a long string value'
                        }
                    }
                }
            }
        }
    ]
};
