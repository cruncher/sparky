
const map = new WeakMap();

export function getScope(node) {
    if (!map.has(node)) {
        console.warn('Sparky scope is not set on node', node);
    }

    return map.get(node);
}

export default function scope(node, input, params) {
    // Todo: remove scope on destroy
    return input.tap((scope) => map.set(node, scope));
}
