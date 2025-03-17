import type { SingleViewConfig } from '../view.js';
import jora from 'jora';

export function queryToConfig(view: string, query: string): SingleViewConfig {
    const { ast } = jora.syntax.parse(query);
    const config: SingleViewConfig = { view };

    if (ast.type !== 'Block') {
        throw new SyntaxError('[Discovery] ViewModel#queryToConfig(): query root must be a "Block"');
    }

    if (ast.body.type !== 'Object') {
        throw new SyntaxError('[Discovery] ViewModel#queryToConfig(): query root must return an "Object"');
    }

    for (const entry of ast.body.properties) {
        if (entry.type !== 'ObjectEntry') {
            throw new SyntaxError('[Discovery] ViewModel#queryToConfig(): unsupported object entry type "' + entry.type + '"');
        }

        let key: string;
        let value = entry.value;
        switch (entry.key.type) {
            case 'Literal':
                key = entry.key.value;
                break;

            case 'Identifier':
                key = entry.key.name;
                value ||= entry.key;
                break;

            case 'Reference':
                key = entry.key.name.name;
                value ||= entry.key;
                break;

            default:
                throw new SyntaxError('[Discovery] ViewModel#queryToConfig(): unsupported object key type "' + entry.key.type + '"');
        }

        if (key === 'view' || key === 'postRender') {
            throw new SyntaxError('[Discovery] ViewModel#queryToConfig(): set a value for "' + key + '" property in shorthand notation is prohibited');
        }

        // when / data / whenData properties take string values as a jora query
        // that's why we don't need for a special processing
        if (key === 'when' || key === 'data' || key === 'whenData') {
            // When value is a literal there is no need to compute them using a query,
            // so add such values to the config as is. However, this doesn't work for string values
            // since it will be treated as a query
            config[key] = value.type === 'Literal' && typeof value.value !== 'string'
                ? value.value
                : jora.syntax.stringify(value);
        } else {
            // We can use literal values as is excluding strings which start with '=',
            // since it's an indicator that the string is a query
            config[key] = value.type === 'Literal' && (typeof value.value !== 'string' || value.value[0] !== '=')
                ? value.value
                : '=' + jora.syntax.stringify(value);
        }
    }

    return config;
}
