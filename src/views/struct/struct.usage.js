const defaultDemoData = {
    level_1: {
        level_2_1: {
            level_3_1: {
                level_4_1: {}
            },
            level_3_2: 2,
            level_3_3: 3,
            level_3_4: 4,
            level_3_5: 5,
            level_3_6: 6
        },
        level_2_2: [{ foo: 1, bar: 2 }, { foo: 3 }],
        level_2_3: 3,
        level_2_4: 4,
        level_2_5: 5,
        level_2_6: 6
    },
    level_1_2: 2,
    level_1_3: 3,
    level_1_4: 4,
    level_1_5: 5,
    level_1_6: 6,
    level_1_7: 7
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
            beforeDemo: ['md:"By default `struct` view is collapsed in one line. The `expanded` option is using to specify an initial expanded depth. A value for the option can be a boolean (`false` → `0`, `true` → `1`) or a positive number."'],
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
            title: 'Annotations',
            highlightProps: ['annotations'],
            beforeDemo: [{
                view: 'md',
                source: [
                    'Clarity of data can be improved by adding annotations. An annotation is special marker before or after a value which displaying for expanded objects and arrays only.',
                    'Any number of annotations can be applied to a single value.',
                    '',
                    'Annotations are adding with `annotations` option which should contain an array of strings (jora queries) and functions to compute an annotation config. An annotation config is an object with following fields:',
                    '```ts',
                    'type AnnotationConfig = {',
                    '   place?: "before" | "after"; // the placement of an annotation, "after" is by default',
                    '   style?: "none" | "badge" | "default"; // appereance of annotation, "default" is by default',
                    '   className?: string;         // a class to add to an annotation element',
                    '   text?: any;                 // text content of an annotation element',
                    '   icon?: string;              // name of icon or url to an image',
                    '   href?: string;              // annotation is a link and that\'s an URL',
                    '   external?: boolean;         // open a link in new tab, make sence when `href` is specified only',
                    '   tooltip?: TooltipConfig;    // configuration for a tooltip, the same as for any view',
                    '}',
                    '```',
                    '',
                    'An annotation is not displayed (not rendered) when computed annotation config is a falsy value. Any other value (truthy, but not an object) is used as value for `text` option, i.e. `"example"` is the same as `{ text: "example" }`.',
                    '',
                    'In addition to a string or function, an object can be used as an element of `annotations` array',
                    '* `query` – a string (jora query) or a function to compute an annotation config',
                    '* `debug` (optional) - when truthy a debug information is output to the console; when value is a string, it\'s used in debug message'
                ]
            }],
            demoData: {
                items: [
                    { id: 1, value: 'example' },
                    { id: 2, value: 'bar' },
                    { id: 3, value: 'baz' }
                ],
                'annotation styles': [
                    'none',
                    'default',
                    'badge'
                ]
            },
            demo: {
                view: 'struct',
                expanded: 3,
                annotations: [
                    '#.key = "items" ? { place: "before", style: "badge", text: "view as table", tooltip: "table" } : null',
                    '$ ~= /az/ and "Value has \'az\' substring!"',
                    '$ in ["none", "default", "badge"] and { style: $, place: "before", text: $ + " before" }',
                    '$ in ["none", "default", "badge"] and { style: $, text: $ + " after" }'
                ]
            }
        },
        {
            title: 'Limit number of array elements and object entries',
            beforeDemo: {
                view: 'md',
                source: [
                    'The following options define the maximum number of elements in array or entries in object:',
                    '* `limit` (default: `50`) – max number of elements/entries for expanded array/object',
                    '* `limitCollapsed` (default: `4`) – max of elements/entries for collapsed array/object',
                    '* `limitCompactObjectEntries` (default: `0`) – max number of entries in a object which appears in a collapsed array or object',
                    '',
                    '> Use `false` for any of these options to disable a limitation'
                ]
            },
            highlightProps: [
                'limit',
                'limitCollapsed',
                'limitCompactObjectEntries'
            ],
            demoData: defaultDemoData,
            demo: {
                view: 'struct',
                limit: 4,
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
                    '* `maxStringLength` (default: `150`) – max string length when a host value is expanded',
                    '* `maxCompactStringLength` (default: `40`) – max of string length when a host value is collapsed',
                    '* `allowedExcessStringLength` (default: `10`) – allowed excess in length before a string will be cut and \\"N more\\" label will be added',
                    '* `maxPropertyLength` (default: `Infinity`) – max of property name length',
                    '* `maxCompactPropertyLength` (default: `35`) – max of property name length in collapsed objects',
                    '',
                    '> Expand and collapse `level2` branch to see difference in a value presentation'
                ]
            },
            highlightProps: [
                'maxStringLength',
                'maxCompactStringLength',
                'allowedExcessStringLength',
                'maxPropertyLength',
                'maxCompactPropertyLength'
            ],
            demo: {
                view: 'struct',
                maxStringLength: 30,
                maxCompactStringLength: 10,
                allowedExcessStringLength: 5,
                maxPropertyLength: 30,
                maxCompactPropertyLength: 15,
                expanded: 1
            },
            demoData: {
                stringsInExpandedObject: 'Quite a long string value Quite a long string value',
                string_34_chars: 'String with 34 chars length demo x',
                string_35_chars: 'String with 35 chars length demo xx',
                string_36_chars: 'String with 36 chars length demo xxx',
                very_very_very_very_very_very_very_very_very_very_long_property_name: 'a property name should be truncated due to settings, but will not be by default',
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
