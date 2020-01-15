
import { register } from './fn.js';

const map = new WeakMap();

export function getScope(node) {
    if (!map.has(node.correspondingUseElement || node)) {
        throw new Error('Sparky scope is not set on node');
    }

    return map.get(node);
}

register('scope', function(node, params) {
    return this
    .tap((scope) => map.set(node.correspondingUseElement || node, scope))
    .done(() => map.delete(node));
});
