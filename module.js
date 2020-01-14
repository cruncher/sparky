
// Sparky

// Sparky colour scheme
//
// #d0e84a
// #b9d819 - Principal bg colour
// #a3b31f
// #858720
// #d34515
// #915133
// #723f24
// #6894ab
// #4a6a7a
// #25343c
// #282a2b

if (window.console && window.console.log) {
    console.log('%cSparky%c      - https://github.com/cruncher/sparky', 'color: #a3b31f; font-weight: 600;', 'color: inherit; font-weight: 300;');
}

import { requestTick } from '../fn/module.js';
import { element } from '../dom/module.js';
import { cue, uncue } from './modules/timer.js';
import { log, logNode } from './modules/log.js';
import Sparky from './modules/sparky.js';

// Register base set of Sparky functions
import './modules/fn-debug.js';
import './modules/fn-each.js';
import './modules/fn-entries.js';
import './modules/fn-fetch.js';
import './modules/fn-get.js';
import './modules/fn-on.js';
import './modules/fn-rest.js';
import './modules/fn-scope.js';
import './modules/fn-take.js';

// Export API
export default Sparky;
export { Stream, Observer, observe } from '../fn/module.js';
export { cue, uncue };
//export { Fn, get, id, noop, nothing, notify, Observer, Observable, observe, set, Stream, Target } from '../fn/module.js';
//export { events, trigger } from '../dom/module.js';
export { default as config } from './modules/config.js';
export { default as mountConfig } from './modules/config-mount.js';
export { default as mount } from './modules/mount.js';
export { getScope } from './modules/fn-scope.js';
export { transforms, transformers } from './modules/transforms.js';
export { register } from './modules/functions.js';
export { default as delegate } from './modules/delegate.js';
export { default as ObserveFn } from './modules/fn-observe.js';


/*
<template is="sparky-template">

First, import Sparky:

```js
import '/sparky/module.js';
```

Sparky registers the `is="sparky-template"` custom element. Sparky templates
in the DOM are automatically replaced with their own rendered content:

```html
<template is="sparky-template">
    Hello!
</template>
```

```html
Hello!
```

Sparky templates extend HTML with 3 features: **template tags**, **functions**
and **includes**.
*/


// Register customised built-in element <template is="sparky-template">
//
// While loading we must wait a tick for sparky functions to register before
// declaring the customised template element. This is a little pants, I admit.
requestTick(function() {
    var supportsCustomBuiltIn = false;

    element('sparky-template', {
        extends: 'template',

        construct: function() {
            const fn = this.getAttribute('fn');

            if (DEBUG) { logNode(this, fn, this.getAttribute('include')); }

            if (fn) {
                Sparky(this, { fn: fn });
            }
            else {
                // If there is no attribute fn, there is no way for this sparky
                // to launch as it will never get scope. Enable sparky templates
                // with just an include by passing in blank scope.
                Sparky(this).push({});
            }

            // Flag
            supportsCustomBuiltIn = true;
        }
    });

    // If one has not been found already, test for customised built-in element
    // support by force creating a <template is="sparky-template">
    if (!supportsCustomBuiltIn) {
        document.createElement('template', { is: 'sparky-template' });
    }

    // If still not supported, fallback to a dom query for [is="sparky-template"]
    if (!supportsCustomBuiltIn) {
        log("Browser does not support custom built-in elements. Doin' it oldskool selectin' stylee.");

        window.document
        .querySelectorAll('[is="sparky-template"]')
        .forEach((template) => {
            const fn = template.getAttribute('fn');

            if (fn) {
                Sparky(template, { fn: fn });
            }
            else {
                // If there is no attribute fn, there is no way for this sparky
                // to launch as it will never get scope. Enable sparky templates
                // with just an include by passing in blank scope.
                Sparky(template).push({});
            }
        });
    }
});
