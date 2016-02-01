(function(window) {
	"use strict";

	var assign = Object.assign;
	var Sparky = window.Sparky;
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

	function valueAnyCtrl(node, model) {
		// Coerce any defined value to string so that any values pass the type checker
		var unbind = Sparky.parseName(node, model, definedToString, returnArg);
		if (unbind) { this.on('destroy', unbind); }
	}

	function valueStringCtrl(node, model) {
		// Don't coerce so that only strings pass the type checker
		var unbind = Sparky.parseName(node, model, returnArg, returnArg);
		if (unbind) { this.on('destroy', unbind); }
	}

	function valueNumberCtrl(node, model) {
		var unbind = Sparky.parseName(node, model, floatToString, stringToFloat);
		if (unbind) { this.on('destroy', unbind); }
	}

	function valueIntegerCtrl(node, model) {
		var unbind = Sparky.parseName(node, model, floatToString, stringToInt);
		if (unbind) { this.on('destroy', unbind); }
	}

	function valueBooleanCtrl(node, model) {
		var type = node.type;
		var unbind = type === 'checkbox' && !isDefined(node.getAttribute('value')) ?
		    	Sparky.parseName(node, model, boolToStringOn, stringOnToBool) :
		    	Sparky.parseName(node, model, boolToString, stringToBool) ;
		if (unbind) { this.on('destroy', unbind); }
	}

	function valueBooleanInvertCtrl(node, model) {
		var type = node.type;
		var unbind = type === 'checkbox' && !isDefined(node.getAttribute('value')) ?
		    	Sparky.parseName(node, model, boolToStringOnInverted, stringOnToBoolInverted) :
		    	Sparky.parseName(node, model, boolToStringInverted, stringToBoolInverted);
		if (unbind) { this.on('destroy', unbind); }
	}

	function valueNumberInvertCtrl(node, model) {
		var min = node.min ? parseFloat(node.min) : (node.min = 0) ;
		var max = mode.max ? parseFloat(node.max) : (node.max = 1) ;

		var unbind = Sparky.parseName(node, model, function to(value) {
			return typeof value !== 'number' ? '' : ('' + ((max - value) + min));
		}, function from(value) {
			var n = parseFloat(value);
			return Number.isNaN(n) ? undefined : ((max - value) + min) ;
		});

		if (unbind) { this.on('destroy', unbind); }
	};


	assign(Sparky.fn, {
		'value-any':            valueAnyCtrl,
		'value-string':         valueStringCtrl,
		'value-float':          valueNumberCtrl,
		'value-int':            valueIntegerCtrl,
		'value-bool':           valueBooleanCtrl,
		'value-number-invert':  valueNumberInvertCtrl,
		'value-boolean-invert': valueBooleanInvertCtrl
	});
})(this);
