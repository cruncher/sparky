
const map = new WeakMap();

export function getScope(node) {
    if (!map.has(node)) {
        console.warn('Sparky scope is not set on node', node);
    }

    return map.get(node);
}

export default function scope(node, input, params) {
    input.toPromise().then(() => {
        console.log('Input stopped. Removing scope from cache.', node);
        map.delete(node);
    });

    // Todo: remove scope on destroy
    return input.tap((scope) => {
        scope ?
            map.set(node, scope) :
            map.delete(node);
    });
}
