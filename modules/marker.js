import { create, tag } from '../../dom/dom.js';

const DEBUG = window.DEBUG;

export default function MarkerNode(node, config) {
    // A text node, or comment node in DEBUG mode, for marking a
    // position in the DOM tree so it can be swapped out with some
    // content in the future.

    if (!DEBUG) {
        return create('text', '');
    }

    var attrFn       = node && node.getAttribute(config ? config.attributeFn : 'fn');
    var attrTemplate = node && node.getAttribute(config ? config.attributeTemplate : 'template');

    return create('comment',
        tag(node) +
        (attrFn ? ' ' + (config ? config.attributeFn : 'fn') + '="' + attrFn + '"' : '') +
        (attrTemplate ? ' ' + (config ? config.attributeTemplate : 'template') + '="' + attrTemplate + '"' : '')
    );
}
