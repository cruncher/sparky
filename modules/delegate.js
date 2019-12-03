
/*
For creating event controllers:

register('events', Delegate('click', 'button[name]', get('name'), {
    name: fn
}));
*/

import { overload } from '../../fn/module.js';
import { events } from '../../dom/module.js';

export default function Delegate(type, selector, toName, actions) {
    const run = overload(toName, actions);

    return function delegate(node) {
        const stream = events(type, node)
        // Default to undefined, the stream filters out undefined
        .map((e) => e.target.closest(selector) || undefined)
        .filter((node) => !node.disabled)
        .each(run);

        // Don't need - this is done internally by Sparky
        this.done(() => stream.stop());
    };
}
