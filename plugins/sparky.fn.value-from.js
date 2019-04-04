import { get, set, normalise, Observer } from '../../fn/module.js';
import dom from '../../dom/module.js';
import Sparky from '../module.js';

function getValue(target) {
    return parseFloat(target.value);
}

function normaliseValue(target) {
    var min   = parseFloat(target.min);
    var max   = parseFloat(target.max);
    var value = parseFloat(target.value);
    return normalise(min, max, value);
}

function valueFrom(getValue, sparky, node, stream, target, name) {
    var scope = Observer({});

    var event = dom
    .events('change input', target)
    .map(get('target'))
    .unshift(target)
    .map(getValue)
    .each(set(name, scope));

    // Handle unbinding
    sparky.then(event.stop);

    return Fn.of(scope);
}

Sparky.fn['value-from'] = function(node, stream, params) {
    var target = dom.get(params[0]);

    if (!target) {
        throw new Error('Sparky.fn.value-from: no element found for id "' + params[0] + '"');
    }

    return valueFrom(getValue, this, node, stream, target, params[1] || 'value');
};

Sparky.fn['normal-from'] = function(node, stream, params) {
    var target = dom.get(params[0]);

    if (!target) {
        throw new Error('Sparky.fn.value-from: no element found for id "' + params[0] + '"');
    }

    return valueFrom(normaliseValue, this, node, stream, target, params[1] || 'normal');
};
