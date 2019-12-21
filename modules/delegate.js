
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
            var types = type;
            for (type in types) {
                for (selector in types[type]) {
                    listen(this, type, selector, types[type][selector], node);
                }
            }
        } :
        function delegate(node) {
            listen(this, type, selector, fn, node);
        } ;
}
