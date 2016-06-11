(function(window) {
	"use strict";

	var assign = Object.assign;
	var Fn     = window.Fn;
	var Sparky = window.Sparky;
	var parseName = Sparky.parseName;
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

		sparky
		.on('scope', function update(sparky, newscope) {
			// Ignore events not from this sparky
			// if (this !== sparky) { return; }
			if (scope) { Sparky.unobservePath(scope, path, fn); }
			scope = newscope;
			if (scope) { Sparky.observePath(scope, path, fn, true); }
		})
		.on('destroy', function() {
			unbind();
			if (scope) { Sparky.unobservePath(scope, path, fn); }
		});
	}

	function valueAny(node) {
		// Coerce any defined value to string so that any values pass the type checker
		setup(this, node, definedToString, Fn.id);
	}

	function valueString(node) {
		// Don't coerce so that only strings pass the type checker
		setup(this, node, Fn.id, Fn.id);
	}

	function valueNumber(node) {
		setup(this, node, floatToString, stringToFloat);
	}

	function valueInteger(node) {
		setup(this, node, floatToString, stringToInt);
	}

	function valueBoolean(node) {
		if (node.type === 'checkbox' && !Fn.isDefined(node.getAttribute('value'))) {
			setup(this, node, boolToStringOn, stringOnToBool);
		}
		else {
			setup(this, node, boolToString, stringToBool);
		}
	}

	function valueInArray(node) {
		var array;

		function to(arr) {
			if (arr === undefined) { return ''; }

			array = arr;
			var i = array.indexOf(node.value);

			return i > -1 ? node.value : '' ;
		}

		function from(value) {
			if (array === undefined) { array = Collection(); }

			if (value === undefined) {
				var i = array.indexOf(node.value);
				if (i !== -1) { array.splice(i, 1); }
			}
			else if (array.indexOf(value) === -1) {
				array.push(value);
			}

			return array;
		}

		setup(this, node, to, from);
	}

	function valueIntInArray(node) {
		var array;

		function to(arr) {
			if (arr === undefined) { return ''; }

			var value = stringToInt(node.value);
			array = arr;
			var i = array.indexOf(value);

			return i > -1 ? floatToString(value) : '' ;
		}

		function from(value) {
			if (array === undefined) { array = Collection(); }

			if (value === undefined) {
				var i = array.indexOf(stringToInt(node.value));
				if (i !== -1) { array.splice(i, 1); }
			}
			else if (array.indexOf(value) === -1) {
				array.push(value);
			}

			return array;
		}

		setup(this, node, to, Fn.compose(from, stringToInt));
	}

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
		'value-boolean':        valueBoolean,
		'value-int-log':        valueIntLog,
		'value-float-log':      valueFloatLog,
		'value-float-pow-2':    valueFloatPow2,
		'value-float-pow-3':    valueFloatPow3,
		'value-in-array':       valueInArray,
		'value-int-in-array':       valueIntInArray,
		//'value-number-invert':  valueNumberInvert,
		//'value-boolean-invert': valueBooleanInvert
	});
})(this);
