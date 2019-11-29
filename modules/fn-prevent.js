
import { preventDefault } from '../../dom/module.js';
import { register } from './register.js';

register('prevent', function prevent(node, params) {
    node.addEventListener(params[0], preventDefault);
});
