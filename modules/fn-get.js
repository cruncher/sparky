

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
