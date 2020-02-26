/**
Sparky.pipe(name, fn)

Define a pipe using `Sparky.pipe(name, fn)`.

```js
import Sparky from './sparky/build/module.js';

// Define {[.|my-pipe:param]}
Sparky.pipe('my-pipe', function(param, value) {
    // return something from param and value
});
```

A pipe may take any number of params; the final parameter is the
value being piped frmo the tag scope.

Pipes are called during the render process on the next animation frame
after the value of a tag has changed. It is best not to do anything
too expensive in a pipe to keep the render process fast.
*/

import { transformers } from './transforms.js';

const DEBUG = !!window.DEBUG;

export default function pipe(name, fx, ix) {
    if (DEBUG && transformers[name]) {
        throw new Error('Sparky pipe "' + name + '" already defined');
    }

    transformers[name] = {
        tx: fx,
        ix: ix
    };
}

/**
Examples

```js
import Sparky from './sparky/build/module.js';
const tax = 1.175;

// Define {[number|add-tax]}
Sparky.pipe('add-tax', function(value) {
    return value * tax;
});
```
*/