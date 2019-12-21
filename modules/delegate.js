
/*
For creating event delegation controllers:

register('events', Delegate({
    'click': {
        'button[name]': fn
    )
});
*/

import { events } from '../../dom/module.js';

function listen(scopes, type, selector, fn, node) {
    var stream = events(type, node)
    // Default to undefined, the stream filters out undefined
    .map((e) => e.target.closest(selector) || undefined)
    .filter((node) => !node.disabled)
    .each(fn);

    // Don't need - this is done internally by Sparky
    scopes.done(() => stream.stop());
}

export default function Delegate(type, selector, fn) {
    return typeof type === 'object' ?
        function delegate(node) {
            var scopes = this;
            var types = type;
            var first = true;
            return this.tap(function() {
                if (!first) { return; }
                first = false;
                requestAnimationFrame(function() {
                    for (type in types) {
                        for (selector in types[type]) {
                            listen(scopes, type, selector, types[type][selector], node);
                        }
                    }
                });
            });
        } :
        function delegate(node) {
            listen(this, type, selector, fn, node);
        } ;
}
