
import { events, isTargetEvent } from '../../dom/dom.js';
import Sparky from './sparky.js';

Sparky.fn['start-on'] = function(node, scopes, params) {
    const sparky = this;
    const name   = params[0];

    sparky.interrupt();

    events(name, node)
    .filter(isTargetEvent)
    .each(function(e) {
        this.stop();
        sparky.continue();
    });
};
