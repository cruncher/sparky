
/*
fn=""

A `fn` attribute declares one or more functions to run on a template.
A **function** is expected to supply an object that Sparky uses to
render template **tags**:

```html
<template is="sparky-template" fn="fetch:package.json">
    I am { [title] }.
</template>
```

```html
I am Sparky.
```

The `fn` attribute may be declared on any element in a sparky template.
Here we use the built-in functions `fetch`, `get` and `each` to loop over an
array of keywords and generate a list:

```html
<template is="sparky-template" fn="fetch:package.json">
    <ul>
        <li fn="get:keywords each">{ [.] }</li>
    </ul>
</template>
```

```html
<ul>
    <li>javascript</li>
    <li>browser</li>
</ul>
```
*/

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
