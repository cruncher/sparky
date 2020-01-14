/*
fetch: url

Fetches and parses a JSON file and uses it as scope to render the node.

```html
<p fn="fetch:package.json">{[title]}!</p>
```

```html
<p>Sparky!</p>
```

*/

import { Stream } from '../../fn/module.js';
import { requestGet } from '../../dom/module.js';
import Sparky from './sparky.js';
import { register } from './functions.js';

const DEBUG = window.DEBUG;

const cache = {};

function importScope(url, scopes) {
    requestGet(url)
    .then(function(data) {
        if (!data) { return; }
        cache[url] = data;
        scopes.push(data);
    })
    .catch(function(error) {
        console.warn('Sparky: no data found at', url);
        //throw error;
    });
}

register('fetch', function(node, params) {
    var path = params[0];

    if (DEBUG && !path) {
        throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="import:url" requires a url.');
    }

    var scopes = Stream.of();

    // Test for path template
    if (/\$\{(\w+)\}/.test(path)) {
        this.each(function(scope) {
            var url = path.replace(/\$\{(\w+)\}/g, function($0, $1) {
                return scope[$1];
            });

            // If the resource is cached...
            if (cache[url]) {
                scopes.push(cache[url]);
            }
            else {
                importScope(url, scopes);
            }
        });

        return scopes;
    }

    // If the resource is cached, return it as a readable
    if (cache[path]) {
        return Stream.of(cache[path]);
    }

    importScope(path, scopes);
    return scopes;
});
