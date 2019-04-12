import { noop, observe } from '../../fn/module.js';
import { before, remove, replace } from '../../dom/module.js';
import Marker from './marker.js';

export default function(node, input, params) {
    const output  = Stream.of();
    const name    = params[0];
    const marker  = Marker(node);

    let visible   = false;
    let unobserve = noop;

    // Put the marker in place and remove the node
    before(node, marker);
    remove(node);

    input.each(function(scope) {
        unobserve();
        unobserve = observe(name, (value) => {
            var visibility = !!value;

            if(visibility === visible) { return; }
            visible = visibility;

            if (visible) {
                replace(marker, node);
                output.push(scope);
            }
            else {
                replace(node, marker);
                output.push(null);
            }
        }, scope);
    });

    return output;
}
