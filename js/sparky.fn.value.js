(function(window) {
	"use strict";

	var assign = Object.assign;
	var Sparky = window.Sparky;
	var isDefined = Sparky.isDefined;
	var parseName = Sparky.parseName;
	var returnArg = Sparky.returnArg;
	var stringToInt = Sparky.stringToInt;
	var stringToFloat = Sparky.stringToFloat;
	var stringToBool = Sparky.stringToBool ;
	var stringOnToBool = Sparky.stringOnToBool;
	var definedToString = Sparky.definedToString;
	var intToString = Sparky.intToString;
	var floatToString = Sparky.floatToString;
	var boolToString = Sparky.boolToString;
	var boolToStringOn = Sparky.boolToStringOn;

	function noop() {}

	function stringToBoolInverted(value) {
		return !stringToBool(value);
	}

	function stringOnToBoolInverted(value) {
		return value !== 'on';
	}

	function boolToStringInverted(value) {
		return typeof value === 'boolean' ? !value + '' :
			typeof value === 'number' ? !value + '' :
			undefined ;
	}

	function boolToStringOnInverted(value) {
		return typeof value === 'boolean' || typeof value === 'number' ?
			value ? '' : 'on' :
			undefined ;
	}

	function normalise(value, min, max) {
		return (value - min) / (max - min);
	}

	function denormalise(value, min, max) {
		return value * (max - min) + min;
	}

	// Controllers

	function setup(sparky, node, to, from) {
		var scope, path, fn;
		var unbind = Sparky.parseName(node, function get(name) {
			return Sparky.get(scope, name);
		}, function set(name, value) {
			return scope && Sparky.set(scope, name, value);
		}, function bind(p, f) {
			path = p;
			fn = f;
		}, noop, to, from);

		sparky.on('scope', function update(sparky, newscope) {
			// Ignore events not from this sparky
			if (this !== sparky) { return; }
			if (scope) { Sparky.unobservePath(scope, path, fn); }
			scope = newscope;
			if (scope) { Sparky.observePath(scope, path, fn, true); }
		});

		sparky.on('destroy', function() {
			unbind();
			if (scope) { Sparky.unobservePath(scope, path, fn); }
		});
	}

	function valueAny(node, model) {
		// Coerce any defined value to string so that any values pass the type checker
		setup(this, node, definedToString, returnArg);
	}

	function valueString(node, model) {
		// Don't coerce so that only strings pass the type checker
		setup(this, node, returnArg, returnArg);
	}

	function valueNumber(node, model) {
		setup(this, node, floatToString, stringToFloat);
	}

	function valueInteger(node, model) {
		setup(this, node, floatToString, stringToInt);
	}

	function valueBoolean(node, model) {
		if (node.type === 'checkbox' && !isDefined(node.getAttribute('value'))) {
			setup(this, node, boolToStringOn, stringOnToBool);
		}
		else {
			setup(this, node, boolToString, stringToBool);
		}
	}

//	function valueBooleanInvert(node, model) {
//		var type = node.type;
//		var unbind = type === 'checkbox' && !isDefined(node.getAttribute('value')) ?
//		    	Sparky.parseName(node, model, boolToStringOnInverted, stringOnToBoolInverted) :
//		    	Sparky.parseName(node, model, boolToStringInverted, stringToBoolInverted);
//		if (unbind) { this.on('destroy', unbind); }
//	}

//	function valueNumberInvert(node, model) {
//		var min = node.min ? parseFloat(node.min) : (node.min = 0) ;
//		var max = mode.max ? parseFloat(node.max) : (node.max = 1) ;

//		bindName(this, node, function to(value) {
//			return typeof value !== 'number' ? '' : ('' + ((max - value) + min));
//		}, function from(value) {
//			var n = parseFloat(value);
//			return Number.isNaN(n) ? undefined : ((max - value) + min) ;
//		});

//		if (unbind) { this.on('destroy', unbind); }
//	};

	function valueFloatPow2(node, model) {
		var min, max;

		function updateMinMax() {
			min = node.min ? parseFloat(node.min) : 0 ;
			max = node.max ? parseFloat(node.max) : 1 ;
		}

		function to(value) {
			if (typeof value !== 'number') { return ''; }
			updateMinMax();
			return denormalise(Math.pow(normalise(value, min, max), 1/2), min, max) + '';
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			updateMinMax();
			return denormalise(Math.pow(normalise(n, min, max), 2), min, max);
		}

		setup(this, node, to, from);
	};

	function valueFloatPow3(node, model) {
		var min, max;

		function updateMinMax() {
			min = node.min ? parseFloat(node.min) : 0 ;
			max = node.max ? parseFloat(node.max) : 1 ;
		}

		function to(value) {
			if (typeof value !== 'number') { return ''; }
			updateMinMax();
			return denormalise(Math.pow(normalise(value, min, max), 1/3), min, max) + '';
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			updateMinMax();
			return denormalise(Math.pow(normalise(n, min, max), 3), min, max);
		}

		setup(this, node, to, from);
	};

	function valueFloatLog(node, model) {
		var min, max;

		function updateMinMax() {
			min = node.min ? parseFloat(node.min) : 1 ;
			max = node.max ? parseFloat(node.max) : 10 ;

			if (min <= 0) {
				console.warn('Sparky.fn["value-float-log"] cannot accept a min attribute of 0 or lower.', node);
				return;
			}
		}

		function to(value) {
			if (typeof value !== 'number') { return ''; }
			updateMinMax();
			return denormalise(Math.log(value / min) / Math.log(max / min), min, max) + '';
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			updateMinMax();
			return min * Math.pow(max / min, normalise(n, min, max));
		}

		setup(this, node, to, from);
	};

	function valueIntLog(node, model) {
		var min, max;

		function updateMinMax() {
			min = node.min ? parseFloat(node.min) : 1 ;
			max = node.max ? parseFloat(node.max) : 10 ;

			if (min <= 0) {
				console.warn('Sparky.fn["value-int-log"] cannot accept a min attribute of 0 or lower.', node);
				return;
			}
		}

		function to(value) {
			if (typeof value !== 'number') { return ''; }
			updateMinMax();
			return denormalise(Math.log(Math.round(value) / min) / Math.log(max / min), min, max) + '';
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			updateMinMax();
			return Math.round(min * Math.pow(max / min, normalise(n, min, max)));
		}

		setup(this, node, to, from);
	};




	assign(Sparky.fn, {
		'value-any':            valueAny,
		'value-string':         valueString,
		'value-int':            valueInteger,
		'value-float':          valueNumber,
		'value-bool':           valueBoolean,
		'value-int-log':        valueIntLog,
		'value-float-log':      valueFloatLog,
		'value-float-pow-2':    valueFloatPow2,
		'value-float-pow-3':    valueFloatPow3
		//'value-number-invert':  valueNumberInvert,
		//'value-boolean-invert': valueBooleanInvert
	});
})(this);
