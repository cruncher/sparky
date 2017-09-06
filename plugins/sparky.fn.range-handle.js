(function(window) {
	"use strict";
	
	var Fn        = window.Fn;
	var normalise = Fn.normalise;

	function getValue(e) {
		return e.target.value;
	}

	Sparky.fn['range-handle'] = function(node, scopes) {
		var id    = node.getAttribute('for');
		var input = document.getElementById(id);

		if (!input) {
			throw new Error('Sparky.fn.range: input id="' + id + '" not found in DOM');
		}

		dom
		.event('input change', input)
		.map(getValue)
		.dedup()
		.each(function(value) {
			var min   = input.min && parseFloat(input.min) || 0;
			var max   = input.max && parseFloat(input.max) || 100;
			var ratio = normalise(min, max, parseFloat(value));

			node.style.marginLeft = (ratio * 100) + '%';
			node.style.transform  = 'translate3d(-' + (ratio * 100) + '%, 0, 0)';
		});
	};
})(this);
