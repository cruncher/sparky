export default function debug(node, scopes) {
    debugger;

    return scopes.tap((scope) => {
        console.group('Sparky fn="debug"')
        console.log('node ', node);
        console.log('scope', scope);
        debugger;
        console.groupEnd();
    });
}
