
import { register } from './functions.js';

/**
stop:

Stops sparkifying the element. No more functions are run, and
the contents of the element are not parsed. Use <code>stop</code>
to ignore blocks of static HTML inside a Sparky template.
*/

register('stop', function(node, params) {
    return false;
});
