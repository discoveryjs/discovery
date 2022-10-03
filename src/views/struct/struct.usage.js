const defaultDemoData = {
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
};

export default {
    beforeDemo: ['md:"View to display the structure of any value. This is the simplest yet powerful way to enable data exploration."'],
    demo: {
        view: 'struct',
        data: {
            foo: 'bar',
            baz: [1, 2, 3]
        }
    },
    examples: [
        {
            title: 'Default expanded depth',
            highlightProps: ['expanded'],
            beforeDemo: ['md:"By default `struct` view is collapsed. The `expand` option is using to specify an initial expanded depth. A value for the option can be a boolean or a positive number."'],
            demoData: defaultDemoData,
            demo: [
                'badge:"Default (expanded option is not used)"',
                {
                    view: 'struct'
                },
                'badge:"expanded = true"',
                {
                    view: 'struct',
                    expanded: true
                },
                'badge:"expanded = 2"',
                {
                    view: 'struct',
                    expanded: 2
                }
            ]
        },
        {
            title: 'Maximum number of elements and entries',
            beforeDemo: {
                view: 'md',
                source: [
                    'The following options define the maximum number of elements in array or entries in object:',
                    '* `limit` (default: 50) defines max count for expanded array/object',
                    '* `limitCollapsed` (default: 4) defines max count for collapsed array/object'
                ]
            },
            highlightProps: ['limit', 'limitCollapsed'],
            demoData: defaultDemoData,
            demo: {
                view: 'struct',
                limit: 5,
                limitCollapsed: 1,
                expanded: 2
            }
        },
        {
            title: 'Maximum length for strings',
            beforeDemo: {
                view: 'md',
                source: [
                    'The following options define the maximum string length in various cases:',
                    '* `maxStringLength` (default: 150) defines max length for strings when a host object is expanded',
                    '* `maxCompactStringLength` (default: 40) defines max length for strings when a host object is collapsed',
                    '* `allowedExcessStringLength` (default: 10) defines allowed excess in length before a string will be cut and \\"N more\\" label will be added'
                ]
            },
            highlightProps: [
                'maxStringLength',
                'maxCompactStringLength',
                'allowedExcessStringLength'
            ],
            demo: {
                view: 'struct',
                maxStringLength: 30,
                maxCompactStringLength: 10,
                allowedExcessStringLength: 5,
                expanded: 1
            },
            demoData: {
                stringsInExpandedObject: 'Quite a long string value Quite a long string value',
                string_34_chars: 'String with 34 chars length demo x',
                string_35_chars: 'String with 35 chars length demo xx',
                string_36_chars: 'String with 36 chars length demo xxx',
                level2: {
                    stringsInCollapsedObject: 'Quite a long string value Quite a long string value',
                    string_14_chars: 'Short string x',
                    string_15_chars: 'Short string xx',
                    string_16_chars: 'Short string xxx'
                }
            }
        }
    ]
};
