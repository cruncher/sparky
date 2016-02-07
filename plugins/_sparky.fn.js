(function() {
	"use strict";

	Sparky.fn['html'] = function(node, scope) {
		var property = node.getAttribute('data-property');

		function update() {
			node.innerHTML = scope[property];
		}

		observe(scope, property, update);

		this.destroy = function() {
			unobserve(scope, property, update);
		};
	};
})();

(function() {
	"use strict";

	Sparky.fn['click-to-call'] = function(node, scope) {
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

	Sparky.fn['replace'] = function(node, scope) {
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
			var child = sparky.slave(name, scope);
			var n = child.length;

			while (n--) {
				dom.after(node, child[n]);
			}
		});

		dom.remove(node);
	};
})();


(function() {
	"use strict";

	var assign = Object.assign;

	function stringToFloat(value) {
		// coerse to number
		var n = parseFloat(value);
		return Number.isNaN(n) ? undefined :
			n ;
	}

	function numberRound0ToString(value) {
		return typeof value === 'number' ? value.toFixed(0) + '' :
			undefined ;
	}

	function numberRound1ToString(value) {
		return typeof value === 'number' ? value.toFixed(1) + '' :
			undefined ;
	}

	function numberRound2ToString(value) {
		return typeof value === 'number' ? value.toFixed(2) + '' :
			undefined ;
	}

	function numberRound3ToString(value) {
		return typeof value === 'number' ? value.toFixed(3) + '' :
			undefined ;
	}

	assign(Sparky.fn, {
		"value-number-decimals-0": function(node, model) {
			var unbind = Sparky.parseName(node, model, numberRound0ToString, stringToFloat);
			if (unbind) { this.on('destroy', unbind); }
		},

		"value-number-decimals-1": function(node, model) {
			var unbind = Sparky.parseName(node, model, numberRound1ToString, stringToFloat);
			if (unbind) { this.on('destroy', unbind); }
		},

		"value-number-decimals-2": function(node, model) {
			var unbind = Sparky.parseName(node, model, numberRound2ToString, stringToFloat);
			if (unbind) { this.on('destroy', unbind); }
		},

		"value-number-decimals-3": function(node, model) {
			var unbind = Sparky.parseName(node, model, numberRound3ToString, stringToFloat);
			if (unbind) { this.on('destroy', unbind); }
		}
	});
})();


(function(window) {
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

		Sparky.fn['value-number-pow-2'] = function(node, model) {
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

			var unbind = Sparky.parseName(node, model, to, from);
			this.on('destroy', unbind);
		};

		Sparky.fn['value-number-pow-3'] = function(node, model) {
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

			var unbind = Sparky.parseName(node, model, to, from);
			this.on('destroy', unbind);
		};

		Sparky.fn['value-number-log'] = function(node, model) {
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

			var unbind = Sparky.parseName(node, model, to, from);

			this.on('destroy', unbind);
		};

		Sparky.fn['value-int-log'] = function(node, model) {
			var min = node.min ? parseFloat(node.min) : (node.min = 1) ;
			var max = node.max ? parseFloat(node.max) : (node.max = 10) ;
			var ratio = max / min;

			if (min <= 0) {
				console.warn('Sparky: ctrl "value-int-log" cannot accept a min attribute of 0 or lower.', node);
				return;
			}

			function to(value) {
				if (typeof value !== 'number') { return ''; }
				var n = denormalise(Math.log(Math.round(value) / min) / Math.log(ratio), min, max);
				return n + '';
			}

			function from(value) {
				var n = parseFloat(value);
				if (Number.isNaN(n)) { return; }
				return Math.round(min * Math.pow(ratio, normalise(n, min, max)));
			}

			var unbind = Sparky.parseName(node, model, to, from);

			this.on('destroy', unbind);
		};







		Sparky.fn['value-pow-2'] = function() {
			console.warn('Sparky: ctrl "value-pow-2" is deprecated. Use "value-number-pow-2"');
		};

		Sparky.fn['value-pow-3'] = function() {
			console.warn('Sparky: ctrl "value-pow-3" is deprecated. Use "value-number-pow-3"');
		};

		Sparky.fn['value-log'] = function(node, model) {
			console.warn('Sparky: ctrl "value-log" is deprecated. Replace with "value-number-log"');
		};





		Sparky.fn["x-scroll-center"] = function(node) {
			// Center the scroll position horizontally
			this.on('insert', function() {
				var w = node.clientWidth;
				var s = node.scrollWidth;
				node.scrollLeft = (s - w) / 2;
			});
		};

		Sparky.fn["y-scroll-center"] = function(node) {
			// Center the scroll position vertically
			this.on('insert', function() {
				var h = node.clientHeight;
				var s = node.scrollHeight;
				node.scrollTop = (s - h) / 2;
			});
		};

})(this);
