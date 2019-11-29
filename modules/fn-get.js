

import { Observable, nothing } from '../../fn/module.js';
import { register } from './functions.js';

register('get', function(node, params) {
    const path = params[0];
    var observable = nothing;

    return this.chain((object) => {
        observable.stop();
        observable = Observable(path, object);
        return observable;
    });
});
