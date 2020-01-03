
/*
register(name, fn)

```
import { register } from './sparky/module.js';

register('my-function', function(node, params) {
    // `this` is a stream of scope objects
    return this.map(function(scope) {
        // Map scope...
    });
});
```
*/

const DEBUG = window.DEBUG;

export const functions = Object.create(null);

export function register(name, fn) {
    if (DEBUG && functions[name]) {
        throw new Error('Sparky: fn already registered with name "' + name + '"');
    }

    functions[name] = fn;
}
