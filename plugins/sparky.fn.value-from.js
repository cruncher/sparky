(function() {
    "use strict";

    var Fn         = window.Fn;
    var dom        = window.dom;
    var Observable = window.Observable;

    var get        = Fn.get;
    var set        = Fn.set;
    var normalise  = Fn.normalise;

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
		var scope = Observable({});
		var event = dom
		.event('input', target)
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
console.log('Normal from', params)
        return valueFrom(normaliseValue, this, node, stream, target, params[1] || 'normal');
	};
})()
