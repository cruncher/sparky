
import { events, isTargetEvent } from '../../dom/dom.js';

export default function startOn(node, scopes, params) {
    const name = params[0];

    events(name, node)
    .filter(isTargetEvent)
    .each(function(e) {
        // Stop listening after first event
        this.stop();
    });
}

export function stopOn(node, scopes, params) {
    const name = params[0];

    events(name, node)
    .filter(isTargetEvent)
    .each(function(e) {
        // Stop listening after first event
        this.stop();
    });
}
