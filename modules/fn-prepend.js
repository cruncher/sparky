import { getPath } from '../../fn/module.js';
import { fragmentFromHTML } from '../../dom/module.js';
import { register } from './fn.js';

register('prepend', function (node, params) {
    const path = params[0];
    return this.tap((scope) => {
        // Avoid having Sparky parse the contents of documentation by waiting
        // until the next frame
        requestAnimationFrame(function () {
            const fragment = fragmentFromHTML(getPath(path, scope));
            node.prepend(fragment);
        });
    });
});
