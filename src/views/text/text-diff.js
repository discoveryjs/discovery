/* eslint-env browser */
import { createElement } from '../../core/utils';
import usage from './text-diff.usage.js';
import {
    diffChars,
    diffWords,
    diffWordsWithSpace,
    diffSentences,
    diffLines
} from 'diff';

const diffType = {
    char: diffChars,
    word: diffWords,
    wordws: diffWordsWithSpace,
    sentence: diffSentences,
    line: diffLines
};

const props = `is not array? | {
    before,
    after,
    delta: undefined,
    type: undefined
} | overrideProps() | {
    before is string ?: '',
    after is string ?: '',
    delta | $ in ['added', 'removed', 'both'] ?: 'both',
    type | $ in ${JSON.stringify(Object.keys(diffType))} ?: 'wordws'
}`;

export default function(host) {
    host.view.define('text-diff', function(el, config) {
        const { type, before, after, delta } = config;

        const diff = diffType[type](before, after);
        const showAdded = delta === 'both' || delta === 'added';
        const showRemoved = delta === 'both' || delta === 'removed';

        for (const { added, removed, value } of diff) {
            let textContainer = el;

            if (added || removed) {
                if (added ? !showAdded : !showRemoved) {
                    continue;
                }

                textContainer = el.appendChild(createElement('span', added ? 'added' : 'removed'));
            }

            textContainer.append(value);
        }
    }, { props, usage });
}
