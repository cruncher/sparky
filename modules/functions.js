
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
Functions
*/

/*
Register

Sparky 'functions' are view-controllers with access to the node where they are
declared and control over the flow of objects being sent to the renderer. They
are registered and accessed by a string identifier.

```
import { register } from './sparky/module.js';

register('my-function', function(node, params) {
    // `this` is a stream of scope objects
    return this.map(function(scope) {
        // Map scope...
    });
});
```

Functions are called before a node is mounted. They receive a stream of scopes
and the DOM node, and may return the same stream, or a new stream, or they may
block mounting and rendering altogether. Types of return value are interpreted
as follows:

- `Promise` - automatically converted to a stream
- `Stream` - a stream of scopes
- `undefined` - equivalent to returning the input stream
- `false` - cancels the mount process

The stream returned by the last function declared in the `fn` attribute is
piped to the renderer. Values in that stream are rendered, and the life
of the renderer is controlled by the state of that stream. Here are a few
examples.

Push a single scope object to the renderer:

```
import { register, Stream } from './sparky/module.js';

register('my-scope', function(node, params) {
    // Return a stream of one object
    return Stream.of({
        text: 'Hello, Sparky!'
    });
});
```

Return a promise to push a scope when it is ready:

```
register('my-package', function(node, params) {
    // Return a promise
    return fetch('package.json')
    .then((response) => response.json());
});
```

Push a new scope object to the renderer every second:

```
register('my-clock', function(node, params) {
    const output = Stream.of();

    // Push a new scope to the renderer once per second
    const timer = setInterval(() => {
        output.push({
            time: window.performance.now()
        });
    }, 1000);

    // Listen to the input stream, stop the interval
    // timer when it is stopped
    this.done(() => clearInterval(timer));

    // Return the stream
    return output;
});
```

Sparky's streams are imported from the Fn library. Read more about streams at
<a href="https://stephen.band/fn/#stream">stephen.band/fn/#stream</a>.
*/

const DEBUG = window.DEBUG;

export const functions = Object.create(null);

export function register(name, fn) {
    if (/^(?:function\s*)?\(node/.exec(fn.toString())) {
        console.log(fn);
        //throw new Error('First param is node. No no no.')
    }

    if (DEBUG && functions[name]) {
        throw new Error('Sparky: fn already registered with name "' + name + '"');
    }

    functions[name] = fn;
}
