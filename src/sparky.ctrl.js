(function() {
	"use strict";
	
	var pow = Math.pow;

	var root2 = Math.sqrt(2);
	
	var n2p1 = pow(2, 0.5);
	var n2p2 = 2;
	var n2p3 = pow(2, 1.5);
	var n2p4 = pow(2, 2);
	var n2p5 = pow(2, 2.5);
	
	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function log(n, base) {
		var divider = base ? Math.log(base) : Math.LN10;
		return Math.log(n) / divider;
	}

	function getName(node) {
		return node.name.replace('{{', '').replace('}}', '');
	}

	function normalise(value, min, max) {
		return (value - min) / (max - min);
	}

	function denormalise(value, min, max) {
		return value * (max - min) + min;
	}

	function ready(sparky, node, scope, model, to, from) {
		var name = getName(node);
		var min = node.min ? parseFloat(node.min) : 0 ;
		var max = node.max ? parseFloat(node.max) : 1 ;
		var flag = false;

		function updateScope() {
			var value;

			if (flag) { return; }

			value = denormalise(from(normalise(model[name], min, max)), min, max);

			if (value !== scope[name]) {
				flag = true;
				scope[name] = value;
				flag = false;
			}
		}

		function updateModel() {
			var value;

			if (flag) { return; }

			value = denormalise(to(normalise(scope[name], min, max)), min, max);

			if (value !== model[name]) {
				flag = true;
				model[name] = value;
				flag = false;
			}
		}

		Sparky.observe(model, name, updateScope);
		Sparky.observe(scope, name, updateModel);
		updateScope();

		sparky.on('destroy', function() {
			Sparky.unobserve(model, name, updateScope);
			Sparky.unobserve(scope, name, updateModel);
		});
	};

	function createInputCtrl(to, from) {
		return function(node, model) {
			var scope = Sparky.extend({}, model);
			this.on('ready', ready, node, scope, model, to, from);
			return scope;
		};
	};

	Sparky.ctrl['input-pow-1'] = createInputCtrl(function to(value) {
		return pow(value, n2p1);
	}, function from(value) {
		return pow(value, 1/n2p1);
	});

	Sparky.ctrl['input-pow-3'] = createInputCtrl(function to(value) {
		return pow(value, n2p3);
	}, function from(value) {
		return pow(value, 1/n2p3);
	});

	Sparky.ctrl['input-pow-4'] = createInputCtrl(function to(value) {
		return pow(value, n2p4);
	}, function from(value) {
		return pow(value, 1/n2p4);
	});

	Sparky.ctrl['value-exp-10'] = createInputCtrl(function to(value) {
		return (Math.exp(value * Math.LN10) - 1) / 9;
	}, function from(value) {
		return Math.log(value * 9 + 1) / Math.LN10;
	});

	Sparky.ctrl['value-pow-2'] = createInputCtrl(function to(value) {
		return pow(value, 2);
	}, function from(value) {
		return pow(value, 1/2);
	});

	Sparky.ctrl['value-pow-3'] = createInputCtrl(function to(value) {
		return pow(value, 3);
	}, function from(value) {
		return pow(value, 1/3);
	});


	Sparky.ctrl['value-log'] = function(node, model, sparky) {
		var scope = Sparky.extend({}, model);
		var name = getName(node);
		var min = node.min ? parseFloat(node.min) : 0 ;
		var max = node.max ? parseFloat(node.max) : 1 ;
		var ratio = max / min;
		var flag = false;

		if (min <= 0) {
			console.warn('[Sparky] Controller "value-log" cannot accept a value of 0 or lower in the min attribute.', node);
			return scope;
		}

		function updateScope() {
			var value;

			if (flag) { return; }

			value = denormalise(Math.log(model[name] / min) / Math.log(ratio), min, max);

			if (scope[name] !== value) {
				flag = true;
				scope[name] = value;
				flag = false;
			}
		}

		function updateModel() {
			var value;

			if (flag) { return; }

			value = min * Math.pow(ratio, normalise(scope[name], min, max));

			if (model[name] !== value) {
				flag = true;
				model[name] = value;
				flag = false;
			}
		}

		sparky
		.on('ready', function() {
			Sparky.observe(model, name, updateScope);
			Sparky.observe(scope, name, updateModel);
			updateScope();
		})
		.on('destroy', function() {
			Sparky.unobserve(model, name, updateScope);
			Sparky.unobserve(scope, name, updateModel);
		});

		return scope;
	};
})();

(function() {
	"use strict";

	var n = 0;

	Sparky.ctrl['debug'] = function(node, model) {
		console.log('Sparky DEBUG', n++);
		debugger;
	};
})();
