import { Observable } from '../../fn/module.js';

export default function get(node, input, params) {
    const path = params[0];
    return input.chain((object) => Observable(path, object));
}
