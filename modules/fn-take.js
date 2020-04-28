
import { mutations, nothing, take } from '../../fn/module.js';
import { register } from './fn.js';

register('take', function(node, params) {
    return this
    .scan((stream, object) => {
        stream.stop();
        return mutations('.', object)
        .map(take(params[0]));
    }, nothing)
    .flat();
});
