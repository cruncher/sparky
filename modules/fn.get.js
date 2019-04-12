import { Observable, nothing } from '../../fn/module.js';

export default function get(node, input, params) {
    const path = params[0];
    var observable = nothing;

    return input.chain((object) => {
        observable.stop();
        observable = Observable(path, object);
        return observable;
    });
}
