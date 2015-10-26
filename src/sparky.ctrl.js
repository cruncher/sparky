
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
			var n = denormalise(pow(normalise(value, min, max), 1/2), min, max);
			return n + '';
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
			return n + '';
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


	function preventDefault(e) {
		e.preventDefault();
	}

	Sparky.scope = function(node) {
		console.warn('Sparky: Sparky.scope() deprecated in favour of Sparky.getScope()')
		return Sparky.getScope(node);
	};

	Sparky.setScope = function(node, scope) {
		jQuery.data(node, 'scope', scope);
	};

	Sparky.getScope = function(node) {
		return jQuery.data(node, 'scope');
	};

	Object.assign(Sparky.ctrl, {
		"prevent-click": function preventClickCtrl(node) {
			node.addEventListener('click', preventDefault);
			this.on('destroy', function() {
				node.removeEventListener('click', preventDefault);
			});
		},

		"prevent-submit": function preventSubmitCtrl(node) {
			node.addEventListener('submit', preventDefault);
			this.on('destroy', function() {
				node.removeEventListener('submit', preventDefault);
			});
		},

		"delegate-scope": Sparky.setScope
	});
})();


(function() {
	"use strict";

	var n = 0;

	Sparky.ctrl['log'] = function(node, scope) {
		console.log('node: ', node);
		console.log('scope:', scope);
	};

	Sparky.ctrl['log-events'] = function(node, model) {
		var ready = 0;
		var insert = 0;
		var destroy = 0;

		this
		.on('ready', function() {
			console.log('READY', ready++, node);
		})
		.on('insert', function() {
			console.log('INSERT', insert++, node);
		})
		.on('destroy', function() {
			console.log('DESTROY', destroy++, node);
		});
	};
})();

(function() {
	"use strict";
	
	Sparky.ctrl['html'] = function(node, scope) {
		var property = node.getAttribute('data-property');

		function update() {
			node.innerHTML = scope[property];
		}

		observe(scope, property, update);

		this.destroy = function() {
			unobserve(scope, property, update);
		};
	};

	Sparky.ctrl['inner-html'] = function() {
		console.warn('Sparky: deprecated data-ctrl="inner-html". Use data-ctrl="html"');
		Sparky.ctrl['html'].apply(this, arguments);
	};
})();

(function() {
	"use strict";
	
	Sparky.ctrl['click-to-call'] = function(node, scope) {
		var name = node.getAttribute('data-fn');

		function update(e) {
			scope[name]();
			e.preventDefault();
		}

		node.addEventListener('click', update);

		this.destroy = function() {
			node.removeEventListener('click', update);
		};
	};
})();

(function() {
	"use strict";

	var dom = Sparky.dom;

	Sparky.ctrl['replace'] = function(node, scope) {
		// Replaces node with contents of one or more
		// templates given by data-replace attribute

		var sparky = this;
		var string = node.getAttribute('data-replace');

		if (!string) {
			console.error(node);
			throw new Error('Sparky: ctrl "replace" requires attribute data-replace.');
		}

		string
		.split(Sparky.rspaces)
		.forEach(function(name) {
			var child = Sparky(name, scope);
			var n = child.length;

			while (n--) {
				dom.after(node, child[n]);
			}

			sparky.on(child);
		});

		dom.remove(node);
	};
})();
