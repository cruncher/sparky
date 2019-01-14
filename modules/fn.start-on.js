
import { events, isTargetEvent } from '../../dom/dom.js';

export default function startOn(node, scopes, params) {
    const name = params[0];

    //sparky.interrupt();

    events(name, node)
    .filter(isTargetEvent)
    .each(function(e) {
        // Stop listening after first event
        this.stop();

        //sparky.continue();
    });
}
