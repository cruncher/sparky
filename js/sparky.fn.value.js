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
	var stringToBoolInverted = Sparky.stringToBoolInverted;
	var stringOnToBoolInverted = Sparky.stringOnToBoolInverted;
	var definedToString = Sparky.definedToString;
	var intToString = Sparky.intToString;
	var floatToString = Sparky.floatToString;
	var boolToString = Sparky.boolToString;
	var boolToStringOn = Sparky.boolToStringOn;
	var boolToStringOnInverted = Sparky.boolToStringOnInverted;

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

	function valueBooleanInvert(node, model) {
		var type = node.type;
		var unbind = type === 'checkbox' && !isDefined(node.getAttribute('value')) ?
		    	Sparky.parseName(node, model, boolToStringOnInverted, stringOnToBoolInverted) :
		    	Sparky.parseName(node, model, boolToStringInverted, stringToBoolInverted);
		if (unbind) { this.on('destroy', unbind); }
	}

	function valueNumberInvert(node, model) {
		var min = node.min ? parseFloat(node.min) : (node.min = 0) ;
		var max = mode.max ? parseFloat(node.max) : (node.max = 1) ;

		bindName(this, node, function to(value) {
			return typeof value !== 'number' ? '' : ('' + ((max - value) + min));
		}, function from(value) {
			var n = parseFloat(value);
			return Number.isNaN(n) ? undefined : ((max - value) + min) ;
		});

		if (unbind) { this.on('destroy', unbind); }
	};


	assign(Sparky.fn, {
		'value-any':            valueAny,
		'value-string':         valueString,
		'value-int':            valueInteger,
		'value-float':          valueNumber,
		'value-bool':           valueBoolean,
		'value-number-invert':  valueNumberInvert,
		'value-boolean-invert': valueBooleanInvert
	});
})(this);
