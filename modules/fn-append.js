import { getPath } from '../../fn/module.js';
import { fragmentFromHTML } from '../../dom/module.js';
import { register } from './fn.js';

register('append', function (node, params) {
    const path = params[0];
    console.log('PATH', path);
    return this.tap((scope) => {
        // Avoid having Sparky parse the contents of documentation by waiting
        // until the next frame
        requestAnimationFrame(function () {
            const fragment = fragmentFromHTML(getPath(path, scope));
            node.appendChild(fragment);
        });
    });
});
