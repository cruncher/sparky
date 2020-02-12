import { create, tag } from '../../dom/module.js';

const DEBUG = window.DEBUG;

export default function MarkerNode(node, options) {
    // A text node, or comment node in DEBUG mode, for marking a
    // position in the DOM tree so it can be swapped out with some
    // content in the future.

    if (!DEBUG) {
        return create('text', '');
    }

    var attrFn      = node && node.getAttribute(options ? options.attributeFn : 'fn');
    var attrInclude = node && node.getAttribute(options ? options.attributeSrc : 'include');

    return create('comment',
        tag(node) +
        (attrFn ? ' ' + (options ? options.attributeFn : 'fn') + '="' + attrFn + '"' : '') +
        (attrInclude ? ' ' + (options ? options.attributeSrc : 'include') + '="' + attrInclude + '"' : '')
    );
}
