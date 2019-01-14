export default function debug(node, scopes) {
    debugger;

    return scopes.tap((scope) => {
        console.log('Sparky scope', scope, node);
    });
}
