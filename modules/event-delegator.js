
/*
For creating event controllers:

register('actions', EventDelegator('click', 'data-action', {
    name: fn
}));
*/

import { overload } from '../../fn/module.js';
import { attribute, events } from '../../dom/module.js';

export default function EventDelegator(type, attr, actions) {
    const delegate = overload(attribute(attr), actions);

    return function delegator(node) {
        const stream = events(type, node)
        .map((e) => e.target.closest('[' + attr + ']') || undefined)
        .filter((node) => !node.disabled)
        .each(delegate);

        this.done(() => stream.stop());
        return this;
    };
}
