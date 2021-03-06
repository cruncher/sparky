/**
get: path

Maps scope to the value at `path` of the current scope:

```html
<a fn="get:repository" href="{[ url ]}">{[type|capitalise]} repository</a>
```

```html
<a href="https://github.com/cruncher/sparky.git">Git repository</a>
```
*/

import { mutations, nothing } from '../../fn/module.js';
import { register } from './fn.js';

register('get', function(node, params) {
    return this
    .scan((stream, object) => {
        stream.stop();
        return mutations(params[0], object);
    }, nothing)
    .flat();
});
