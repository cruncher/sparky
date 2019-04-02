
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

import { cue, uncue } from './modules/timer.js';
import Sparky from './modules/sparky.js';
import functions from './modules/fn.js';

export default Sparky;
export { cue, uncue, functions };
export { default as config } from './modules/config.js';
export { default as mountConfig } from './modules/config-mount.js';
export { default as mount } from './modules/mount.js';
export { getScope } from './modules/fn.scope.js';
export { transforms, transformers } from './modules/transforms.js';
export { events } from '../dom/dom.js';
export { notify } from '../fn/fn.js';

export function register(name, fn, options) {
    functions[name] = fn;
    functions[name].settings = options;
}

const options = { is: 'sparky' };

// Launch sparky on sparky templates. Ultimately this will be a web
// component, I guess

cue({
    label: "IsRenderer",

    fire: function() {
        const renderer = this;

        window.document
        .querySelectorAll('[is="sparky"]')
        .forEach((template) => {
            const attrFn = options.fn = template.getAttribute('fn');
            const sparky = new Sparky(template, options);

            // If there is no attribute fn, there is no way for this sparky
            // to launch as it will never get scope. Enable sparky templates
            // with just an include by passing in blank scope.
            if (!attrFn) {
                const blank = {};
                sparky.push(blank);
                renderer.renderedValue = blank;
            }
        });
    }
});
