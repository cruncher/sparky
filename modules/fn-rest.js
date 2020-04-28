
import { mutations, nothing, rest } from '../../fn/module.js';
import { register } from './fn.js';

register('rest', function (node, params) {
    return this
        .scan((stream, object) => {
            stream.stop();
            return mutations('.', object)
                .map(rest(params[0]));
        }, nothing)
        .flat();
});
