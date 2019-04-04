
const map = new WeakMap();

export function getScope(node) {
    if (!map.has(node.correspondingUseElement || node)) {
        throw new Error('Sparky scope is not set on node');
        return;
    }

    return map.get(node);
}

export default function scope(node, input, params) {
    input.done(() => map.delete(node));
    return input.tap((scope) => {
        console.log('SCOPE', node.correspondingUseElement || node, scope);

        return map.set(node.correspondingUseElement || node, scope);
    });
}
