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

	// Controllers

	function setup(sparky, node, scopes, to, from) {
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
		.on('destroy', function() {
			unbind();
			if (scope) { Sparky.unobservePath(scope, path, fn); }
		});

		return scopes.tap(function update(object) {
			if (scope) { Sparky.unobservePath(scope, path, fn); }
			scope = object;
			if (scope) { Sparky.observePath(scope, path, fn, true); }
		});
	}

	function valueAny(node, scopes) {
		// Coerce any defined value to string so that any values pass the type checker
		setup(this, node, scopes, definedToString, Fn.id);
	}

	function valueString(node, scopes) {
		// Don't coerce so that only strings pass the type checker
		setup(this, node, scopes, Fn.id, Fn.id);
	}

	function valueNumber(node, scopes) {
		setup(this, node, scopes, floatToString, stringToFloat);
	}

	function valueInteger(node, scopes) {
		setup(this, node, scopes, floatToString, stringToInt);
	}

	function valueBoolean(node, scopes) {
		if (node.type === 'checkbox' && !Fn.isDefined(node.getAttribute('value'))) {
			setup(this, node, scopes, boolToStringOn, stringOnToBool);
		}
		else {
			setup(this, node, scopes, boolToString, stringToBool);
		}
	}

	function valueInArray(node, scopes) {
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

		setup(this, node, scopes, to, from);
	}

	function valueIntInArray(node, scopes) {
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

		setup(this, node, scopes, to, Fn.compose(from, stringToInt));
	}

	function valueFloatPow2(node, scopes) {
		var normalise, denormalise;

		function updateMinMax() {
			var min = node.min ? parseFloat(node.min) : 0 ;
			var max = node.max ? parseFloat(node.max) : 1 ;
			normalise   = Fn.normalise(min, max);
			denormalise = Fn.denormalise(min, max);
		}

		function to(value) {
			if (typeof value !== 'number') { return ''; }
			updateMinMax();
			return denormalise(Math.pow(normalise(value), 1/2)) + '';
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			updateMinMax();
			return denormalise(Math.pow(normalise(n), 2));
		}

		setup(this, node, scopes, to, from);
	};

	function valueFloatPow3(node, scopes) {
		var normalise, denormalise;

		function updateMinMax() {
			var min = node.min ? parseFloat(node.min) : 0 ;
			var max = node.max ? parseFloat(node.max) : 1 ;
			normalise   = Fn.normalise(min, max);
			denormalise = Fn.denormalise(min, max);
		}

		function to(value) {
			if (typeof value !== 'number') { return ''; }
			updateMinMax();
			return denormalise(Math.pow(normalise(value), 1/3)) + '';
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			updateMinMax();
			return denormalise(Math.pow(normalise(n), 3));
		}

		setup(this, node, scopes, to, from);
	};

	function valueFloatLog(node, scopes) {
		var min, max, normalise, denormalise;

		function updateMinMax() {
			min = node.min ? parseFloat(node.min) : 1 ;
			max = node.max ? parseFloat(node.max) : 10 ;
			normalise   = Fn.normalise(min, max);
			denormalise = Fn.denormalise(min, max);

			if (min <= 0) {
				console.warn('Sparky.fn["value-float-log"] cannot accept a min attribute of 0 or lower.', node);
				return;
			}
		}

		function to(value) {
			if (typeof value !== 'number') { return ''; }
			updateMinMax();
			return denormalise(Math.log(value / min) / Math.log(max / min)) + '';
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			updateMinMax();
			return min * Math.pow(max / min, normalise(n));
		}

		setup(this, node, scopes, to, from);
	};

	function valueIntLog(node, scopes) {
		var min, max, normalise, denormalise;

		function updateMinMax() {
			min = node.min ? parseFloat(node.min) : 1 ;
			max = node.max ? parseFloat(node.max) : 10 ;
			normalise   = Fn.normalise(min, max);
			denormalise = Fn.denormalise(min, max);

			if (min <= 0) {
				console.warn('Sparky.fn["value-int-log"] cannot accept a min attribute of 0 or lower.', node);
				return;
			}
		}

		function to(value) {
			if (typeof value !== 'number') { return ''; }
			updateMinMax();
			return denormalise(Math.log(Math.round(value) / min) / Math.log(max / min)) + '';
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			updateMinMax();
			return Math.round(min * Math.pow(max / min, normalise(n)));
		}

		setup(this, node, scopes, to, from);
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
		'value-int-in-array':   valueIntInArray
	});
})(this);
