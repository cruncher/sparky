(function(window) {
	"use strict";

	var Fn        = window.Fn;
	var dom       = window.dom;

	var compose   = Fn.compose;
	var get       = Fn.get;
	var normalise = Fn.normalise;
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
		var fns = map[id] || (map[id] = []);
		var update = compose(fn, toNormalisedValue);
		fns.push(throttle(update));
		update(dom.get(id));
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

	Sparky.fn['range-handle'] = function(node) {
		var id = node.getAttribute('for');

		if (!id) {
			throw new Error('Sparky.fn.range: node has no for attribute', node);
		}

		// If map has no keys, set it up
		if (Object.keys(map).length === 0) {
			setup();
		}

		add(id, function(ratio) {
			node.style.marginLeft = (ratio * 100) + '%';
			node.style.transform  = 'translate3d(-' + (ratio * 100) + '%, 0, 0)';
		});
	};
})(this);
