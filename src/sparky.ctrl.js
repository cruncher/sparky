(function() {
	"use strict";
	
	function getName(node) {
		return node.name.replace('{{', '').replace('}}', '');
	}
	
	function createInputCtrl(to, from) {
		return function(node, model) {
			var scope = {};
			var name = getName(node);
			var flag = false;

			function updateScope() {
				if (flag) { return; }
				flag = true;
				scope[name] = from(model[name]);
				flag = false;
			}

			function updateModel() {
				if (flag) { return; }
				flag = true;
				model[name] = to(scope[name]);
				flag = false;
			}

			observe(model, name, updateScope);
			observe(scope, name, updateModel);
			updateScope();

			return scope;
		};
	};

	Sparky.ctrl['input-log10'] = createInputCtrl(function to(value) {
		return Math.exp(value * Math.LN10);
	}, function from(value) {
		return Math.log(value) / Math.LN10;
	});

	Sparky.ctrl['input-exp'] = createInputCtrl(function to(value) {
		return Math.pow(value, Math.E);
	}, function from(value) {
		return Math.pow(value, 1/Math.E);
	});
})();