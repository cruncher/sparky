
/*
entries()

Maps scope to an array of `[key, value]` arrays.

```html
<ul>
    <li fn="get:repository entries each">{ [0]}: { [1]}</li>
</ul>
```

```html
<ul>
    <li>type: git</li>
    <li>url: https://github.com/cruncher/sparky.git</li>
</ul>
```
*/

import { register } from './functions.js';

register('entries', function(node, params) {
    return this.map(Object.entries);
});
