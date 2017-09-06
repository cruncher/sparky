(function(window) {
	"use strict";
	
	var Fn        = window.Fn;
	var dom       = window.dom;

	var compose   = Fn.compose;
	var get       = Fn.get;
	var is        = Fn.is;
	var normalise = Fn.normalise;
	var pipe      = Fn.pipe;
	var throttle  = Fn.throttle;

	var map = {};
	var stream;

	function callReducer(node, fn) {
		fn(node);
		return node;
	}

	function toNormalisedValue(input) {
		var min   = input.min && parseFloat(input.min) || 0;
		var max   = input.max && parseFloat(input.max) || 100;
		var value = parseFloat(input.value) ;
		return normalise(min, max, value);
	}

	function setup() {
		stream = dom
		.event('input change', document.documentElement)
		.map(get('target'))
		.each(function(node) {
			var fns = map[node.id];
			if (!fns) { return; }
			fns.reduce(callReducer, node);
		});
	}

	function add(id, fn) {
		// If map has no keys, set it up
		if (Object.keys(map).length === 0) { setup(); }
		var fns = map[id] || (map[id] = []);
		fns.push(throttle(compose(fn, toNormalisedValue)));
	}

	function remove(id, fn) {
		if (!map[id]) { return; }
		var fns = map[id];
		remove(fns, fn);
		if (fns.length === 0) { delete map[id]; }
		if (Object.keys(map).length === 0) { teardown(); }
	}

	function teardown() {
		stream.stop();
	}

	Sparky.fn['range-handle'] = function(node, scopes) {
		var id = node.getAttribute('for');

		if (!id) {
			throw new Error('Sparky.fn.range: node has no for attribute', node);
		}

		add(id, function(ratio) {
			node.style.marginLeft = (ratio * 100) + '%';
			node.style.transform  = 'translate3d(-' + (ratio * 100) + '%, 0, 0)';
		});
	};
})(this);
