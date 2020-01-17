export function log(text) {
    window.console.log('%cSparky%c ' + text,
        'color: #858720; font-weight: 600;',
        'color: #6894ab; font-weight: 400;'
    );
}

export function logNode(target, attrFn, attrInclude) {
    const attrIs = target.getAttribute('is') || '';
    window.console.log('%cSparky%c'
        + ' ' + (window.performance.now() / 1000).toFixed(3)
        + ' <'
        + (target.tagName.toLowerCase())
        + (attrIs ? ' is="' + attrIs + '"' : '')
        + (attrFn ? ' fn="' + attrFn + '"' : '')
        + (attrInclude ? ' src="' + attrInclude + '"' : '')
        + '>',
        'color: #858720; font-weight: 600;',
        'color: #6894ab; font-weight: 400;'
    );
}

export function nodeToString(node) {
    return '<' +
    node.tagName.toLowerCase() +
    (['fn', 'class', 'id', 'include'].reduce((string, name) => {
        const attr = node.getAttribute(name);
        return attr ? string + ' ' + name + '="' + attr + '"' : string ;
    }, '')) +
    '/>';
}
