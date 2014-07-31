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
	};

	function createInputCtrl(to, from) {
		return function(node, model, sparky) {
			var scope = Sparky.extend({}, model);
			sparky.on('ready', ready, node, scope, model, to, from);
			return scope;
		};
	};

	Sparky.ctrl['input-pow-1'] = createInputCtrl(function to(value) {
		return pow(value, n2p1);
	}, function from(value) {
		return pow(value, 1/n2p1);
	});

	Sparky.ctrl['input-pow-2'] = createInputCtrl(function to(value) {
		return pow(value, n2p2);
	}, function from(value) {
		return pow(value, 1/n2p2);
	});

	Sparky.ctrl['input-pow-3'] = createInputCtrl(function to(value) {
		return pow(value, n2p3);
	}, function from(value) {
		return pow(value, 1/n2p3);
	});

	Sparky.ctrl['input-log10'] = createInputCtrl(function to(value) {
		return Math.exp(value * Math.LN10);
	}, function from(value) {
		return Math.log(value) / Math.LN10;
	});

	Sparky.ctrl['input-pow-e'] = createInputCtrl(function to(value) {
		return pow(value, Math.E);
	}, function from(value) {
		return pow(value, 1/Math.E);
	});
})();