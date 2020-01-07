/*
submit:

Hijacks submit events and sends a request with the current scope as the body.
The request type is the form `method`, and the url the form `action` attribute.

```html
<form fn="submit">
    ...
</form>
```
*/


import { get } from '../../fn/module.js';
import { events, preventDefault, request } from '../../dom/module.js';
import { register } from './functions.js';

register('submit', function(node, params) {
    var scope;

    events('submit', node)
    .filter((e) => !e.defaultPrevented)
    .tap(preventDefault)
    .map(get('target'))
    .each(function (form) {
        const method   = form.method;
        const url      = form.action || '';
        const mimetype = form.getAttribute('enctype') || 'application/json';

        request(method, mimetype, url, scope);
        //.then(function (data) {
        //    events.trigger(form, 'dom-submitted', {
        //        detail: data
        //    });
        //})
        //.catch(function (error) {
        //    events.trigger(form, 'dom-submit-error', {
        //        detail: error
        //    });
        //});
    });

    return this.tap((s) => scope = s);
});




