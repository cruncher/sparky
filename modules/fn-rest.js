
import { rest } from '../../fn/module.js';
import { register } from './functions.js';

register('rest', function(node, params) {
    return this.map(rest(params[0]));
});
