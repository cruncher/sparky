
import { preventDefault } from '../../dom/dom.js';

export default function prevent(node, input, params) {
    node.addEventListener(params[0], preventDefault);
}
