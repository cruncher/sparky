
import { preventDefault } from '../../dom/module.js';

export default function prevent(node, input, params) {
    node.addEventListener(params[0], preventDefault);
}
