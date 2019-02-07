
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

export { config } from './modules/sparky.js';
export { default as bindings } from './modules/bindings.js';
export { default as mount } from './modules/mount.js';
export { default as functions } from './modules/fn.js';
export { transforms, transformers } from './modules/transforms.js';
export { events } from '../dom/dom.js';
export { notify } from '../fn/fn.js';
import { cue }    from './modules/timer.js';

const DEBUG = !!window.DEBUG;

// Launch sparky on sparky templates.
// Ultimately this will be a web component, I guess
cue({
    fire: function() {
        const templates = window.document.querySelectorAll('[is="sparky"]');

        if (DEBUG) {
            console.group('%cSparky%c ' + templates.length + ' root template' + (templates.length === 1 ? '' : 's'),
                'color: #858720; font-weight: 600;',
                'color: #6894ab; font-weight: 400;'
            );
        }

        templates.forEach(Sparky);

        if (DEBUG) {
            console.groupEnd();
        }
    }
});
