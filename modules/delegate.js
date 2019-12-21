
/*
For creating event delegation controllers:

register('events', delegate({
    'click': {
        'button[name]': fn
    )
});
*/

import { events } from '../../dom/module.js';

function createArgs(e, selector) {
    const node = e.target.closest(selector);
    // Default to undefined, the stream filters out undefined
    return node ? [node, e] : undefined ;
}

function notDisabled(args) {
    return !args[0].disabled;
}

function listen(scopes, type, selector, fn, node) {
    console.log('LISTEN', type, node, document.body.contains(node));
    var stream = events(type, node)
    .map((e) => createArgs(e, selector))
    // Don't listen to disabled nodes
    .filter(notDisabled)
    // Call fn(node, e)
    .each((args) => fn.apply(null, args));

    scopes.done(() => stream.stop());
}

export default function delegate(types, selector, fn) {
    return typeof types === 'object' ?
        function delegate(node) {
            console.log('delegate', type, selector, node);
            //var scopes = this;
            var type;
            //var first = true;
            //return this.tap(function() {
            //    if (!first) { return; }
            //    first = false;
            //    requestAnimationFrame(function() {
                    for (type in types) {
                        for (selector in types[type]) {
                            listen(this, type, selector, types[type][selector], node);
                        }
                    }
            //    });
            //});
        } :
        function delegate(node) {
            listen(this, types, selector, fn, node);
        } ;
}
