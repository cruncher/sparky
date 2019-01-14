import { noop, observe } from '../../fn/fn.js';
import { before, remove, replace } from '../../dom/dom.js';
import Marker from './marker.js';

export default function(node, stream, params) {
    const name    = params[0];
    const marker  = Marker(node);

    let visible   = false;
    let unobserve = noop;

    // Put the marker in place and remove the node
    before(node, marker);
    remove(node);

    return stream.map(function(scope) {
        unobserve();
        unobserve = observe(name, (value) => {
            var visibility = !!value;

            if(visibility === visible) { return; }
            visible = visibility;

            if (visible) {
                replace(marker, node);
            }
            else {
                replace(node, marker);
            }
        }, scope);
    });
}
