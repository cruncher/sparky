
import { take } from '../../fn/module.js';
import { register } from './fn.js';

register('take', function(node, params) {
    return this.map(take(params[0]));
});
