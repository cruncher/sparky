
import { register } from './functions.js';

register('entries', function(node, params) {
    return this.map(Object.entries);
});
