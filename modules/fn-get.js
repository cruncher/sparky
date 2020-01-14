/*
get: path

Maps scope to the value at `path` of the current scope:

```html
<a fn="get:repository" href="{[ url ]}">{[type|capitalise]} repository</a>
```

```html
<a href="https://github.com/cruncher/sparky.git">Git repository</a>
```
*/

import { Observable, nothing } from '../../fn/module.js';
import { register } from './functions.js';

register('get', function(node, params) {
    return this
    .scan((stream, object) => {
        stream.stop();
        return Observable(params[0], object);
    }, nothing)
    .flat();
});
