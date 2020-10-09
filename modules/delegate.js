
/*
delegate(types)

Create an event delegation controller fn, where `types` is an object of objects
mapping event types and selectors to listener functions:

```js
import { delegate, register } from './sparky/module.js';

register('fn-name', delegate({
    'click': {
        'button': function(button, e) {
            // Button was clicked...
        }
    )
});
```

To further delegate by the name of the button you could use `get`
and `overload` from Fn:

```js
import { delegate, register } from './sparky/module.js';
import { get, overload } from './fn/module.js';

register('fn-name', delegate({
    'click': {
        'button[name]': overload(get('name'), {
            'button-name': function() {
                // Button name="button-name" was clicked...
            }
        })
    )
});
```

(This is a little more efficient than listing all possible button names as
selectors).
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
    var stream = events(type, node)
    .map((e) => createArgs(e, selector))
    // Don't listen to disabled nodes
    .filter(notDisabled)
    // Call fn(node, e)
    .each((args) => fn.apply(null, args));

    scopes.done(() => stream.stop());
}

function listenSelf(scopes, type, fn, node) {
    var stream = events(type, node)
    .filter((e) => e.target === e.currentTarget)
    .each((args) => fn.apply(null, args));
    scopes.done(() => stream.stop());
}

export default function delegate(types) {
    return function delegate(node) {
        var type, selector;
        for (type in types) {
            for (selector in types[type]) {
                // Support :scope selector, which selects the currentTarget
                if (selector === ':scope') {
                    listenSelf(this, type, types[type][':scope'], node);
                }
                else {
                    listen(this, type, selector, types[type][selector], node);
                }
            }
        }
    };
}
