import { Fn } from '../../fn/fn.js';

export default function on(node, input, params) {
    return Fn.of(params[0]);
}
