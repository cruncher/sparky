
// Sparky.ctrls

(function() {
	"use strict";

	var pow = Math.pow;

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function normalise(value, min, max) {
		return (value - min) / (max - min);
	}

	function denormalise(value, min, max) {
		return value * (max - min) + min;
	}

	Sparky.ctrl['value-number-pow-2'] = function(node, model) {
		var min = node.min ? parseFloat(node.min) : (node.min = 0) ;
		var max = node.max ? parseFloat(node.max) : (node.max = 1) ;

		function to(value) {
			if (typeof value !== 'number') { return ''; }
			return denormalise(pow(normalise(value, min, max), 1/2), min, max);
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			return denormalise(pow(normalise(n, min, max), 2), min, max);
		}

		var unbind = Sparky.bindNamedValueToObject(node, model, to, from);
		this.on('destroy', unbind);
	};

	Sparky.ctrl['value-number-pow-3'] = function(node, model) {
		var min = node.min ? parseFloat(node.min) : (node.min = 0) ;
		var max = node.max ? parseFloat(node.max) : (node.max = 1) ;

		function to(value) {
			if (typeof value !== 'number') { return ''; }
			var n = denormalise(pow(normalise(value, min, max), 1/3), min, max);
			return n + '';
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			return denormalise(pow(normalise(n, min, max), 3), min, max);
		}

		var unbind = Sparky.bindNamedValueToObject(node, model, to, from);
		this.on('destroy', unbind);
	};

	Sparky.ctrl['value-number-log'] = function(node, model) {
		var min = node.min ? parseFloat(node.min) : (node.min = 1) ;
		var max = node.max ? parseFloat(node.max) : (node.max = 10) ;
		var ratio = max / min;

		if (min <= 0) {
			console.warn('Sparky: ctrl "value-number-log" cannot accept a min attribute of 0 or lower.', node);
			return;
		}

		function to(value) {
			if (typeof value !== 'number') { return ''; }
			var n = denormalise(Math.log(value / min) / Math.log(ratio), min, max);
			return n;
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			return min * Math.pow(ratio, normalise(n, min, max));
		}

		var unbind = Sparky.bindNamedValueToObject(node, model, to, from);
		this.on('destroy', unbind);
	};

	Sparky.ctrl['value-pow-2'] = function() {
		console.warn('Sparky: ctrl "value-pow-2" is deprecated. Use "value-number-pow-2"');
	};

	Sparky.ctrl['value-pow-3'] = function() {
		console.warn('Sparky: ctrl "value-pow-3" is deprecated. Use "value-number-pow-3"');
	};

	Sparky.ctrl['value-log'] = function(node, model) {
		console.warn('Sparky: ctrl "value-log" is deprecated. Replace with "value-number-log"');
	};
})();

(function() {
	"use strict";

	var n = 0;

	Sparky.ctrl['debug'] = function(node, model) {
		console.log('Sparky:DEBUG', n++);
		debugger;
	};
})();
