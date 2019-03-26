
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
export { cue, uncue };
export { default as config } from './modules/config.js';
export { default as mountConfig } from './modules/config-mount.js';
export { default as mount } from './modules/mount.js';
export { getScope } from './modules/fn.scope.js';
export { functions };
export { transforms, transformers } from './modules/transforms.js';
export { events } from '../dom/dom.js';
export { notify } from '../fn/fn.js';

export function register(name, fn, options) {
    functions[name] = fn;
    functions[name].settings = options;
}

const DEBUG = !!window.DEBUG;

// Launch sparky on sparky templates.
// Ultimately this will be a web component, I guess
cue({
    render: function() {
        const templates = window.document.querySelectorAll('[is="sparky"]');
        var mutations = 0;

        if (DEBUG) {
            templates.forEach((template) => {
                const attrFn      = template.getAttribute('fn');
                const attrInclude = template.getAttribute('include');

                console.group('%cSparky%c is="sparky"'
                    + (attrFn ? ' fn="' + attrFn + '"' : '')
                    + (attrInclude ? ' include="' + attrInclude + '"' : ''),
                    'color: #858720; font-weight: 600;',
                    'color: #6894ab; font-weight: 400;'
                );

                const sparky = Sparky(template);
                mutations += sparky.mutations;

                console.groupEnd();
            });
        }
        else {
            templates.forEach(Sparky) ;
        }

        return mutations;
    }
});

if (DEBUG) {
    window.Sparky = Sparky;
    Sparky.functions = functions;
}
