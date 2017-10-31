(function() {
    "use strict";

    var Fn         = window.Fn;
    var dom        = window.dom;
    var Observable = window.Observable;

    var get        = Fn.get;
    var set        = Fn.set;

    Sparky.fn['value-from'] = function(node, stream, params) {
		var target = dom.query(params[0])[0];

		if (!target) {
			throw new Error('Sparky.fn.value-from: no element found for selector "' + params[0] + '"');
		}

		var scope  = Observable({});

		var event = dom
		.event('input', target)
		.map(get('target'))
		.unshift(target)
		.map(get('value'))
		.each(set('value', scope));

		// Handle unbinding
		this.then(event.stop);

		return Fn.of(scope);
	};
})()
