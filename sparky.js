
// Sparky

// Sparky colour scheme
//
// #d0e84a
// #b9d819 - Principal bg colour
// #a3b31f
// #858720
// #d34515
// #915133
// #723f24
// #6894ab
// #4a6a7a
// #25343c
// #282a2b

if (window.console && window.console.log) {
    console.log('%cSparky%c      - https://github.com/cruncher/sparky', 'color: #a3b31f; font-weight: 600;', 'color: inherit; font-weight: 300;');
}

import Sparky from './modules/sparky.js';
export default Sparky;

export { default as functions } from './modules/fn.js';
export { transforms, transformers } from './modules/transforms.js';
export { events } from '../dom/dom.js';
export { notify } from '../fn/fn.js';
import { cue }    from './modules/timer.js';

// Launch sparky on sparky templates.
// Ultimately this will be a web component, I guess
cue({
    fire: function() {
        window.document
        .querySelectorAll('[is="sparky"]')
        .forEach((node) => {
            new Sparky(node);
        });
    }
});
