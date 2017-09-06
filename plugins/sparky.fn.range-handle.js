(function(window) {
	"use strict";
	
	var Fn        = window.Fn;

	var compose   = Fn.compose;
	var get       = Fn.get;
	var is        = Fn.is;
	var normalise = Fn.normalise;

	Sparky.fn['range-handle'] = function(node, scopes) {
		var id    = node.getAttribute('for');
		//var input = document.getElementById(id);

		//if (!input) {
		//	throw new Error('Sparky.fn.range: input id="' + id + '" not found in DOM');
		//}

		var value;

		dom
		// We have to delegate the event as we cannot be sure that input
		// (or node) is actually in the DOM yet. Hmmm.
		.event('input change', document.body)
		.map(get('target'))
		.filter(compose(is(id), get('id')))
		.filter(function dedup(node) { return node.value !== value; })
		.each(function(input) {
			var min   = input.min && parseFloat(input.min) || 0;
			var max   = input.max && parseFloat(input.max) || 100;
			var value = parseFloat(input.value) ;
			var ratio = normalise(min, max, value);

			node.style.marginLeft = (ratio * 100) + '%';
			node.style.transform  = 'translate3d(-' + (ratio * 100) + '%, 0, 0)';
		});
	};
})(this);
