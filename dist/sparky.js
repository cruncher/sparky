(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('Fn          - https://github.com/stephband/fn');
})(this);

(function(window) {
	"use strict";

	var DEBUG = window.DEBUG === true;


	// Import

	var A = Array.prototype;
	var N = Number.prototype;
	var O = Object.prototype;
	var S = String.prototype;
	var assign = Object.assign;


	// Define

	var nothing = Object.freeze(Object.defineProperties([], {
		shift: { value: noop }
	}));


	// Constant for converting radians to degrees
	var angleFactor = 180 / Math.PI;


	// Feature test

	var isFunctionLengthDefineable = (function() {
		var fn = function() {};

		try {
			// Can't do this on Safari - length non configurable :(
			Object.defineProperty(fn, 'length', { value: 2 });
		}
		catch(e) {
			return false;
		}

		return fn.length === 2;
	})();


	// Debug helpers

	function setFunctionProperties(text, parity, fn1, fn2) {
		// Make the string representation of fn2 display parameters of fn1
		fn2.toString = function() {
			return /function\s*[\w\d]*\s*\([,\w\d\s]*\)/.exec(fn1.toString()) + ' { [' + text + '] }';
		};

		// Where possible, define length so that curried functions show how
		// many arguments they are yet expecting
		if (isFunctionLengthDefineable) {
			Object.defineProperty(fn2, 'length', { value: parity });
		}

		return fn2;
	}

	function deprecate(fn, message) {
		// Recall any function and log a depreciation warning
		return function deprecate() {
			console.warn('Deprecation warning: ' + message);
			return fn.apply(this, arguments);
		};
	}

	function debug() {
		if (!window.console) { return fn; }

		var fn   = arguments[arguments.length - 1];
		var logs = A.slice.call(arguments, 0, arguments.length - 1);

		logs.push((fn.name || 'function') + '(');

		return function() {
			logs.push.apply(logs, arguments);
			logs.push(')');
			console.group.apply(console, logs);
			var value = fn.apply(this, arguments);
			console.groupEnd();
			console.log('⬅', value);
			return value;
		};
	}


	// Functional functions

	function noop() {}

	function id(object) { return object; }

	function self() { return this; }

	function call(value, fn) {
		return fn(value);
	}

	function bind(args, fn) {
		return function() {
			fn.apply(this, concat(arguments, args));
		};
	}

	function compose(fn2, fn1) {
		return function composed(n) {
			return fn2(fn1(n));
		};
	}

	function pipe() {
		var fns = arguments;
		return function pipe(value) {
			return A.reduce.call(fns, call, value);
		};
	}

	function cache(fn) {
		var map = new Map();

		return function cached(object) {
			if (arguments.length > 1) {
				throw new Error('Fn: Cached function called with ' + arguments.length + ' arguments. Accepts exactly 1.');
			}

			if (map.has(object)) {
				return map.get(object);
			}

			var value = fn(object);
			map.set(object, value);
			return value;
		};
	}

	function applyFn(fn, args) {
		return typeof fn === 'function' ? fn.apply(null, args) : fn ;
	}

	function curry(fn, muteable, arity) {
		arity = arity || fn.length;

		var memo = arity === 1 ?
			// Don't cache if `muteable` flag is true
			muteable ? fn : cache(fn) :

			// It's ok to always cache intermediate memos, though
			cache(function(object) {
				return curry(function() {
					var args = [object];
					args.push.apply(args, arguments);
					return fn.apply(null, args);
				}, muteable, arity - 1) ;
			}) ;

		return function partial(object) {
			return arguments.length === 1 ?
				memo(object) :
			arguments.length === arity ?
				fn.apply(null, arguments) :
			arguments.length > arity ?
				applyFn(fn.apply(null, A.splice.call(arguments, 0, arity)), arguments) :
			applyFn(memo(object), A.slice.call(arguments, 1)) ;
		};
	}

	function once(fn) {
		return function once() {
			var value = fn.apply(this, arguments);
			fn = noop;
			return value;
		};
	}

	function flip(fn) {
		return function(a, b) {
			return fn(b, a);
		};
	}

	function overload(fn, map) {
		return typeof map.get === 'function' ?
			function overload() {
				var key = fn.apply(null, arguments);
				return map.get(key).apply(this, arguments);
			} :
			function overload() {
				var key = fn.apply(null, arguments);
				return (map[key] || map.default).apply(this, arguments);
			} ;
	}

	function choose(map) {
		return function choose(key) {
			var fn = map[key] || map.default;
			return fn && fn.apply(this, rest(1, arguments)) ;
		};
	}

	if (DEBUG) {
		var _curry = curry;

		// Make curried functions log a pretty version of their partials
		curry = function curry(fn, muteable) {
			var arity  = arguments[2] || fn.length;

			return setFunctionProperties('curried', arity, fn, _curry(fn, muteable, arity));
		};
	}


	// Types

	var regex = {
		//         / (  (  (  (   http:         ) //  ) domain          /path   )(more /path  ) /   (path/      ) chars  )(hash or query string      )  /
		url:       /^(?:(?:(?:(?:[fht]{1,2}tps?:)?\/\/)?[-\w]+\.[-\w]+|\/[-\w.]+)(?:\/?[-\w.]+)*\/?|(?:[-\w.]+\/)+[-\w.]*)(?:[#?][#?!\[\]$\,;&=-\w.]*)?$/,
		email:     /^((([a-z]|\d|[!#$%&'*+\-\/=?^_`{|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#$%&'*+\-\/=?^_`{|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
		date:      /^\d{4}-(?:0[1-9]|1[012])-(?:0[1-9]|[12][0-9]|3[01])$/,
		hexColor:  /^(#)?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
		hslColor:  /^(?:(hsl)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?(\))?$/,
		rgbColor:  /^(?:(rgb)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?(\))?$/,
		hslaColor: /^(?:(hsla)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		rgbaColor: /^(?:(rgba)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		cssValue:  /^(-?\d+(?:\.\d+)?)(px|%|em|ex|pt|in|cm|mm|pt|pc)?$/,
		cssAngle:  /^(-?\d+(?:\.\d+)?)(deg)?$/,
		image:     /(?:\.png|\.gif|\.jpeg|\.jpg)$/,
		float:     /^[+-]?(?:\d*\.)?\d+$/,
		int:       /^(-?\d+)$/
	};

	function equals(a, b) {
		// Fast out if references are for the same object
		if (a === b) { return true; }

		// Or if objects are of different types
		if (typeof a !== 'object' || typeof b !== 'object') { return false; }

		var akeys = Object.keys(a);
		var bkeys = Object.keys(b);

		// Are their enumerable keys different?
		if (akeys.length !== bkeys.length) { return false; }

		var n = akeys.length;

		while (n--) {
			if (!equals(a[akeys[n]], b[akeys[n]])) {
				return false;
			}
		}

		return true;
	}

	var is = Object.is || function is(a, b) { return a === b; } ;

	function isDefined(value) {
		// !!value is a fast out for non-zero numbers, non-empty strings
		// and other objects, the rest checks for 0, '', etc.
		return !!value || (value !== undefined && value !== null && !Number.isNaN(value));
	}

	function isNot(a, b) { return a !== b; }

	function toType(object) {
		return typeof object;
	}

	function toClass(object) {
		return O.toString.apply(object).slice(8, -1);
	}

	function toArray(object) {
		if (object.toArray) { return object.toArray(); }

		// Speed test for array conversion:
		// https://jsperf.com/nodelist-to-array/27

		var array = [];
		var l = object.length;
		var i;

		if (typeof object.length !== 'number') { return array; }

		array.length = l;

		for (i = 0; i < l; i++) {
			array[i] = object[i];
		}

		return array;
	}

	function toInt(object) {
		return parseInt(object, 10);
	}

	function toString(object) {
		return object.toString();
	}


	// Arrays

	function sortedSplice(array, fn, value) {
		// Splices value into array at position determined by result of fn,
		// where result is either in the range [-1, 0, 1] or [true, false]
		var n = sortIndex(array, function(n) {
			return fn(value, n);
		});
		array.splice(n, 0, value);
	}

	function sortIndex(array, fn) {
		var l = array.length;
		var n = l + l % 2;
		var i = 0;

		while ((n = Math.floor(n / 2)) && (i + n <= l)) {
			if (fn(array[i + n - 1]) >= 0) {
				i += n;
				n += n % 2;
			}
		}

		return i;
	}

	//function sparseShift(array) {
	//	// Shift values ignoring undefined holes
	//	var value;
	//	while (array.length) {
	//		value = A.shift.apply(array);
	//		if (value !== undefined) { return value; }
	//	}
	//}

	function uniqueReducer(array, value) {
		if (array.indexOf(value) === -1) { array.push(value); }
		return array;
	}

	function arrayReducer(array, value) {
		array.push(value);
		return array;
	}

	//function whileArray(fn, array) {
	//	var values = [];
	//	var n = -1;
	//	while (++n < array.length && fn(array[n])) {
	//		values.push(object[n]);
	//	}
	//	return values;
	//}

	function byGreater(a, b) {
		return a === b ? 0 : a > b ? 1 : -1 ;
	}

	function concat(array2, array1) {
		// A.concat only works with arrays - it does not flatten array-like
		// objects. We need a robust concat that will glue any old thing
		// together.
		return Array.isArray(array1) ?
			// 1 is an array. Convert 2 to an array if necessary
			array1.concat(Array.isArray(array2) ? array2 : toArray(array2)) :

		array1.concat ?
			// It has it's own concat method. Lets assume it's robust
			array1.concat(array2) :
		// 1 is not an array, but 2 is
		toArray(array1).concat(Array.isArray(array2) ? array2 : toArray(array2)) ;
	}

	function contains(value, object) {
		return object.includes ?
			object.includes(value) :
		object.contains ?
			object.contains(value) :
		A.includes ?
			A.includes.call(object, value) :
			A.indexOf.call(object, value) !== -1 ;
	}

	var isIn = flip(contains);

	function map(fn, object) {
		return object.map ?
			object.map(fn) :
			A.map.call(object, fn) ;
	}

	function each(fn, object) {
		// A stricter version of .forEach, where the callback fn
		// gets a single argument and no context.
		var l, n;

		if (typeof object.each === 'function') {
			object.each(fn);
		}
		else {
			l = object.length;
			n = -1;
			while (++n < l) { fn(object[n]); }
		}

		return object;
	}

	function filter(fn, object) {
		return object.filter ?
			object.filter(fn) :
			A.filter.call(object, fn) ;
	}

	function last(array) {
		if (typeof array.length === 'number') {
			return array[array.length - 1];
		}

		// Todo: handle Fns and Streams
	}

	function reduce(fn, seed, object) {
		return object.reduce ?
			object.reduce(fn, seed) :
			A.reduce.call(object, fn, seed);
	}

	function rest(i, object) {
		if (object.slice) { return object.slice(i); }
		if (object.rest)  { return object.rest(i); }

		var a = [];
		var n = object.length - i;
		while (n--) { a[n] = object[n + i]; }
		return a;
	}

	function take(i, object) {
		if (object.slice) { return object.slice(0, i); }
		if (object.take)  { return object.take(i); }

		var a = [];
		var n = i;
		while (n--) { a[n] = object[n]; }
		return a;
	}

	function find(fn, object) {
		return A.find.call(object, fn);
	}

	function insert(fn, array, object) {
		var n = -1;
		var l = array.length;
		var value = fn(object);
		while(++n < l && fn(array[n]) <= value);
		array.splice(n, 0, object);
	}

	function remove(array, value) {
		if (array.remove) { array.remove(value); }
		var i = array.indexOf(value);
		if (i !== -1) { array.splice(i, 1); }
	}

	function split(fn, object) {
		if (object.split && typeof object !== 'string') { return object.split(fn); }

		var array = [];
		var n     = -1;
		var value;

		while((value = object[++n]) !== undefined) {
			if (fn(value) || n === 0) { array.push([value]); }
			else { array[array.length].push(value); }
		}

		return array;
	}

	function diff(array, object) {
		var values = toArray(array);

		return filter(function(value) {
			var i = values.indexOf(value);
			if (i === -1) { return true; }
			values.splice(i, 1);
			return false;
		}, object)
		.concat(values);
	}

	function intersect(array, object) {
		var values = toArray(array);

		return filter(function(value) {
			var i = values.indexOf(value);
			if (i === -1) { return false; }
			values.splice(i, 1);
			return true;
		}, object);
	}

	function unite(array, object) {
		var values = toArray(array);

		return map(function(value) {
			var i = values.indexOf(value);
			if (i > -1) { values.splice(i, 1); }
			return value;
		}, object)
		.concat(values);
	}

	function unique(object) {
		return object.unique ?
			object.unique() :
			reduce(uniqueReducer, [], object) ;
	}

	function sort(fn, object) {
		return object.sort ? object.sort(fn) : A.sort.call(object, fn);
	}


	// Objects

	var rpath  = /\[?([-\w]+)(?:=(['"])?([-\w]+)\2)?\]?\.?/g;

	function get(key, object) {
		// Todo? Support WeakMaps and Maps and other map-like objects with a
		// get method - but not by detecting the get method
		return object[key] === null ?
			undefined :
			object[key] ;
	}

	function set(key, object, value) {
		return typeof object.set === "function" ?
			object.set(key, value) :
			(object[key] = value) ;
	}

	function findByProperty(key, value, array) {
		var l = array.length;
		var n = -1;

		while (++n < l) {
			if (array[n][key] === value) {
				return array[n];
			}
		}
	}

	function getRegexPathThing(regex, path, object, fn) {
		var tokens = regex.exec(path);

		if (!tokens) {
			throw new Error('Fn.getPath(path, object): invalid path "' + path + '"');
		}

		var key      = tokens[1];
		var property = tokens[3] ?
			findByProperty(key, tokens[2] ?
				tokens[3] :
				parseFloat(tokens[3]),
			object) :
			object[key] ;

		return fn(regex, path, property);
	}

	function getRegexPath(regex, path, object) {
		return regex.lastIndex === path.length ?
			object :
		!(object && typeof object === 'object') ?
			undefined :
		getRegexPathThing(regex, path, object, getRegexPath) ;
	}

	function setRegexPath(regex, path, object, thing) {
		var tokens = regex.exec(path);

		if (!tokens) {
			throw new Error('Fn.getPath(path, object): invalid path "' + path + '"');
		}

		var key = tokens[1];

		if (regex.lastIndex === path.length) {
			// Cannot set to [prop=value] selector
			if (tokens[3]) {
				throw new Error('Fn.setPath(path, object): invalid path "' + path + '"');
			}

			return object[key] = thing;
		}

		var value = tokens[3] ?
			findByProperty(key, tokens[2] ?
				tokens[3] :
				parseFloat(tokens[3]), object
			) :
			object[key] ;

		if (!(value && typeof value === 'object')) {
			value = {};

			if (tokens[3]) {
				if (object.push) {
					value[key] = tokens[2] ?
						tokens[3] :
						parseFloat(tokens[3]) ;

					object.push(value);
				}
				else {
					throw new Error('Not supported');
				}
			}

			set(key, object, value);
		}

		return setRegexPath(regex, path, value, thing);
	}

	function getPath(path, object) {
		rpath.lastIndex = 0;
		return getRegexPath(rpath, path, object) ;
	}

	function setPath(path, object, value) {
		rpath.lastIndex = 0;
		return setRegexPath(rpath, path, object, value);
	}


	// Strings

	function prepend(string1, string2) {
		return string1 + string2;
	}

	function append(string1, string2) {
		return string2 + string1;
	}

	function prepad(chars, n, string) {
		var i = -1;
		var pre = '';

		while (pre.length < n - string.length) {
			pre += chars[++i % chars.length];
		}

		string = pre + string;
		return string.slice(string.length - n);
	}

	function postpad(chars, n, string) {
		while (string.length < n) {
			string = string + chars;
		}

		return string.slice(0, n);
	}


	// Numbers

	function gcd(a, b) {
		// Greatest common divider
		return b ? gcd(b, a % b) : a ;
	}

	function lcm(a, b) {
		// Lowest common multiple.
		return a * b / gcd(a, b);
	}

	function sampleCubicBezier(a, b, c, t) {
		// `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
		return ((a * t + b) * t + c) * t;
	}

	function sampleCubicBezierDerivative(a, b, c, t) {
		return (3 * a * t + 2 * b) * t + c;
	}

	function solveCubicBezierX(a, b, c, x, epsilon) {
		// Solve x for a cubic bezier
		var x2, d2, i;
		var t2 = x;

		// First try a few iterations of Newton's method -- normally very fast.
		for(i = 0; i < 8; i++) {
			x2 = sampleCubicBezier(a, b, c, t2) - x;
			if (Math.abs(x2) < epsilon) {
				return t2;
			}
			d2 = sampleCubicBezierDerivative(a, b, c, t2);
			if (Math.abs(d2) < 1e-6) {
				break;
			}
			t2 = t2 - x2 / d2;
		}

		// Fall back to the bisection method for reliability.
		var t0 = 0;
		var t1 = 1;

		t2 = x;

		if(t2 < t0) { return t0; }
		if(t2 > t1) { return t1; }

		while(t0 < t1) {
			x2 = sampleCubicBezier(a, b, c, t2);
			if(Math.abs(x2 - x) < epsilon) {
				return t2;
			}
			if (x > x2) { t0 = t2; }
			else { t1 = t2; }
			t2 = (t1 - t0) * 0.5 + t0;
		}

		// Failure.
		return t2;
	}


	// Time

	var now = window.performance && window.performance.now ? function now() {
		// Return time in seconds
		return window.performance.now() / 1000;
	} : function now() {
		// Return time in seconds
		return +new Date() / 1000;
	} ;

	var requestFrame = window.requestAnimationFrame;

	var resolved = Promise.resolve();

	function requestTick(fn) {
		resolved.then(fn);
		return true;
	}


	// Timer
	//
	// Create an object with a request/cancel pair of functions that
	// fire request(fn) callbacks at a given duration.
	//
	// .request()
	// .cancel()
	// .now()

	function Timer(duration, getTime) {
		if (typeof duration !== 'number') { throw new Error('Timer(duration) requires a duration in seconds (' + duration + ')'); }

		// Optional second argument is a function that returns
		// current time (in seconds)
		getTime = getTime || now;

		var fns = [];
		var id;
		var t0  = -Infinity;

		function frame() {
			var n = fns.length;

			id = undefined;
			t0 = getTime();

			while (n--) {
				fns.shift()(t0);
			}
		}

		return {
			now: getTime,

			request: function(fn) {
				if (typeof fn !== 'function') { throw new Error('fn is not a function.'); }

				// Add fn to queue
				fns.push(fn);

				// If the timer is cued do nothing
				if (id) { return; }

				var t1 = getTime();

				// Set the timer and return something truthy
				if (t0 + duration > t1) {
					id = setTimeout(frame, (t0 + duration - t1) * 1000);
				}
				else {
					requestTick(frame) ;
				}

				// Use the fn reference as the request id, because why not
				return fn;
			},

			cancel: function(fn) {
				var i = fns.indexOf(fn);
				if (i === -1) { return; }

				fns.splice(i, 1);

				if (!fns.length) {
					clearTimeout(id);
					id = undefined;
				}
			}
		};
	}


	// Throttle
	//
	// Returns a function that calls `fn` once on the next timer frame, using
	// the context and arguments from the latest invocation.

	function Throttle(fn, request, cancel) {
		request = request || window.requestAnimationFrame;
		cancel  = cancel  || window.cancelAnimationFrame;

		var queue = schedule;
		var context, args, id;

		function schedule() {
			queue = noop;
			id = request(update);
		}

		function update() {
			queue = schedule;
			fn.apply(context, args);
		}

		function stop(callLast) {
			// If there is an update queued apply it now
			//if (callLast !== false && queue === noop) { update(); }

			// An update is queued
			if (queue === noop && id !== undefined) {
				cancel(id);
			}

			// Don't permit further changes to be queued
			queue = noop;
		}

		function throttle() {
			// Store the latest context and arguments
			context = this;
			args    = arguments;

			// Queue the update
			queue();
		}

		throttle.cancel = stop;
		return throttle;
	}


	// Wait
	//
	// Returns a function that waits for `time` seconds without being invoked
	// before calling `fn` using the context and arguments from the latest
	// invocation

	function Wait(fn, time) {
		var timer, context, args;
		var cue = function cue() {
			if (timer) { clearTimeout(timer); }
			timer = setTimeout(update, (time || 0) * 1000);
		};

		function update() {
			timer = false;
			fn.apply(context, args);
		}

		function cancel() {
			// Don't permit further changes to be queued
			cue = noop;

			// If there is an update queued apply it now
			if (timer) { clearTimeout(timer); }
		}

		function wait() {
			// Store the latest context and arguments
			context = this;
			args = arguments;

			// Cue the update
			cue();
		}

		wait.cancel = cancel;
		return wait;
	}


	// Fn

	function isDone(source) {
		return source.length === 0 || source.status === 'done' ;
	}

	function latest(source) {
		var value = source.shift();
		return value === undefined ? arguments[1] : latest(source, value) ;
	}

	function create(object, fn) {
		var functor = Object.create(object);
		functor.shift = fn;
		return functor;
	}

	function Fn(fn) {
		// Accept constructor without `new`
		if (!this || !Fn.prototype.isPrototypeOf(this)) {
			return new Fn(fn);
		}

		var source = this;

		if (!fn) {
			source.status = 'done';
			return;
		}

		var value = fn();

		if (value === undefined) {
			source.status = 'done';
			return;
		}

		this.shift = function shift() {
			if (source.status === 'done') { return; }

			var v = value;

			// Where the next value is undefined mark the functor as done
			value = fn();
			if (value === undefined) {
				source.status = 'done';
			}

			return v;
		};
	}

	assign(Fn.prototype, {
		shift: noop,

		// Input

		of: function() {
			// Delegate to the constructor's .of()
			return this.constructor.of.apply(this.constructor, arguments);
		},

		// Transform

		ap: function(object) {
			var shift = this.shift;

			return create(this, function ap() {
				var fn = shift();
				return fn === undefined ?
					undefined :
					object.map(fn) ;
			});
		},

		unshift: function() {
			// Create an unshift buffer, such that objects can be inserted
			// back into the stream at will with stream.unshift(object).
			var source = this;
			var buffer = toArray(arguments);

			return create(this, function() {
				return (buffer.length ? buffer : source).shift() ;
			});
		},

		catch: function(fn) {
			var source = this;

			return create(this, function() {
				try {
					return source.shift();
				}
				catch(e) {
					return fn(e);
				}
			});
		},

		chain: function(fn) {
			return this.map(fn).join();
		},

		clone: function() {
			var source  = this;
			var shift   = this.shift;
			var buffer1 = [];
			var buffer2 = [];
			var doneFlag = false;

			// Messy. But it works. Just.

			this.shift = function() {
				var value;

				if (buffer1.length) {
					value = buffer1.shift();

					if (!buffer1.length && doneFlag) {
						source.status = 'done';
					}

					return value;
				}

				if (!doneFlag) {
					value = shift();

					if (source.status === 'done') {
						doneFlag = true;
					}

					if (value !== undefined) {
						buffer2.push(value);
					}

					return value;
				}
			};

			var clone = new Fn(function shiftClone() {
				var value;

				if (buffer2.length) {
					return buffer2.shift();
					//if (!buffer2.length && doneFlag) {
					//	clone.status = 'done';
					//}
				}

				if (!doneFlag) {
					value = shift();

					if (source.status === 'done') {
						doneFlag = true;
						source.status = undefined;
					}

					if (value !== undefined) {
						buffer1.push(value);
					}

					return value;
				}
			});

			return clone;
		},

		concat: function() {
			var sources = toArray(arguments);
			var source  = this;

			var stream  = create(this, function concat() {
				if (source === undefined) {
					stream.status = 'done';
					return;
				}

				if (isDone(source)) {
					source = sources.shift();
					return concat();
				}

				var value = source.shift();

				stream.status = sources.length === 0 && isDone(source) ?
					'done' : undefined ;

				return value;
			});

			return stream;
		},

		dedup: function() {
			var v;
			return this.filter(function(value) {
				var old = v;
				v = value;
				return old !== value;
			});
		},

		filter: function(fn) {
			var source = this;

			return create(this, function filter() {
				var value;
				while ((value = source.shift()) !== undefined && !fn(value));
				return value;
			});
		},

		first: function() {
			var source = this;
			return create(this, once(function first() {
				source.status = 'done';
				return source.shift();
			}));
		},

		join: function() {
			var source = this;
			var buffer = nothing;

			return create(this, function join() {
				var value = buffer.shift();
				if (value !== undefined) { return value; }
				buffer = source.shift();
				if (buffer !== undefined) { return join(); }
				buffer = nothing;
			});
		},

		latest: function() {
			var source = this;
			return create(this, function shiftLast() {
				return latest(source);
			});
		},

		map: function(fn) {
			return create(this, compose(function map(object) {
				return object === undefined ? undefined : fn(object) ;
			}, this.shift));
		},

		chunk: function(n) {
			var source = this;
			var buffer = [];

			return create(this, n ?
				// If n is defined batch into arrays of length n.
				function shiftChunk() {
					var value, _buffer;

					while (buffer.length < n) {
						value = source.shift();
						if (value === undefined) { return; }
						buffer.push(value);
					}

					if (buffer.length >= n) {
						_buffer = buffer;
						buffer = [];
						return Fn.of.apply(Fn, _buffer);
					}
				} :

				// If n is undefined or 0, batch all values into an array.
				function shiftChunk() {
					buffer = source.toArray();
					// An empty array is equivalent to undefined
					return buffer.length ? buffer : undefined ;
				}
			);
		},

		fold: function(fn, seed) {
			var i = 0;
			return this
			.map(function fold(value) {
				seed = fn(seed, value, i++);
				return seed;
			})
			.unshift(seed);
		},

		partition: function(fn) {
			var source = this;
			var buffer = [];
			var streams = new Map();

			fn = fn || Fn.id;

			function createPart(key, value) {
				var stream = Stream.of().on('pull', shiftPull);
				stream.key = key;
				streams.set(key, stream);
				return stream;
			}

			function shiftPull(type, pullStream) {
				var value  = source.shift();
				if (value === undefined) { return; }

				var key    = fn(value);
				var stream = streams.get(key);

				if (stream === pullStream) { return value; }

				if (stream === undefined) {
					stream = createPart(key, value);
					buffer.push(stream);
				}

				stream.push(value);
				return shiftPull(type, pullStream);
			}

			return create(this, function shiftStream() {
				if (buffer.length) { return buffer.shift(); }

				var value = source.shift();
				if (value === undefined) { return; }

				var key    = fn(value);
				var stream = streams.get(key);

				if (stream === undefined) {
					stream = createPart(key, value);
					stream.push(value);
					return stream;
				}

				stream.push(value);
				return shiftStream();
			});
		},

		reduce: function reduce(fn, seed) {
			return this.fold(fn, seed).latest().shift();
		},

		take: function(n) {
			var source = this;
			var i = 0;

			return create(this, function take() {
				var value;

				if (i < n) {
					value = source.shift();
					// Only increment i where an actual value has been shifted
					if (value === undefined) { return; }
					if (++i === n) { source.status = 'done'; }
					return value;
				}
			});
		},

		sort: function(fn) {
			fn = fn || Fn.byGreater ;

			var source = this;
			var buffer = [];

			return create(this, function sort() {
				var value;

				while((value = source.shift()) !== undefined) {
					sortedSplice(buffer, fn, value);
				}

				return buffer.shift();
			});
		},

		split: function(fn) {
			var source = this;
			var buffer = [];

			return create(this, function split() {
				var value = source.shift();
				var temp;

				if (value === undefined) {
					if (buffer.length) {
						temp = buffer;
						buffer = [];
						return temp;
					}

					return;
				}

				if (fn(value)) {
					temp = buffer;
					buffer = [value];
					return temp.length ? temp : split() ;
				}

				buffer.push(value);
				return split();
			});
		},

		syphon: function(fn) {
			var shift   = this.shift;
			var buffer1 = [];
			var buffer2 = [];

			this.shift = function() {
				if (buffer1.length) { return buffer1.shift(); }

				var value;

				while ((value = shift()) !== undefined && fn(value)) {
					buffer2.push(value);
				}

				return value;
			};

			return create(this, function filter() {
				if (buffer2.length) { return buffer2.shift(); }

				var value;

				while ((value = shift()) !== undefined && !fn(value)) {
					buffer1.push(value);
				}

				return value;
			});
		},

		rest: function(i) {
			var source = this;

			return create(this, function rest() {
				while (i-- > 0) { source.shift(); }
				return source.shift();
			});
		},

		unique: function() {
			var source = this;
			var values = [];

			return create(this, function unique() {
				var value = source.shift();

				return value === undefined ? undefined :
					values.indexOf(value) === -1 ? (values.push(value), value) :
					unique() ;
			});
		},

		// Consumers

		each: function(fn) {
			var value;

			while ((value = this.shift()) !== undefined) {
				fn.call(this, value);
			}

			return this;
		},

		find: function(fn) {
			return this
			.filter(fn)
			.first()
			.shift();
		},

		next: function() {
			return {
				value: this.shift(),
				done:  this.status
			};
		},

		pipe: function(stream) {
			// Target must be evented
			if (!stream || !stream.on) {
				throw new Error('Fn: Fn.pipe(object) object must be a stream. (' + stream + ')');
			}

			return stream.on('pull', this.shift);
		},

		tap: function(fn) {
			// Overwrite shift to copy values to tap fn
			this.shift = Fn.compose(function(value) {
				if (value !== undefined) { fn(value); }
				return value;
			}, this.shift);

			return this;
		},

		toJSON: function() {
			return this.reduce(arrayReducer, []);
		},

		toString: function() {
			return this.reduce(prepend, '');
		},


		// Deprecated

		process: deprecate(function(fn) {
			return fn(this);
		}, '.process() is deprecated'),

		last: deprecate(function() {
			var source = this;
			return create(this, function shiftLast() {
				return latest(source);
			});
		}, '.last() is now .latest()'),
	});

	Fn.prototype.toArray = Fn.prototype.toJSON;

	// Todo: As of Nov 2016 fantasy land spec requires namespaced methods:
	//
	// equals: 'fantasy-land/equals',
	// lte: 'fantasy-land/lte',
	// concat: 'fantasy-land/concat',
	// empty: 'fantasy-land/empty',
	// map: 'fantasy-land/map',
	// contramap: 'fantasy-land/contramap',
	// ap: 'fantasy-land/ap',
	// of: 'fantasy-land/of',
	// alt: 'fantasy-land/alt',
	// zero: 'fantasy-land/zero',
	// reduce: 'fantasy-land/reduce',
	// traverse: 'fantasy-land/traverse',
	// chain: 'fantasy-land/chain',
	// chainRec: 'fantasy-land/chainRec',
	// extend: 'fantasy-land/extend',
	// extract: 'fantasy-land/extract',
	// bimap: 'fantasy-land/bimap',
	// promap: 'fantasy-land/promap'


	if (window.Symbol) {
		// A functor is it's own iterator
		Fn.prototype[Symbol.iterator] = function() {
			return this;
		};
	}


	// Export

	window.Fn = assign(Fn, {

		// Constructors

		of: function() { return Fn.from(arguments); },

		from: function(object) {
			// object is an object with a shift function
			if (typeof object.shift === "function" && object.length === undefined) {
				return new Fn(function shiftObject() {
					return object.shift();
				});
			}

			// object is an iterator
			if (typeof object.next === "function") {
				return new Fn(function shiftIterator() {
					var result = object.next();

					// Ignore undefined holes in iterator results
					return result.done ?
						result.value :
					result.value === undefined ?
						shiftIterator() :
						result.value ;
				});
			}

			// object is an array or array-like object. Iterate over it without
			// mutating it.
			var i = -1;

			return new Fn(function shiftArray() {
				// Ignore undefined holes in arrays
				return ++i >= object.length ?
					undefined :
				object[i] === undefined ?
					shiftArray() :
					object[i] ;
			});
		},

		Timer:    Timer,


		// Objects

		nothing:  nothing,


		// Functions

		id:       id,
		noop:     noop,
		self:     self,

		cache:    cache,
		compose:  compose,
		curry:    curry,
		choose:   choose,
		flip:     flip,
		once:     once,
		overload: curry(overload),
		pipe:     pipe,
		throttle: Throttle,
		wait:     Wait,


		// Logic

		equals:    curry(equals),
		is:        curry(is),
		isDefined: isDefined,
		isIn:      curry(isIn, true),
		isNot:     curry(isNot),

		and: curry(function and(a, b) { return !!(a && b); }),

		not: function not(a) { return !a; },

		or: curry(function or(a, b) { return a || b; }),

		xor: curry(function or(a, b) { return (a || b) && (!!a !== !!b); }),

		isGreater: curry(function byGreater(a, b) { return b > a ; }),

		by: curry(function by(property, a, b) {
			return byGreater(a[property], b[property]);
		}, true),

		byGreater: curry(byGreater),

		byAlphabet: curry(function byAlphabet(a, b) {
			return S.localeCompare.call(a, b);
		}),


		// Types

		toType:    toType,
		toClass:   toClass,
		toArray:   toArray,
		toString:  toString,
		toInt:     toInt,
		toFloat:   parseFloat,

		toPlainText: function toPlainText(string) {
			return string
			// Decompose string to normalized version
			.normalize('NFD')
			// Remove accents
			.replace(/[\u0300-\u036f]/g, '');
		},

		toStringType: (function(regex, types) {
			return function toStringType(string) {
				// Determine the type of string from its content.
				var n = types.length;

				// Test regexable string types
				while (n--) {
					if(regex[types[n]].test(string)) {
						return types[n];
					}
				}

				// Test for JSON
				try {
					JSON.parse(string);
					return 'json';
				}
				catch(e) {}

				// Default to 'string'
				return 'string';
			};
		})(regex, ['url', 'date', 'email', 'float', 'int']),


		// Collections

		concat:    curry(concat, true),
		contains:  curry(contains, true),
		diff:      curry(diff, true),
		each:      curry(each, true),
		filter:    curry(filter, true),
		find:      curry(find, true),
		insert:    curry(insert, true),
		intersect: curry(intersect, true),
		last:      last,
		latest:    latest,
		map:       curry(map, true),
		reduce:    curry(reduce, true),
		remove:    curry(remove, true),
		rest:      curry(rest, true),
		sort:      curry(sort, true),
		split:     curry(split, true),
		take:      curry(take, true),
		unite:     curry(unite, true),
		unique:    unique,


		// Objects

		assign:    curry(assign, true, 2),
		get:       curry(get, true),
		set:       curry(set, true),
		getPath:   curry(getPath, true),
		setPath:   curry(setPath, true),

		invoke: curry(function invoke(name, values, object) {
			return object[name].apply(object, values);
		}, true),


		// Numbers

		add:      curry(function add(a, b) { return b + a; }),
		multiply: curry(function mul(a, b) { return b * a; }),
		mod:      curry(function mod(a, b) { return b % a; }),
		min:      curry(function min(a, b) { return a > b ? b : a ; }),
		max:      curry(function max(a, b) { return a < b ? b : a ; }),
		pow:      curry(function pow(n, x) { return Math.pow(x, n); }),
		exp:      curry(function exp(n, x) { return Math.pow(n, x); }),
		log:      curry(function log(n, x) { return Math.log(x) / Math.log(n); }),
		root:     curry(function nthRoot(n, x) { return Math.pow(x, 1/n); }),
		gcd:      curry(gcd),
		lcm:      curry(lcm),
		todB:     function todB(n) { return 20 * Math.log10(n); },
		toLevel:  function toLevel(n) { return Math.pow(2, n/6); },
		toRad:    function toRad(n) { return n / angleFactor; },
		toDeg:    function toDeg(n) { return n * angleFactor; },

		factorise: function factorise(n, d) {
			// Reduce a fraction by finding the Greatest Common Divisor and
			// dividing by it.
			var f = gcd(n, d);
			return [n/f, d/f];
		},

		gaussian: function gaussian() {
			// Returns a random number with a bell curve probability centred
			// around 0 and limits -1 to 1.
			return Math.random() + Math.random() - 1;
		},

		toPolar: function toPolar(cartesian) {
			var x = cartesian[0];
			var y = cartesian[1];

			return [
				// Distance
				x === 0 ?
					Math.abs(y) :
				y === 0 ?
					Math.abs(x) :
					Math.sqrt(x*x + y*y) ,
				// Angle
				Math.atan2(x, y)
			];
		},

		toCartesian: function toCartesian(polar) {
			var d = polar[0];
			var a = polar[1];

			return [
				Math.sin(a) * d ,
				Math.cos(a) * d
			];
		},

		toFixed:  curry(function toFixed(n, value) { return N.toFixed.call(value, n); }),

		limit:    curry(function limit(min, max, n) { return n > max ? max : n < min ? min : n ; }),

		wrap:     curry(function wrap(min, max, n) { return (n < min ? max : min) + (n - min) % (max - min); }),

		normalise:   curry(function normalise(min, max, n) { return (n - min) / (max - min); }),

		denormalise: curry(function denormalise(min, max, n) { return n * (max - min) + min; }),

		rangeLog:    curry(function rangeLog(min, max, n) {
			return Fn.denormalise(min, max, Math.log(n / min) / Math.log(max / min));
		}),

		rangeLogInv: curry(function rangeLogInv(min, max, n) {
			return min * Math.pow(max / min, Fn.normalise(min, max, n));
		}),


		// Cubic bezier function (originally translated from
		// webkit source by Christian Effenberger):
		// http://www.netzgesta.de/dev/cubic-bezier-timing-function.html

		cubicBezier: curry(function cubicBezier(p1, p2, duration, x) {
			// The epsilon value to pass given that the animation is going
			// to run over duruation seconds. The longer the animation, the
			// more precision is needed in the timing function result to
			// avoid ugly discontinuities.
			var epsilon = 1 / (200 * duration);

			// Calculate the polynomial coefficients. Implicit first and last
			// control points are (0,0) and (1,1).
			var cx = 3 * p1[0];
			var bx = 3 * (p2[0] - p1[0]) - cx;
			var ax = 1 - cx - bx;
			var cy = 3 * p1[1];
			var by = 3 * (p2[1] - p1[1]) - cy;
			var ay = 1 - cy - by;

			var y = solveCubicBezierX(ax, bx, cx, x, epsilon);
			return sampleCubicBezier(ay, by, cy, y);
		}),

		// Exponential functions
		//
		// e - exponent
		// x - range 0-1
		//
		// eg.
		// var easeInQuad   = exponential(2);
		// var easeOutCubic = exponentialOut(3);
		// var easeOutQuart = exponentialOut(4);

		exponentialOut: curry(function exponentialOut(e, x) {
			return 1 - Math.pow(1 - x, e);
		}),

		// Strings

		append:      curry(append),
		prepend:     curry(prepend),
		postpad:     curry(postpad),
		prepad:      curry(prepad),
		match:       curry(function match(regex, string) { return regex.test(string); }),
		exec:        curry(function parse(regex, string) { return regex.exec(string) || undefined; }),
		replace:     curry(function replace(regex, fn, string) { return string.replace(regex, fn); }),

		slugify: function slugify(string) {
			if (typeof string !== 'string') { return; }
			return string.trim().toLowerCase().replace(/[\W_]/g, '-');
		},


		// Regexp

		rspaces: /\s+/,


		// Time

		now:          now,
		requestTick:  requestTick,
		requestFrame: requestFrame,


		// Debugging

		debug:        debug,
		deprecate:    deprecate,


		// Deprecated

		bind:     deprecate(bind, 'Review bind: it doesnt do what you think'),
		dB:       deprecate(noop, 'dB() is now todB()'),
		degToRad: deprecate(noop, 'degToRad() is now toRad()'),
		radToDeg: deprecate(noop, 'radToDeg() is now toDeg()'),

		nthRoot:  curry(
			deprecate(function nthRoot(n, x) { return Math.pow(x, 1/n); },
			'nthRoot(n, x) is now simply root(n, x)'), false, 2),

		Throttle: deprecate(Throttle, 'Throttle(fn, time) removed, is now throttle(fn, time)'),
		Wait: deprecate(Wait, 'Wait(fn, time) removed, is now wait(fn, time)'),

		slice: curry(deprecate(function slice(n, m, object) {
			return object.slice ? object.slice(n, m) : A.slice.call(object, n, m);
		}, 'slice(n, m, object) is removed in favour of take(n) or rest(n)'), true, 3),

		returnThis: deprecate(self, 'returnThis() is now self()'),

		run: curry(deprecate(function apply(values, fn) {
			return fn.apply(null, values);
		}, 'run() is now apply()'), true, 2),

		overloadLength: curry(deprecate(overload, 'overloadLength(map) is now overload(fn, map)'), true, 2)(function() {
			return arguments.length;
		}),

		overloadTypes: curry(deprecate(overload, 'overloadTypes(map) is now overload(fn, map)'), true, 2)(function() {
			return A.map.call(arguments, toType).join(' ');
		})
	});

	Object.defineProperties(Fn, {
		empty: {
			get: deprecate(
				function() { return nothing; },
				'Fn.empty is now Fn.nothing'
			)
		}
	});
})(this);
(function(window) {
	"use strict";

	var debug     = false;


	// Import

	var Fn        = window.Fn;
	var A         = Array.prototype;

	var assign    = Object.assign;
	var curry     = Fn.curry;
	var each      = Fn.each;
	var latest    = Fn.latest;
	var noop      = Fn.noop;
	var now       = Fn.now;
	var nothing   = Fn.nothing;
	var rest      = Fn.rest;
	var throttle  = Fn.throttle;
	var Timer     = Fn.Timer;
	var toArray   = Fn.toArray;


	// Functions

	function call(value, fn) {
		return fn(value);
	}

	function apply(values, fn) {
		return fn.apply(null, values);
	}

	function isValue(n) { return n !== undefined; }

	function isDone(stream) {
		return stream.status === 'done';
	}

	function checkSource(source) {
		// Check for .shift()
		if (!source.shift) {
			throw new Error('Stream: Source must create an object with .shift() ' + Source);
		}
	}


	// Events

	var $events = Symbol('events');

	function notify(type, object) {
		var events = object[$events];

		if (!events) { return; }
		if (!events[type]) { return; }

		var n = -1;
		var l = events[type].length;
		var value;

		while (++n < l) {
			value = events[type][n](type, object);
			if (value !== undefined) {
				return value;
			}
		}
	}

	function createNotify(stream) {
		var _notify = notify;

		return function trigger(type) {
			// Prevent nested events, so a 'push' event triggered while
			// the stream is 'pull'ing will do nothing. A bit of a fudge.
			var notify = _notify;
			_notify = noop;
			var value = notify(type, stream);
			_notify = notify;
			return value;
		};
	}


	// Sources
	//
	// Sources that represent stopping and stopped states of a stream

	var doneSource = {
		shift: noop,
		push:  noop,
		start: noop,
		stop:  noop
	};

	function StopSource(source, n, done) {
		this.source = source;
		this.n      = n;
		this.done   = done;
	}

	assign(StopSource.prototype, doneSource, {
		shift: function() {
			if (--this.n < 1) { this.done(); }
			return this.source.shift();
		}
	});


	// Stream

	function Stream(Source, options) {
		// Enable construction without the `new` keyword
		if (!Stream.prototype.isPrototypeOf(this)) {
			return new Stream(Source, options);
		}

		var stream  = this;
		var getSource;

		var promise = new Promise(function(resolve, reject) {
			var source;

			function done() {
				stream.status = 'done';
				source = doneSource;
			}

			function stop(n, value) {
				// Neuter events and schedule shutdown of the stream
				// after n values
				delete stream[$events];

				if (n) { source = new StopSource(source, n, done); }
				else { done(); }

				// Note that we cannot resolve with stream because Chrome sees
				// it as a promise (resolving with promises is special)
				resolve(value);
			}

			getSource = function() {
				var notify = createNotify(stream);
				source = new Source(notify, stop, options);

				// Check for sanity
				if (debug) { checkSource(source); }

				// Gaurantee that source has a .stop() method
				if (!source.stop) { source.stop = noop; }

				getSource = function() { return source; };

				return source;
			};
		});

		// Properties and methods

		this[$events] = {};

		this.push = function push() {
			var source = getSource();
			source.push.apply(source, arguments);
			return stream;
		};

		this.shift = function shift() {
			return getSource().shift();
		};

		this.start = function start() {
			var source = getSource();
			source.start.apply(source, arguments);
			return stream;
		};

		this.stop = function stop() {
			var source = getSource();
			source.stop.apply(source, arguments);
			return stream;
		};

		this.then = promise.then.bind(promise);
	}


	// Stream Constructors

	function BufferSource(notify, stop, buffer) {
		this._buffer = buffer;
		this._notify = notify;
		this._stop   = stop;
	}

	assign(BufferSource.prototype, {
		shift: function() {
			var buffer = this._buffer;
			var notify = this._notify;
			return buffer.length ? buffer.shift() : notify('pull') ;
		},

		push: function() {
			var buffer = this._buffer;
			var notify = this._notify;
			buffer.push.apply(buffer, arguments);
			notify('push');
		},

		stop: function() {
			var buffer = this._buffer;
			this._stop(buffer.length);
		}
	});

	Stream.from = function(source) {
		return new Stream(function setup(notify, stop) {
			var buffer = source === undefined ? [] :
				Fn.prototype.isPrototypeOf(source) ? source :
				Array.from(source).filter(isValue) ;

			return new BufferSource(notify, stop, buffer);
		});
	};

	Stream.of = function() { return Stream.from(arguments); };


	// Stream.Combine

	function toValue(data) {
		var source = data.source;
		var value  = data.value;
		return data.value = value === undefined ? latest(source) : value ;
	}

	function CombineSource(notify, stop, fn, sources) {
		var object = this;

		this._notify  = notify;
		this._stop    = stop;
		this._fn      = fn;
		this._sources = sources;
		this._hot     = true;

		this._store = sources.map(function(source) {
			var data = {
				source: source,
				listen: listen
			};

			// Listen for incoming values and flag as hot
			function listen() {
				data.value = undefined;
				object._hot = true;
			}

			source.on('push', listen)
			source.on('push', notify);
			return data;
		});
	}

	assign(CombineSource.prototype, {
		shift: function combine() {
			// Prevent duplicate values going out the door
			if (!this._hot) { return; }
			this._hot = false;

			var sources = this._sources;
			var values  = this._store.map(toValue);
			if (sources.every(isDone)) { this._stop(0); }
			return values.every(isValue) && this._fn.apply(null, values) ;
		},

		stop: function stop() {
			var notify = this._notify;

			// Remove listeners
			each(function(data) {
				var source = data.source;
				var listen = data.listen;
				source.off('push', listen);
				source.off('push', notify);
			}, this._store);

			this._stop(this._hot ? 1 : 0);
		}
	});

	Stream.Combine = function(fn) {
		var sources = A.slice.call(arguments, 1);

		if (sources.length < 2) {
			throw new Error('Stream: Combine requires more than ' + sources.length + ' source streams')
		}

		return new Stream(function setup(notify, stop) {
			return new CombineSource(notify, stop, fn, sources);
		});
	};


	// Stream.Merge

	function MergeSource(notify, stop, sources) {
		var values = [];
		var buffer = [];

		function update(type, source) {
			buffer.push(source);
		}

		this._notify  = notify;
		this._stop    = stop;
		this._sources = sources;
		this._values  = values;
		this._buffer  = buffer;
		this._i       = 0;
		this._update  = update;

		each(function(source) {
			// Flush the source
			values.push.apply(values, toArray(source));

			// Listen for incoming values
			source.on('push', update);
			source.on('push', notify);
		}, sources);
	}

	assign(MergeSource.prototype, {
		shift: function() {
			var sources = this._sources;
			var values  = this._values;
			var buffer  = this._buffer;
			var stop    = this._stop;

			if (values.length) { return values.shift(); }
			var stream = buffer.shift();
			if (!stream) { return; }
			var value = stream.shift();
			// When all the sources are empty, stop
			if (stream.status === 'done' && ++this._i >= sources.length) { stop(0); }
			return value;
		},

		stop: function() {
			var notify  = this._notify;
			var sources = this._sources;
			var stop    = this._stop;
			var update  = this._update;

			// Remove listeners
			each(function(source) {
				source.off('push', update);
				source.off('push', notify);
			}, sources);

			stop(values.length + buffer.length);
		}
	});

	Stream.Merge = function(source1, source2) {
		var args = arguments;

		return new Stream(function setup(notify, stop) {
			return new MergeSource(notify, stop, Array.from(args));
		});
	};


	// Stream.Events

	Stream.Events = function(type, node) {
		return new Stream(function setup(notify, stop) {
			var buffer = [];

			function update(value) {
				buffer.push(value);
				notify('push');
			}

			node.addEventListener(type, update);

			return {
				shift: function() {
					return buffer.shift();
				},

				stop: function stop() {
					node.removeEventListener(type, update);
					stop(buffer.length);
				}
			};
		});
	};


	// Stream Timers

	Stream.Choke = function(time) {
		return new Stream(function setup(notify, done) {
			var buffer = [];
			var update = Wait(function() {
				// Get last value and stick it in buffer
				buffer[0] = arguments[arguments.length - 1];
				notify('push');
			}, time);

			return {
				shift: function() {
					return buffer.shift();
				},

				push: update,

				stop: function stop() {
					update.cancel(false);
					done();
				}
			};
		});
	};



	// Frame timer

	var frameTimer = {
		now:     now,
		request: requestAnimationFrame.bind(window),
		cancel:  cancelAnimationFrame.bind(window)
	};


	// Stream timer

	function StreamTimer(stream) {
		var timer = this;
		var fns0  = [];
		var fns1  = [];
		this.fns = fns0;

		stream.each(function() {
			timer.fns = fns1;
			fns0.reduce(call, undefined);
			fns0.length = 0;
			fns1 = fns0;
			fns0 = timer.fns;
		});
	}

	assign(StreamTimer.prototype, {
		request: function(fn) {
			this.fns.push(fn);
			return fn;
		},

		cancel: function(fn) {
			remove(this.fns, fn);
		}
	});


	// Stream.throttle

	function schedule() {
		var timer   = this.timer;

		this.queue = noop;
		this.ref   = timer.request(this.update);
	}

	function ThrottleSource(notify, stop, timer) {
		var source   = this;

		this._stop   = stop;
		this.timer   = timer;
		this.queue   = schedule;
		this.update  = function update() {
			source.queue = schedule;
			notify('push');
		};
	}

	assign(ThrottleSource.prototype, {
		shift: function shift() {
			var value = this.value;
			this.value = undefined;
			return value;
		},

		stop: function stop(callLast) {
			var timer = this.timer;

			// An update is queued
			if (this.queue === noop) {
				timer.cancel && timer.cancel(this.ref);
				this.ref = undefined;
			}

			// Don't permit further changes to be queued
			this.queue = noop;

			// If there is an update queued apply it now
			// Hmmm. This is weird semantics. TODO: callLast should
			// really be an 'immediate' flag, no?
			this._stop(this.value !== undefined && callLast ? 1 : 0);
		},

		push: function throttle() {
			// Store the latest value
			this.value = arguments[arguments.length - 1];

			// Queue the update
			this.queue();
		}
	});

	Stream.throttle = function(timer) {
		if (typeof timer === 'function') {
			throw new Error('Dont accept request and cancel functions anymore');
		}

		timer = typeof timer === 'number' ?
			new Timer(timer) :
		timer instanceof Stream ?
			new StreamTimer(timer) :
		timer ? timer :
			frameTimer ;

		return new Stream(function(notify, stop) {
			return new ThrottleSource(notify, stop, timer);
		});
	};



	function ClockSource(notify, stop, options) {
		// requestAnimationFrame/cancelAnimationFrame cannot be invoked
		// with context, so need to be referenced.

		var source  = this;
		var request = options.request;

		function frame(time) {
			source.value = time;
			notify('push');
			source.value = undefined;
			source.id    = request(frame);
		}

		this.cancel = options.cancel || noop;
		this.end    = stop;

		// Start clock
		this.id = request(frame);
	}

	assign(ClockSource.prototype, {
		shift: function shift() {
			var value = this.value;
			this.value = undefined;
			return value;
		},

		stop: function stop() {
			var cancel = this.cancel;
			cancel(this.id);
			this.end();
		}
	});

	Stream.clock = function ClockStream(options) {
		var timer = typeof options === 'number' ?
			new Timer(options) :
			options || frameTimer ;

		return new Stream(ClockSource, timer);
	};


	// Stream Methods

	Stream.prototype = assign(Object.create(Fn.prototype), {
		clone: function() {
			var source  = this;
			var shift   = this.shift;
			var buffer1 = [];
			var buffer2 = [];

			var stream  = new Stream(function setup(notify, stop) {
				var buffer = buffer2;

				source.on('push', notify);

				return {
					shift: function() {
						if (buffer.length) { return buffer.shift(); }
						var value = shift();

						if (value !== undefined) { buffer1.push(value); }
						else if (source.status === 'done') {
							stop(0);
							source.off('push', notify);
						}

						return value;
					},

					stop: function() {
						var value;

						// Flush all available values into buffer
						while ((value = shift()) !== undefined) {
							buffer.push(value);
							buffer1.push(value);
						}

						stop(buffer.length);
						source.off('push', notify);
					}
				};
			});

			this.then(stream.stop);

			this.shift = function() {
				if (buffer1.length) { return buffer1.shift(); }
				var value = shift();
				if (value !== undefined && stream.status !== 'done') { buffer2.push(value); }
				return value;
			};

			return stream;
		},

		combine: function(fn, source) {
			return Stream.Combine(fn, this, source);
		},

		merge: function() {
			var sources = toArray(arguments);
			sources.unshift(this);
			return Stream.Merge.apply(null, sources);
		},

		choke: function(time) {
			return this.pipe(Stream.Choke(time));
		},

		throttle: function(timer) {
			return this.pipe(Stream.throttle(timer));
		},

		clock: function(timer) {
			return this.pipe(Stream.clock(timer));
		},


		// Consume

		each: function(fn) {
			var args   = arguments;
			var source = this;

			// Flush and observe
			Fn.prototype.each.apply(source, args);

			return this.on('push', function each() {
				// Delegate to Fn#each().
				Fn.prototype.each.apply(source, args);
			});
		},

		pipe: function(stream) {
			this.each(stream.push);
			return Fn.prototype.pipe.apply(this, arguments);
		},


		// Events

		on: function(type, fn) {
			var events = this[$events];
			if (!events) { return this; }

			var listeners = events[type] || (events[type] = []);
			listeners.push(fn);
			return this;
		},

		off: function(type, fn) {
			var events = this[$events];
			if (!events) { return this; }

			// Remove all handlers for all types
			if (arguments.length === 0) {
				Object.keys(events).forEach(off, this);
				return this;
			}

			var listeners = events[type];
			if (!listeners) { return; }

			// Remove all handlers for type
			if (!fn) {
				delete events[type];
				return this;
			}

			// Remove handler fn for type
			var n = listeners.length;
			while (n--) {
				if (listeners[n] === fn) { listeners.splice(n, 1); }
			}

			return this;
		}
	});


	// Export

	window.Stream = Stream;

})(this);
(function(window) {
	"use strict";

	if (!window.Proxy) {
		console.warn('Proxy constructor not found. This version of Observable cannot be used.');
		return;
	}

	var A            = Array.prototype;
	var assign       = Object.assign;
	var isExtensible = Object.isExtensible;

	var $observable  = Symbol('observable');
	var $observers   = Symbol('observers');
	var $update      = Symbol('update');

	var nothing      = Object.freeze([]);

	///^\[?([-\w]+)(?:=(['"])([-\w]+)\2)?\]?\.?/g;
	var rname        = /\[?([-\w]+)(?:=(['"])?([-\w]+)\2)?\]?\.?/g;

	// Utils

	function noop() {}

	function isArrayLike(object) {
		return object.hasOwnProperty('length') &&
			typeof object.length === 'number' ;
	}


	// Observable
	function trapGet(target, name, self) {
		var value = target[name];

		// Ignore symbols
		return typeof name === 'symbol' ?
			value :
			Observable(value) || value ;
	}

	//var change = {};

	var arrayHandlers = {
		get: trapGet,

		set: function(target, name, value, receiver) {
			// We are setting a symbol
			if (typeof name === 'symbol') {
				target[name] = value;
				return true;
			}

			var old = target[name];

			// If we are setting the same value, we're not really setting at all
			if (old === value) { return true; }

			var observers = target[$observers];
			var change;

			// We are setting length
			if (name === 'length') {
				if (value >= target.length) {
					// Don't allow array length to grow like this
					//target.length = value;
					return true;
				}

				change = {
					index:   value,
					removed: A.splice.call(target, value),
					added:   nothing,
				};

				while (--old >= value) {
					fire(observers[old], undefined);
				}
			}

			// We are setting an integer string or number
			else if (+name % 1 === 0) {
				name = +name;
				if (value === undefined) {
					if (name < target.length) {
						change = {
							index:   name,
							removed: A.splice.call(target, name, 1),
							added:   nothing
						};

						value = target[name];
					}
					else {
						return true;
					}
				}
				else {
					change = {
						index:   name,
						removed: A.splice.call(target, name, 1, value),
						added:   [value]
					};
				}
			}

			// We are setting some other key
			else {
				target[name] = value;
			}

			fire(observers[name], Observable(value) || value);
			fire(observers[$update], receiver, change);

			//change.index = 0;
			//change.removed.length = 0;
			//change.added.length = 0;

			// Return true to indicate success
			return true;
		}
	};

	var objectHandlers = {
		get: trapGet,

		set: function(target, name, value, receiver) {
			var old = target[name];

			// If we are setting the same value, we're not really setting at all
			if (old === value) { return true; }

			target[name] = value;

			var observers = target[$observers];

			fire(observers[name], Observable(value) || value);
			fire(observers[$update], receiver);

			// Return true to indicate success
			return true;
		}
	};

	function fire(observers, value, record) {
		if (!observers) { return; }

		// Todo: What happens if observers are removed during this operation?
		// Bad things, I'll wager.
		var n = -1;
		while (observers[++n]) {
			observers[n](value, record);
		}
	}

	function isObservable(object) {
		return object
			&& typeof object === 'object'
			&& isExtensible(object)
			&& !(object instanceof Date) ;
	}

	function Observable(object) {
		if (!isObservable(object)) { return; }

		if (object[$observable]) {
			return object[$observable];
		}

		var observable = new Proxy(object, isArrayLike(object) ?
			arrayHandlers :
			objectHandlers
		);

		object[$observers]  = {};
		object[$observable] = observable;

		return observable;
	}


	// Observable.observe

	function getObservers(object, name) {
		return object[$observers][name]
			|| (object[$observers][name] = []);
	}

	function removeObserver(observers, fn) {
		var i = observers.indexOf(fn);
		observers.splice(i, 1);
	}

	function observePrimitive(object, fn) {
		if (object !== fn.value) {
			fn.value = object;
			fn(object);
		}

		return noop;
	}

	function observeObject(object, fn) {
		var observers = getObservers(object, $update);
		var old       = fn.value;

		observers.push(fn);

		if (object !== fn.value) {
//console.log('REMOVE', fn.value);
			fn.value = object;
//console.log('ADD', fn.value);
			fn(object, {
				index:   0,
				removed: old ? old : nothing,
				added:   object
			});
		}

		return function unobserveObject() {
			removeObserver(observers, fn);
		};
	}

	function observeItem(object, key, match, path, fn) {
		var unobserve = noop;

		function isMatch(item) {
			return item[key] === match;
		}

		function update(array) {
			var value = array && A.find.call(array, isMatch);
			unobserve();
			unobserve = observe(value, path, fn);
		}

		var unobserveObject = observeObject(object, update);

		return function unobserveItem() {
			unobserve();
			unobserveObject();
		};
	}

	function observeProperty(object, name, path, fn) {
		var observers = getObservers(object, name);
		var unobserve = noop;

		function update(value) {
			unobserve();
			unobserve = observe(value, path, fn);
		}

		observers.push(update);
		update(object[name]);

		return function unobserveProperty() {
			unobserve();
			removeObserver(observers, update);
		};
	}

	function observe(object, path, fn) {
		if (!path.length) {
			return isObservable(object) ?
				observeObject(object, fn) :
				observePrimitive(object, fn) ;
		}

		if (!(object && typeof object === 'object')) {
			return observePrimitive(undefined, fn);
		}

		rname.lastIndex = 0;
		var tokens = rname.exec(path);

		if (!tokens) {
			throw new Error('Observable: invalid path "' + path + '"');
		}

		var name  = tokens[1];
		var match = tokens[3] && (
			tokens[2] ?
				tokens[3] :
				parseFloat(tokens[3])
		);

		path = path.slice(rname.lastIndex);

		return match ?
			observeItem(object, name, match, path, fn) :
			observeProperty(object, name, path, fn) ;
	}

	function notify(object, path) {
		var observers = object[$observers];
		fire(observers[path], object[$observable]);
		fire(observers[$update], object);
	}

	Observable.isObservable = isObservable;
	Observable.notify       = notify;

	Observable.observe = function(object, path, fn) {
		// Coerce to string
		path += '';
		object = Observable(object);

		return object ? observe(object, path, fn) : noop ;
	};

	Observable.filter = function(fn, array) {
		var subset = Observable([]);

		Observable.observe(array, '', function() {
			var filtered = array.filter(fn);
			assign(subset, filtered);
			subset.length = filtered.length;
		});

		return subset;
	};

	Observable.map = function(fn, array) {
		var subset = Observable([]);

		Observable.observe(array, '', function(observable) {
			var filtered = array.map(fn);
			assign(subset, filtered);
			subset.length = filtered.length;
		});

		return subset;
	};

	// Export

	window.Observable = Observable;

})(this);
(function(window) {
	"use strict";

	var Fn         = window.Fn;
	var Stream     = window.Stream;
	var Observable = window.Observable;

	// Dont import it yet - we may be about to overwrite it with our back-fill
	// for browsers without Proxy.
	//var Observable = window.Observable;
	//var observe    = Observable.observe;

	var curry      = Fn.curry;
	var noop       = Fn.noop;
	var setPath    = Fn.setPath;

	function ObserveSource(end, object, path) {
		this.observable = Observable(object);
		this.path       = path;
		this.end        = end;
	}

	ObserveSource.prototype = {
		shift: function() {
			var value = this.value;
			this.value = undefined;
			return value;
		},

		push: function() {
			setPath(this.path, this.observable, arguments[arguments.length - 1]);
		},

		stop: function() {
			this.unobserve();
			this.end();
		},

		unobserve: noop
	};

	Stream.observe = curry(function(path, object) {
		return new Stream(function setup(notify, stop) {
			var source = new ObserveSource(stop, object, path);

			function update(v) {
				source.value = v === undefined ? null : v ;
				notify('push');
			}

			source.unobserve = Observable.observe(object, path, update);
			return source;
		});
	});
})(this);
(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('dom         – https://github.com/stephband/dom');
})(this);

(function(window) {
	"use strict";


	// Import

	var Fn          = window.Fn;
	var Node        = window.Node;
	var SVGElement  = window.SVGElement;
	var CustomEvent = window.CustomEvent;
	var Stream      = window.Stream;

	var assign      = Object.assign;
	var define      = Object.defineProperties;
	var cache       = Fn.cache;
	var compose     = Fn.compose;
	var curry       = Fn.curry;
	var denormalise = Fn.denormalise;
	var deprecate   = Fn.deprecate;
	var id          = Fn.id;
	var noop        = Fn.noop;
	var overload    = Fn.overload;
	var pipe        = Fn.pipe;
	var pow         = Fn.pow;
	var set         = Fn.set;
	var requestTick = Fn.requestTick;
	var toType      = Fn.toType;


	// Var

	var A            = Array.prototype;
	var svgNamespace = 'http://www.w3.org/2000/svg';
	var rspaces      = /\s+/;
	var rpx          = /px$/;


	// Features

	var features = define({}, {
		inputEventsWhileDisabled: {
			// FireFox won't dispatch any events on disabled inputs:
			// https://bugzilla.mozilla.org/show_bug.cgi?id=329509

			get: cache(function() {
				var input     = document.createElement('input');
				var testEvent = Event('featuretest');
				var result    = false;

				appendChild(document.body, input);
				input.disabled = true;
				input.addEventListener('featuretest', function(e) { result = true; });
				input.dispatchEvent(testEvent);
				removeNode(input);

				return result;
			}),

			enumerable: true
		},

		template: {
			get: cache(function() {
				// Older browsers don't know about the content property of templates.
				return 'content' in document.createElement('template');
			}),

			enumerable: true
		},

		textareaPlaceholderSet: {
			// IE sets textarea innerHTML (but not value) to the placeholder
			// when setting the attribute and cloning and so on. The twats have
			// marked it "Won't fix":
			//
			// https://connect.microsoft.com/IE/feedback/details/781612/placeholder-text-becomes-actual-value-after-deep-clone-on-textarea

			get: cache(function() {
				var node = document.createElement('textarea');
				node.setAttribute('placeholder', '---');
				return node.innerHTML === '';
			}),

			enumerable: true
		},

		transition: {
			get: cache(function testTransition() {
				var prefixed = prefix('transition');
				return prefixed || false;
			}),

			enumerable: true
		},

		transitionend: {
			// Infer transitionend event from CSS transition prefix

			get: cache(function() {
				var end = {
					KhtmlTransition: false,
					OTransition: 'oTransitionEnd',
					MozTransition: 'transitionend',
					WebkitTransition: 'webkitTransitionEnd',
					msTransition: 'MSTransitionEnd',
					transition: 'transitionend'
				};

				var prefixed = prefix('transition');
				return prefixed && end[prefixed];
			}),

			enumerable: true
		}
	});


	// Utilities

	function bindTail(fn) {
		// Takes arguments 1 and up and appends them to arguments
		// passed to fn.
		var args = A.slice.call(arguments, 1);
		return function() {
			A.push.apply(arguments, args);
			fn.apply(null, arguments);
		};
	}

	function prefixSlash(str) {
		// Prefixes a slash when there is not an existing one
		return (/^\//.test(str) ? '' : '/') + str ;
	}

	function toArray(object) {
		// Speed test for array conversion:
		// https://jsperf.com/nodelist-to-array/27

		var array = [];
		var l = array.length = object.length;
		var i;

		for (i = 0; i < l; i++) {
			array[i] = object[i];
		}

		return array;
	}


	// TokenList
	// TokenList constructor to emulate classList property. The get fn should
	// take the arguments (node), and return a string of tokens. The set fn
	// should take the arguments (node, string).

	function TokenList(node, get, set) {
		this.node = node;
		this.get = get;
		this.set = set;
	}

	TokenList.prototype = {
		add: function() {
			var n = arguments.length;
			var tokens = this.get(this.node);
			var array = tokens ? tokens.trim().split(rspaces) : [] ;

			while (n--) {
				if (array.indexOf(arguments[n]) === -1) {
					array.push(arguments[n]);
				}
			}

			this.set(this.node, array.join(' '));
		},

		remove: function() {
			var n = arguments.length;
			var tokens = this.get(this.node);
			var array = tokens ? tokens.trim().split(rspaces) : [] ;
			var i;

			while (n--) {
				i = array.indexOf(arguments[n]);
				if (i !== -1) { array.splice(i, 1); }
			}

			this.set(this.node, array.join(' '));
		},

		contains: function(string) {
			var tokens = this.get(this.node);
			var array = tokens ? tokens.trim().split(rspaces) : [] ;
			return array.indexOf(string) !== -1;
		}
	};


	// DOM Nodes

	var testDiv = document.createElement('div');

	var types = {
		1:  'element',
		3:  'text',
		8:  'comment',
		9:  'document',
		10: 'doctype',
		11: 'fragment'
	};

	var svgs = [
		'circle',
		'ellipse',
		'g',
		'line',
		'rect',
		//'text',
		'use',
		'path',
		'polygon',
		'polyline',
		'svg'
	];

	var constructors = {
		text: function(text) {
			return document.createTextNode(text || '');
		},

		comment: function(text) {
			return document.createComment(text || '');
		},

		fragment: function(html) {
			var fragment = document.createDocumentFragment();

			if (html) {
				testDiv.innerHTML = html;
				append(fragment, testDiv.childNodes);
				testDiv.innerHTML = '';
			}

			return fragment;
		}
	};

	svgs.forEach(function(tag) {
		constructors[tag] = function(attributes) {
			var node = document.createElementNS(svgNamespace, tag);
			if (attributes) { setSVGAttributes(node, attributes); }
			return node;
		};
	});

	function assignAttributes(node, attributes) {
		var names = Object.keys(attributes);
		var n = names.length;

		while (n--) {
			node.setAttribute(names[n], attributes[names[n]]);
		}
	}

	function setSVGAttributes(node, attributes) {
		var names = Object.keys(attributes);
		var n = names.length;

		while (n--) {
			node.setAttributeNS(null, names[n], attributes[names[n]]);
		}
	}

	function create(name) {
		// create(name)
		// create(name, text)
		// create(name, attributes)
		// create(name, text, attributes)

		if (constructors[name]) {
			return constructors[name](arguments[1]);
		}

		var node = document.createElement(name);
		var attributes;

		if (typeof arguments[1] === 'string') {
			node.innerHTML = arguments[1];
			attributes = arguments[2];
		}
		else {
			attributes = arguments[1];
		}

		if (attributes) {
			assignAttributes(node, attributes);
		}

		return node;
	}

	var clone = features.textareaPlaceholderSet ?

		function clone(node) {
			return node.cloneNode(true);
		} :

		function cloneWithHTML(node) {
			// IE sets textarea innerHTML to the placeholder when cloning.
			// Reset the resulting value.

			var clone     = node.cloneNode(true);
			var textareas = dom.query('textarea', node);
			var n         = textareas.length;
			var clones;

			if (n) {
				clones = dom.query('textarea', clone);

				while (n--) {
					clones[n].value = textareas[n].value;
				}
			}

			return clone;
		} ;

	function type(node) {
		return types[node.nodeType];
	}

	function isElementNode(node) {
		return node.nodeType === 1;
	}

	function isTextNode(node) {
		return node.nodeType === 3;
	}

	function isCommentNode(node) {
		return node.nodeType === 8;
	}

	function isFragmentNode(node) {
		return node.nodeType === 11;
	}

	function isInternalLink(node) {
		var location = window.location;

			// IE does not give us a .hostname for links to
			// xxx.xxx.xxx.xxx URLs
		return node.hostname &&
			// IE gives us the port on node.host, even where it is not
			// specified. Use node.hostname
			location.hostname === node.hostname &&
			// IE gives us node.pathname without a leading slash, so
			// add one before comparing
			location.pathname === prefixSlash(node.pathname);
	}

	function identify(node) {
		var id = node.id;

		if (!id) {
			do { id = Math.ceil(Math.random() * 100000); }
			while (document.getElementById(id));
			node.id = id;
		}

		return id;
	}

	function tag(node) {
		return node.tagName && node.tagName.toLowerCase();
	}

	function attribute(name, node) {
		return node.getAttribute && node.getAttribute(name) || undefined ;
	}

	function setClass(node, classes) {
		if (node instanceof SVGElement) {
			node.setAttribute('class', classes);
		}
		else {
			node.className = classes;
		}
	}

	function classes(node) {
		return node.classList || new TokenList(node, dom.attribute('class'), setClass);
	}

	function addClass(string, node) {
		classes(node).add(string);
	}

	function removeClass(string, node) {
		classes(node).remove(string);
	}

	function flashClass(string, node) {
		var list = classes(node);
		list.add(string);
		requestAnimationFrame(function() {
			list.remove(string);
		});
	}

	function children(node) {
		// In IE and Safari, document fragments do not have .children
		return toArray(node.children || node.querySelectorAll('*'));
	}


	// DOM Traversal

	function query(selector, node) {
		node = node || document;
		return toArray(node.querySelectorAll(selector));
	}

	function contains(child, node) {
		return node.contains ?
			node.contains(child) :
		child.parentNode ?
			child.parentNode === node || contains(child.parentNode, node) :
		false ;
	}

	function matches(selector, node) {
		return node.matches ? node.matches(selector) :
			node.matchesSelector ? node.matchesSelector(selector) :
			node.webkitMatchesSelector ? node.webkitMatchesSelector(selector) :
			node.mozMatchesSelector ? node.mozMatchesSelector(selector) :
			node.msMatchesSelector ? node.msMatchesSelector(selector) :
			node.oMatchesSelector ? node.oMatchesSelector(selector) :
			// Dumb fall back to simple tag name matching. Nigh-on useless.
			tag(node) === selector ;
	}

	function closest(selector, node) {
		var root = arguments[2];

		if (!node || node === document || node === root || node.nodeType === 11) { return; }

		// SVG <use> elements store their DOM reference in
		// .correspondingUseElement.
		node = node.correspondingUseElement || node ;

		return matches(selector, node) ?
			 node :
			 closest(selector, node.parentNode, root) ;
	}

	function next(node) {
		return node.nextElementSibling || undefined;
	}

	function previous(node) {
		return node.previousElementSibling || undefined;
	}


	// DOM Mutation

	function appendChild(target, node) {
		target.appendChild(node);

		// Use this fn as a reducer
		return target;
	}

	function append(target, node) {
		if (node instanceof Node || node instanceof SVGElement) {
			appendChild(target, node);
			return node;
		}

		if (!node.length) { return; }

		var array = node.reduce ? node : A.slice.call(node) ;
		array.reduce(appendChild, target);

		return node;
	}

	function empty(node) {
		while (node.lastChild) { node.removeChild(node.lastChild); }
	}

	function removeNode(node) {
		node.parentNode && node.parentNode.removeChild(node);
	}

	function remove(node) {
		if (node instanceof Node || node instanceof SVGElement) {
			removeNode(node);
		}
		else {
			A.forEach.call(node, removeNode);
		}
	}

	function before(target, node) {
		target.parentNode && target.parentNode.insertBefore(node, target);
	}

	function after(target, node) {
		target.parentNode && target.parentNode.insertBefore(node, target.nextSibling);
	}

	function replace(target, node) {
		before(target, node);
		remove(target);
		return target;
	}


	// CSS

	var styleParsers = {
		"transform:translateX": function(node) {
			var matrix = style('transform', node);
			if (!matrix || matrix === "none") { return 0; }
			var values = valuesFromCssFn(matrix);
			return parseFloat(values[4]);
		},

		"transform:translateY": function(node) {
			var matrix = style('transform', node);
			if (!matrix || matrix === "none") { return 0; }
			var values = valuesFromCssFn(matrix);
			return parseFloat(values[5]);
		},

		"transform:scale": function(node) {
			var matrix = style('transform', node);
			if (!matrix || matrix === "none") { return 0; }
			var values = valuesFromCssFn(matrix);
			var a = parseFloat(values[0]);
			var b = parseFloat(values[1]);
			return Math.sqrt(a * a + b * b);
		},

		"transform:rotate": function(node) {
			var matrix = style('transform', node);
			if (!matrix || matrix === "none") { return 0; }
			var values = valuesFromCssFn(matrix);
			var a = parseFloat(values[0]);
			var b = parseFloat(values[1]);
			return Math.atan2(b, a);
		}
	};

	var prefix = (function(prefixes) {
		var node = document.createElement('div');
		var cache = {};

		function testPrefix(prop) {
			if (prop in node.style) { return prop; }

			var upper = prop.charAt(0).toUpperCase() + prop.slice(1);
			var l = prefixes.length;
			var prefixProp;

			while (l--) {
				prefixProp = prefixes[l] + upper;

				if (prefixProp in node.style) {
					return prefixProp;
				}
			}

			return false;
		}

		return function prefix(prop){
			return cache[prop] || (cache[prop] = testPrefix(prop));
		};
	})(['Khtml','O','Moz','Webkit','ms']);

	function valuesFromCssFn(string) {
		return string.split('(')[1].split(')')[0].split(/\s*,\s*/);
	}

	function style(name, node) {
		return window.getComputedStyle ?
			window
			.getComputedStyle(node, null)
			.getPropertyValue(name) :
			0 ;
	}

	function viewportLeft(elem) {
		var body = document.body;
		var html = document.documentElement;
		var box  = elem.getBoundingClientRect();
		var scrollLeft = window.pageXOffset || html.scrollLeft || body.scrollLeft;
		var clientLeft = html.clientLeft || body.clientLeft || 0;
		return (box.left + scrollLeft - clientLeft);
	}

	function viewportTop(elem) {
		var body = document.body;
		var html = document.documentElement;
		var box  = elem.getBoundingClientRect();
		var scrollTop = window.pageYOffset || html.scrollTop || body.scrollTop;
		var clientTop = html.clientTop || body.clientTop || 0;
		return box.top +  scrollTop - clientTop;
	}

/*
function getPositionParent(node) {
	var offsetParent = node.offsetParent;

	while (offsetParent && style("position", offsetParent) === "static") {
		offsetParent = offsetParent.offsetParent;
	}

	return offsetParent || document.documentElement;
}

	function offset(node) {
		// Pinched from jQuery.offset...
	    // Return zeros for disconnected and hidden (display: none) elements
	    // Support: IE <=11 only
	    // Running getBoundingClientRect on a
	    // disconnected node in IE throws an error
	    if (!node.getClientRects().length) { return [0, 0]; }

	    var rect     = node.getBoundingClientRect();
	    var document = node.ownerDocument;
	    var window   = document.defaultView;
	    var docElem  = document.documentElement;

	    return [
			 rect.left + window.pageXOffset - docElem.clientLeft,
			 rect.top  + window.pageYOffset - docElem.clientTop
	    ];
	}

	function position(node) {
		var rect;

	    // Fixed elements are offset from window (parentOffset = {top:0, left: 0},
	    // because it is its only offset parent
	    if (style('position', node) === 'fixed') {
	        rect = node.getBoundingClientRect();

	        return [
		        rect.left - (parseFloat(style("marginLeft", node)) || 0),
		        rect.top  - (parseFloat(style("marginTop", node)) || 0)
	        ];
	    }

		// Get *real* offsetParent
		var parent = getPositionParent(node);

		// Get correct offsets
		var nodeOffset = offset(node);
		var parentOffset = tag(parent) !== "html" ? [0, 0] : offset(parent);

		// Add parent borders
		parentOffset[0] += parseFloat(style("borderLeftWidth", parent)) || 0;
		parentOffset[1] += parseFloat(style("borderTopWidth", parent)) || 0;

	    // Subtract parent offsets and element margins
		nodeOffset[0] -= (parentOffset[0] + (parseFloat(style("marginLeft", node)) || 0)),
		nodeOffset[1] -= (parentOffset[1] + (parseFloat(style("marginTop", node)) || 0))

		return nodeOffset;
	}
*/

	function windowBox() {
		return {
			left:   0,
			top:    0,
			width:  window.innerWidth,
			height: window.innerHeight
		};
	}

	function box(node) {
		return node === window ?
			windowBox() :
			node.getClientRects()[0] ;
	}

	function bounds(node) {
		return node.getBoundingClientRect();
	}

	function position(node) {
		var rect = box(node);
		return [rect.left, rect.top];
	}

	//function offset(node) {
	//	var rect = box(node);
	//	var scrollX = window.scrollX === undefined ? window.pageXOffset : window.scrollX ;
	//	var scrollY = window.scrollY === undefined ? window.pageYOffset : window.scrollY ;
	//	return [rect.left + scrollX, rect.top + scrollY];
	//}

	function offset(node1, node2) {
		var box1 = box(node1);
		var box2 = box(node2);
		return [box2.left - box1.left, box2.top - box1.top];
	}


	// DOM Events

	var eventOptions = { bubbles: true };

	var eventsSymbol = Symbol('events');

	var keyCodes = {
		8:  'backspace',
		9:  'tab',
		13: 'enter',
		16: 'shift',
		17: 'ctrl',
		18: 'alt',
		27: 'escape',
		32: 'space',
		33: 'pageup',
		34: 'pagedown',
		35: 'pageright',
		36: 'pageleft',
		37: 'left',
		38: 'up',
		39: 'right',
		40: 'down',
		46: 'delete',
		48: '0',
		49: '1',
		50: '2',
		51: '3',
		52: '4',
		53: '5',
		54: '6',
		55: '7',
		56: '8',
		57: '9',
		65: 'a',
		66: 'b',
		67: 'c',
		68: 'd',
		69: 'e',
		70: 'f',
		71: 'g',
		72: 'h',
		73: 'i',
		74: 'j',
		75: 'k',
		76: 'l',
		77: 'm',
		78: 'n',
		79: 'o',
		80: 'p',
		81: 'q',
		82: 'r',
		83: 's',
		84: 't',
		85: 'u',
		86: 'v',
		87: 'w',
		88: 'x',
		89: 'y',
		90: 'z',
		// Mac Chrome left CMD
		91: 'cmd',
		// Mac Chrome right CMD
		93: 'cmd',
		186: ';',
		187: '=',
		188: ',',
		189: '-',
		190: '.',
		191: '/',
		219: '[',
		220: '\\',
		221: ']',
		222: '\'',
		// Mac FF
		224: 'cmd'
	};

	var untrapFocus = noop;

	function Event(type, properties) {
		var options = assign({}, eventOptions, properties);
		var event   = new CustomEvent(type, options);

		if (properties) {
			delete properties.detail;
			assign(event, properties);
		}

		return event;
	}

	function preventDefault(e) {
		e.preventDefault();
	}

	function isPrimaryButton(e) {
		// Ignore mousedowns on any button other than the left (or primary)
		// mouse button, or when a modifier key is pressed.
		return (e.which === 1 && !e.ctrlKey && !e.altKey && !e.shiftKey);
	}

	function toKey(e) {
		return keyCodes[e.keyCode];
	}

	function on(node, types, fn, data) {
		types = types.split(rspaces);

		var events  = node[eventsSymbol] || (node[eventsSymbol] = {});
		var handler = bindTail(fn, data);
		var handlers, type;

		var n = -1;
		while (n++ < types.length) {
			type = types[n];
			handlers = events[type] || (events[type] = []);
			handlers.push([fn, handler]);
			node.addEventListener(type, handler);
		}

		return node;
	}

	function off(node, types, fn) {
		types = types.split(rspaces);

		var events = node[eventsSymbol];
		var type, handlers, i;

		if (!events) { return node; }

		var n = -1;
		while (n++ < types.length) {
			type = types[n];
			handlers = events[type];
			if (!handlers) { continue; }
			i = handlers.length;
			while (i--) {
				if (handlers[i][0] === fn) {
					node.removeEventListener(type, handlers[i][1]);
					handlers.splice(i, 1);
				}
			}
		}

		return node;
	}

	function trigger(node, type, properties) {
		// Don't cache events. It prevents you from triggering an event of a
		// given type from inside the handler of another event of that type.
		var event = Event(type, properties);
		node.dispatchEvent(event);
	}

	function end(e, fn) {
		off(e.currentTarget, features.transitionend, end);
		fn(e.timeStamp);
	}

	function requestEvent(type, fn, node) {
		if (type === 'transitionend') {
			if (!features.transition) {
				fn(performance.now());
				return;
			}

			type = features.transitionend;
		}

		on(node, type, end, fn);
	}

	function delegate(selector, fn) {
		// Create an event handler that looks up the ancestor tree
		// to find selector.
		return function handler(e) {
			var node = closest(selector, e.target, e.currentTarget);
			if (!node) { return; }
			e.delegateTarget = node;
			fn(e, node);
			e.delegateTarget = undefined;
		};
	}

	function event(types, node) {
		types = types.split(rspaces);

		return new Stream(function setup(notify, stop) {
			var buffer = [];

			function update(value) {
				buffer.push(value);
				notify('push');
			}

			types.forEach(function(type) {
				node.addEventListener(type, update);
			});

			return {
				shift: function() {
					return buffer.shift();
				},

				stop: function stop() {
					types.forEach(function(type) {
						node.removeEventListener(type, update);
					});

					stop(buffer.length);
				}
			};
		});
	}

	function trapFocus(node) {
		// Trap focus as described by Nikolas Zachas:
		// http://www.nczonline.net/blog/2013/02/12/making-an-accessible-dialog-box/

		// If there is an existing focus trap, remove it
		untrapFocus();

		// Cache the currently focused node
		var focusNode = document.activeElement || document.body;

		function resetFocus() {
			var focusable = dom.query('[tabindex], a, input, textarea, button', node)[0];
			if (focusable) { focusable.focus(); }
		}

		function preventFocus(e) {
			if (node.contains(e.target)) { return; }

			// If trying to focus outside node, set the focus back
			// to the first thing inside.
			resetFocus();
			e.preventDefault();
			e.stopPropagation();
		}

		// Prevent focus in capture phase
		document.addEventListener("focus", preventFocus, true);

		// Move focus into node
		requestTick(resetFocus);

		return untrapFocus = function() {
			untrapFocus = noop;
			document.removeEventListener('focus', preventFocus, true);

			// Set focus back to the thing that was last focused when the
			// dialog was opened.
			requestTick(function() {
				focusNode.focus();
			});
		};
	}


	// DOM Fragments and Templates

	var mimetypes = {
		xml:  'application/xml',
		html: 'text/html',
		svg:  'image/svg+xml'
	};

	function fragmentFromChildren(node) {
		if (node.domFragmentFromChildren) {
			return node.domFragmentFromChildren;
		}

		var fragment = create('fragment');
		node.domFragmentFromChildren = fragment;
		append(fragment, node.childNodes);
		return fragment;
	}

	function fragmentFromHTML(html, tag) {
		var node = document.createElement(tag || 'div');
		node.innerHTML = html;
		return fragmentFromChildren(node);
	}

	function fragmentFromTemplate(node) {
		// A template tag has a content property that gives us a document
		// fragment. If that doesn't exist we must make a document fragment.
		return node.content || fragmentFromChildren(node);
	}

	function fragmentFromId(id) {
		var node = document.getElementById(id);

		if (!node) { throw new Error('DOM: element id="' + id + '" is not in the DOM.') }

		var t = tag(node);

		// In browsers where templates are not inert their content can clash
		// with content in the DOM - ids, for example. Remove the template as
		// a precaution.
		if (t === 'template' && !features.template) {
			remove(node);
		}

		return t === 'template' ? fragmentFromTemplate(node) :
			t === 'script' ? fragmentFromHTML(node.innerHTML, attribute('data-parent-tag', node)) :
			fragmentFromChildren(node) ;
	}

	function parse(type, string) {
		var mimetype = mimetypes[type];
		var xml;

		// From jQuery source...
		try {
			xml = (new window.DOMParser()).parseFromString(string, mimetype);
		} catch (e) {
			xml = undefined;
		}

		if (!xml || xml.getElementsByTagName("parsererror").length) {
			throw new Error("dom: Invalid XML: " + string);
		}

		return xml;
	}

	var escape = (function() {
		var pre  = document.createElement('pre');
		var text = document.createTextNode('');

		pre.appendChild(text);

		return function escape(value) {
			text.textContent = value;
			return pre.innerHTML;
		};
	})();


	// Units

	var rem = /(\d*\.?\d+)r?em/;
	//var rpercent = /(\d*\.?\d+)%/;

	var fontSize;

	var toPx = overload(toType, {
		'number': id,

		'string': function(string) {
			var data, n;

			data = rem.exec(string);
			if (data) {
				n = parseFloat(data[1]);
				return getFontSize() * n;
			}

			//data = rpercent.exec(string);
			//if (data) {
			//	n = parseFloat(data[1]) / 100;
			//	return width * n;
			//}

			throw new Error('dom: ' + string + '\' cannot be parsed as rem, em or %.');
		}
	});

	var toRem = overload(toType, {
		'number': function(n) {
			return n / getFontSize();
		}
	});

	function getFontSize() {
		return fontSize ||
			(fontSize = parseFloat(style("font-size", document.documentElement), 10));
	}


	// Animation and scrolling

	function transition(duration, fn) {
		var t0 = performance.now();

		function frame(t1) {
			// Progress from 0-1
			var progress = (t1 - t0) / (duration * 1000);

			if (progress < 1) {
				if (progress > 0) {
					fn(progress);
				}
				id = requestAnimationFrame(frame);
			}
			else {
				fn(1);
			}
		}

		var id = requestAnimationFrame(frame);

		return function cancel() {
			cancelAnimationFrame(id);
		};
	}

	function animate(duration, transform, name, object, value) {
		return transition(
			duration,
			pipe(transform, denormalise(object[name], value), set(name, object))
		);
	}

	function animateScroll(value) {
		return animate(0.6, pow(2), 'scrollTop', dom.viewport, toPx(value));
	}

	function scrollRatio(node) {
		return node.scrollTop / (node.scrollHeight - node.clientHeight);
	}

	function disableScroll(node) {
		node = node || document.documentElement;

		var scrollLeft = node.scrollLeft;
		var scrollTop  = node.scrollTop;

		// Remove scrollbars from the documentElement
		//docElem.css({ overflow: 'hidden' });
		node.style.overflow = 'hidden';

		// FF has a nasty habit of linking the scroll parameters
		// of document with the documentElement, causing the page
		// to jump when overflow is hidden on the documentElement.
		// Reset the scroll position.
		if (scrollTop)  { node.scrollTop = scrollTop; }
		if (scrollLeft) { node.scrollLeft = scrollLeft; }

		// Disable gestures on touch devices
		//add(document, 'touchmove', preventDefaultOutside, layer);
	}

	function enableScroll(node) {
		node = node || document.documentElement;

		var scrollLeft = node.scrollLeft;
		var scrollTop  = node.scrollTop;

		// Put scrollbars back onto docElem
		node.style.overflow = '';

		// FF fix. Reset the scroll position.
		if (scrollTop) { node.scrollTop = scrollTop; }
		if (scrollLeft) { node.scrollLeft = scrollLeft; }

		// Enable gestures on touch devices
		//remove(document, 'touchmove', preventDefaultOutside);
	}


	// dom

	function dom(selector) {
		return query(selector, document);
	}

	var ready = new Promise(function(accept, reject) {
		function handle() {
			document.removeEventListener('DOMContentLoaded', handle);
			window.removeEventListener('load', handle);
			accept();
		}

		document.addEventListener('DOMContentLoaded', handle);
		window.addEventListener('load', handle);
	});

	assign(dom, {

		// DOM lifecycle

		ready:    ready.then.bind(ready),

		// DOM traversal

		get: function get(id) {
			return document.getElementById(id) || undefined;
		},

		find:     Fn.deprecate(function get(id) {
			return document.getElementById(id) || undefined;
		}, 'dom.find(id) is now dom.get(id)'),

		query:    curry(query,    true),
		closest:  curry(closest,  true),
		contains: curry(contains, true),
		matches:  curry(matches,  true),
		children: children,
		next:     next,
		previous: previous,

		// DOM mutation

		assign:   curry(assignAttributes,  true),
		create:   create,
		clone:    clone,
		identify: identify,
		append:   curry(append,  true),
		before:   curry(before,  true),
		after:    curry(after,   true),
		replace:  curry(replace, true),
		empty:    empty,
		remove:   remove,

		// DOM inspection

		isElementNode:  isElementNode,
		isTextNode:     isTextNode,
		isCommentNode:  isCommentNode,
		isFragmentNode: isFragmentNode,
		isInternalLink: isInternalLink,

		type:        type,
		tag:         tag,
		attribute:   curry(attribute, true),
		classes:     classes,
		addClass:    curry(addClass,    true),
		removeClass: curry(removeClass, true),
		flashClass:  curry(flashClass,  true),

		box:         box,
		bounds:      bounds,
		rectangle:   deprecate(box, 'dom.rectangle(node) now dom.box(node)'),

		offset:      curry(offset, true),
		position:    position,

		prefix:      prefix,
		style: curry(function(name, node) {
			// If name corresponds to a custom property name in styleParsers...
			if (styleParsers[name]) { return styleParsers[name](node); }

			var value = style(name, node);

			// Pixel values are converted to number type
			return typeof value === 'string' && rpx.test(value) ?
				parseFloat(value) :
				value ;
		}, true),

		toPx:           toPx,
		toRem:          toRem,
		viewportLeft:   viewportLeft,
		viewportTop:    viewportTop,

		// DOM fragments and templates

		fragmentFromTemplate: fragmentFromTemplate,
		fragmentFromChildren: fragmentFromChildren,
		fragmentFromHTML:     fragmentFromHTML,
		fragmentFromId:       fragmentFromId,
		escape:               escape,
		parse:                curry(parse),

		// DOM events

		Event:           Event,
		delegate:        delegate,
		isPrimaryButton: isPrimaryButton,
		preventDefault:  preventDefault,
		toKey:           toKey,
		trapFocus:       trapFocus,
		trap:            Fn.deprecate(trapFocus, 'dom.trap() is now dom.trapFocus()'),

		events: {
			on:      on,
			off:     off,
			trigger: trigger
		},

		on:     Fn.deprecate(curry(event, true), 'dom.on() is now dom.event()'),

		trigger: curry(function(type, node) {
			trigger(node, type);
			return node;
		}, true),

		event: curry(event, true),

		// DOM animation adn scrolling

		// transition(duration, fn)
		//
		// duration  - duration seconds
		// fn        - callback that is called with a float representing
		//             progress in the range 0-1

		transition: curry(transition, true),
		schedule:   deprecate(transition, 'dom: .schedule() is now .transition()'),

		// animate(duration, transform, value, name, object)
		//
		// duration  - in seconds
		// transform - function that maps x (0-1) to y (0-1)
		// name      - name of property to animate
		// object    - object to animate
		// value     - target value

		animate: curry(animate, true),

		// animateScroll(n)
		//
		// Animate scrollTop of scrollingElement to n (in px)

		animateScroll: animateScroll,
		scrollTo: deprecate(animateScroll, 'scrollTo(px, node) renamed to animateScroll(px)'),

		// scrollRatio(node)
		//
		// Returns scrollTop as ratio of scrollHeight

		scrollRatio: scrollRatio,

		// disableScroll(node)
		//
		// Disables scrolling without causing node's content to jump

		disableScroll: disableScroll,

		// enableScroll(node)
		//
		// Enables scrolling without causing node's content to jump

		enableScroll: enableScroll,

		// requestEvent(type, fn, node)

		requestEvent: requestEvent,

		requestFrame: requestAnimationFrame.bind(null),

		requestFrameN: curry(deprecate(function requestFrameN(n, fn) {
			(function frame() {
				return requestAnimationFrame(--n ? frame : fn);
			}());
		}, 'requestFrameN() will be removed soon'), true),

		// Features

		features: features,

		// Safe visible area

		safe: define({
			left: 0
		}, {
			right:  { get: function() { return window.innerWidth; }, enumerable: true, configurable: true },
			top:    { get: function() { return style('padding-top', document.body); }, enumerable: true, configurable: true },
			bottom: { get: function() { return window.innerHeight; }, enumerable: true, configurable: true }
		})
	});

	define(dom, {
		// Element shortcuts
		root: { value: document.documentElement, enumerable: true },
		head: { value: document.head, enumerable: true },
		body: { get: function() { return document.body; }, enumerable: true	},
		viewport: { get: function() { return document.scrollingElement; }, enumerable: true }
	});


	// Export

	window.dom = dom;
})(this);

// window.CustomEvent polyfill
// http://caniuse.com/#search=customevent

(function(window) {
	if (window.CustomEvent && typeof window.CustomEvent === 'function') { return; }
	if (window.console) { console.log('Polyfill: CustomEvent'); }

	var Event = window.Event;
	var defaults = { bubbles: false, cancelable: false, detail: undefined };

	function CustomEvent(event, params) {
		params = params || defaults;
		
		var e = document.createEvent('CustomEvent');
		e.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
		
		return e;
	};

	CustomEvent.prototype = Event.prototype;
	window.CustomEvent = CustomEvent;
})(window);

// A reduced version of
// https://mths.be/scrollingelement v1.5.2 by @diegoperini & @mathias | MIT license
// Leaves out frameset detection and really old browsers

if (!('scrollingElement' in document)) (function() {
	// Note: standards mode / quirks mode can be toggled at runtime via
	// `document.write`.
	var isCompliantCached;

	function isCompliant() {
		var isStandardsMode = /^CSS1/.test(document.compatMode);
		if (!isStandardsMode) {
			// In quirks mode, the result is equivalent to the non-compliant
			// standards mode behavior.
			return false;
		}
		if (isCompliantCached === void 0) {
			// When called for the first time, check whether the browser is
			// standard-compliant, and cache the result.
			var iframe = document.createElement('iframe');
			iframe.style.height = '1px';
			(document.body || document.documentElement || document).appendChild(iframe);
			var doc = iframe.contentWindow.document;
			doc.write('<!DOCTYPE html><div style="height:9999em">x</div>');
			doc.close();
			isCompliantCached = doc.documentElement.scrollHeight > doc.body.scrollHeight;
			iframe.parentNode.removeChild(iframe);
		}
		return isCompliantCached;
	}

	function scrollingElement() {
		return isCompliant() ? document.documentElement : document.body ;
	}

	if (Object.defineProperty) {
		// Support modern browsers that lack a native implementation.
		Object.defineProperty(document, 'scrollingElement', {
			'get': scrollingElement
		});
	} else {
		document.scrollingElement = scrollingElement();
	}
}());
(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('dom         – https://github.com/stephband/dom');
})(this);

(function(window) {
	"use strict";


	// Import

	var Fn          = window.Fn;
	var Node        = window.Node;
	var SVGElement  = window.SVGElement;
	var CustomEvent = window.CustomEvent;
	var Stream      = window.Stream;

	var assign      = Object.assign;
	var define      = Object.defineProperties;
	var cache       = Fn.cache;
	var compose     = Fn.compose;
	var curry       = Fn.curry;
	var denormalise = Fn.denormalise;
	var deprecate   = Fn.deprecate;
	var id          = Fn.id;
	var noop        = Fn.noop;
	var overload    = Fn.overload;
	var pipe        = Fn.pipe;
	var pow         = Fn.pow;
	var set         = Fn.set;
	var requestTick = Fn.requestTick;
	var toType      = Fn.toType;


	// Var

	var A            = Array.prototype;
	var svgNamespace = 'http://www.w3.org/2000/svg';
	var rspaces      = /\s+/;
	var rpx          = /px$/;


	// Features

	var features = define({}, {
		inputEventsWhileDisabled: {
			// FireFox won't dispatch any events on disabled inputs:
			// https://bugzilla.mozilla.org/show_bug.cgi?id=329509

			get: cache(function() {
				var input     = document.createElement('input');
				var testEvent = Event('featuretest');
				var result    = false;

				appendChild(document.body, input);
				input.disabled = true;
				input.addEventListener('featuretest', function(e) { result = true; });
				input.dispatchEvent(testEvent);
				removeNode(input);

				return result;
			}),

			enumerable: true
		},

		template: {
			get: cache(function() {
				// Older browsers don't know about the content property of templates.
				return 'content' in document.createElement('template');
			}),

			enumerable: true
		},

		textareaPlaceholderSet: {
			// IE sets textarea innerHTML (but not value) to the placeholder
			// when setting the attribute and cloning and so on. The twats have
			// marked it "Won't fix":
			//
			// https://connect.microsoft.com/IE/feedback/details/781612/placeholder-text-becomes-actual-value-after-deep-clone-on-textarea

			get: cache(function() {
				var node = document.createElement('textarea');
				node.setAttribute('placeholder', '---');
				return node.innerHTML === '';
			}),

			enumerable: true
		},

		transition: {
			get: cache(function testTransition() {
				var prefixed = prefix('transition');
				return prefixed || false;
			}),

			enumerable: true
		},

		transitionend: {
			// Infer transitionend event from CSS transition prefix

			get: cache(function() {
				var end = {
					KhtmlTransition: false,
					OTransition: 'oTransitionEnd',
					MozTransition: 'transitionend',
					WebkitTransition: 'webkitTransitionEnd',
					msTransition: 'MSTransitionEnd',
					transition: 'transitionend'
				};

				var prefixed = prefix('transition');
				return prefixed && end[prefixed];
			}),

			enumerable: true
		}
	});


	// Utilities

	function bindTail(fn) {
		// Takes arguments 1 and up and appends them to arguments
		// passed to fn.
		var args = A.slice.call(arguments, 1);
		return function() {
			A.push.apply(arguments, args);
			fn.apply(null, arguments);
		};
	}

	function prefixSlash(str) {
		// Prefixes a slash when there is not an existing one
		return (/^\//.test(str) ? '' : '/') + str ;
	}

	function toArray(object) {
		// Speed test for array conversion:
		// https://jsperf.com/nodelist-to-array/27

		var array = [];
		var l = array.length = object.length;
		var i;

		for (i = 0; i < l; i++) {
			array[i] = object[i];
		}

		return array;
	}


	// TokenList
	// TokenList constructor to emulate classList property. The get fn should
	// take the arguments (node), and return a string of tokens. The set fn
	// should take the arguments (node, string).

	function TokenList(node, get, set) {
		this.node = node;
		this.get = get;
		this.set = set;
	}

	TokenList.prototype = {
		add: function() {
			var n = arguments.length;
			var tokens = this.get(this.node);
			var array = tokens ? tokens.trim().split(rspaces) : [] ;

			while (n--) {
				if (array.indexOf(arguments[n]) === -1) {
					array.push(arguments[n]);
				}
			}

			this.set(this.node, array.join(' '));
		},

		remove: function() {
			var n = arguments.length;
			var tokens = this.get(this.node);
			var array = tokens ? tokens.trim().split(rspaces) : [] ;
			var i;

			while (n--) {
				i = array.indexOf(arguments[n]);
				if (i !== -1) { array.splice(i, 1); }
			}

			this.set(this.node, array.join(' '));
		},

		contains: function(string) {
			var tokens = this.get(this.node);
			var array = tokens ? tokens.trim().split(rspaces) : [] ;
			return array.indexOf(string) !== -1;
		}
	};


	// DOM Nodes

	var testDiv = document.createElement('div');

	var types = {
		1:  'element',
		3:  'text',
		8:  'comment',
		9:  'document',
		10: 'doctype',
		11: 'fragment'
	};

	var svgs = [
		'circle',
		'ellipse',
		'g',
		'line',
		'rect',
		//'text',
		'use',
		'path',
		'polygon',
		'polyline',
		'svg'
	];

	var constructors = {
		text: function(text) {
			return document.createTextNode(text || '');
		},

		comment: function(text) {
			return document.createComment(text || '');
		},

		fragment: function(html) {
			var fragment = document.createDocumentFragment();

			if (html) {
				testDiv.innerHTML = html;
				append(fragment, testDiv.childNodes);
				testDiv.innerHTML = '';
			}

			return fragment;
		}
	};

	svgs.forEach(function(tag) {
		constructors[tag] = function(attributes) {
			var node = document.createElementNS(svgNamespace, tag);
			if (attributes) { setSVGAttributes(node, attributes); }
			return node;
		};
	});

	function assignAttributes(node, attributes) {
		var names = Object.keys(attributes);
		var n = names.length;

		while (n--) {
			node.setAttribute(names[n], attributes[names[n]]);
		}
	}

	function setSVGAttributes(node, attributes) {
		var names = Object.keys(attributes);
		var n = names.length;

		while (n--) {
			node.setAttributeNS(null, names[n], attributes[names[n]]);
		}
	}

	function create(name) {
		// create(name)
		// create(name, text)
		// create(name, attributes)
		// create(name, text, attributes)

		if (constructors[name]) {
			return constructors[name](arguments[1]);
		}

		var node = document.createElement(name);
		var attributes;

		if (typeof arguments[1] === 'string') {
			node.innerHTML = arguments[1];
			attributes = arguments[2];
		}
		else {
			attributes = arguments[1];
		}

		if (attributes) {
			assignAttributes(node, attributes);
		}

		return node;
	}

	var clone = features.textareaPlaceholderSet ?

		function clone(node) {
			return node.cloneNode(true);
		} :

		function cloneWithHTML(node) {
			// IE sets textarea innerHTML to the placeholder when cloning.
			// Reset the resulting value.

			var clone     = node.cloneNode(true);
			var textareas = dom.query('textarea', node);
			var n         = textareas.length;
			var clones;

			if (n) {
				clones = dom.query('textarea', clone);

				while (n--) {
					clones[n].value = textareas[n].value;
				}
			}

			return clone;
		} ;

	function type(node) {
		return types[node.nodeType];
	}

	function isElementNode(node) {
		return node.nodeType === 1;
	}

	function isTextNode(node) {
		return node.nodeType === 3;
	}

	function isCommentNode(node) {
		return node.nodeType === 8;
	}

	function isFragmentNode(node) {
		return node.nodeType === 11;
	}

	function isInternalLink(node) {
		var location = window.location;

			// IE does not give us a .hostname for links to
			// xxx.xxx.xxx.xxx URLs
		return node.hostname &&
			// IE gives us the port on node.host, even where it is not
			// specified. Use node.hostname
			location.hostname === node.hostname &&
			// IE gives us node.pathname without a leading slash, so
			// add one before comparing
			location.pathname === prefixSlash(node.pathname);
	}

	function identify(node) {
		var id = node.id;

		if (!id) {
			do { id = Math.ceil(Math.random() * 100000); }
			while (document.getElementById(id));
			node.id = id;
		}

		return id;
	}

	function tag(node) {
		return node.tagName && node.tagName.toLowerCase();
	}

	function attribute(name, node) {
		return node.getAttribute && node.getAttribute(name) || undefined ;
	}

	function setClass(node, classes) {
		if (node instanceof SVGElement) {
			node.setAttribute('class', classes);
		}
		else {
			node.className = classes;
		}
	}

	function classes(node) {
		return node.classList || new TokenList(node, dom.attribute('class'), setClass);
	}

	function addClass(string, node) {
		classes(node).add(string);
	}

	function removeClass(string, node) {
		classes(node).remove(string);
	}

	function flashClass(string, node) {
		var list = classes(node);
		list.add(string);
		requestAnimationFrame(function() {
			list.remove(string);
		});
	}

	function children(node) {
		// In IE and Safari, document fragments do not have .children
		return toArray(node.children || node.querySelectorAll('*'));
	}


	// DOM Traversal

	function query(selector, node) {
		node = node || document;
		return toArray(node.querySelectorAll(selector));
	}

	function contains(child, node) {
		return node.contains ?
			node.contains(child) :
		child.parentNode ?
			child.parentNode === node || contains(child.parentNode, node) :
		false ;
	}

	function matches(selector, node) {
		return node.matches ? node.matches(selector) :
			node.matchesSelector ? node.matchesSelector(selector) :
			node.webkitMatchesSelector ? node.webkitMatchesSelector(selector) :
			node.mozMatchesSelector ? node.mozMatchesSelector(selector) :
			node.msMatchesSelector ? node.msMatchesSelector(selector) :
			node.oMatchesSelector ? node.oMatchesSelector(selector) :
			// Dumb fall back to simple tag name matching. Nigh-on useless.
			tag(node) === selector ;
	}

	function closest(selector, node) {
		var root = arguments[2];

		if (!node || node === document || node === root || node.nodeType === 11) { return; }

		// SVG <use> elements store their DOM reference in
		// .correspondingUseElement.
		node = node.correspondingUseElement || node ;

		return matches(selector, node) ?
			 node :
			 closest(selector, node.parentNode, root) ;
	}

	function next(node) {
		return node.nextElementSibling || undefined;
	}

	function previous(node) {
		return node.previousElementSibling || undefined;
	}


	// DOM Mutation

	function appendChild(target, node) {
		target.appendChild(node);

		// Use this fn as a reducer
		return target;
	}

	function append(target, node) {
		if (node instanceof Node || node instanceof SVGElement) {
			appendChild(target, node);
			return node;
		}

		if (!node.length) { return; }

		var array = node.reduce ? node : A.slice.call(node) ;
		array.reduce(appendChild, target);

		return node;
	}

	function empty(node) {
		while (node.lastChild) { node.removeChild(node.lastChild); }
	}

	function removeNode(node) {
		node.parentNode && node.parentNode.removeChild(node);
	}

	function remove(node) {
		if (node instanceof Node || node instanceof SVGElement) {
			removeNode(node);
		}
		else {
			A.forEach.call(node, removeNode);
		}
	}

	function before(target, node) {
		target.parentNode && target.parentNode.insertBefore(node, target);
	}

	function after(target, node) {
		target.parentNode && target.parentNode.insertBefore(node, target.nextSibling);
	}

	function replace(target, node) {
		before(target, node);
		remove(target);
		return target;
	}


	// CSS

	var styleParsers = {
		"transform:translateX": function(node) {
			var matrix = style('transform', node);
			if (!matrix || matrix === "none") { return 0; }
			var values = valuesFromCssFn(matrix);
			return parseFloat(values[4]);
		},

		"transform:translateY": function(node) {
			var matrix = style('transform', node);
			if (!matrix || matrix === "none") { return 0; }
			var values = valuesFromCssFn(matrix);
			return parseFloat(values[5]);
		},

		"transform:scale": function(node) {
			var matrix = style('transform', node);
			if (!matrix || matrix === "none") { return 0; }
			var values = valuesFromCssFn(matrix);
			var a = parseFloat(values[0]);
			var b = parseFloat(values[1]);
			return Math.sqrt(a * a + b * b);
		},

		"transform:rotate": function(node) {
			var matrix = style('transform', node);
			if (!matrix || matrix === "none") { return 0; }
			var values = valuesFromCssFn(matrix);
			var a = parseFloat(values[0]);
			var b = parseFloat(values[1]);
			return Math.atan2(b, a);
		}
	};

	var prefix = (function(prefixes) {
		var node = document.createElement('div');
		var cache = {};

		function testPrefix(prop) {
			if (prop in node.style) { return prop; }

			var upper = prop.charAt(0).toUpperCase() + prop.slice(1);
			var l = prefixes.length;
			var prefixProp;

			while (l--) {
				prefixProp = prefixes[l] + upper;

				if (prefixProp in node.style) {
					return prefixProp;
				}
			}

			return false;
		}

		return function prefix(prop){
			return cache[prop] || (cache[prop] = testPrefix(prop));
		};
	})(['Khtml','O','Moz','Webkit','ms']);

	function valuesFromCssFn(string) {
		return string.split('(')[1].split(')')[0].split(/\s*,\s*/);
	}

	function style(name, node) {
		return window.getComputedStyle ?
			window
			.getComputedStyle(node, null)
			.getPropertyValue(name) :
			0 ;
	}

	function viewportLeft(elem) {
		var body = document.body;
		var html = document.documentElement;
		var box  = elem.getBoundingClientRect();
		var scrollLeft = window.pageXOffset || html.scrollLeft || body.scrollLeft;
		var clientLeft = html.clientLeft || body.clientLeft || 0;
		return (box.left + scrollLeft - clientLeft);
	}

	function viewportTop(elem) {
		var body = document.body;
		var html = document.documentElement;
		var box  = elem.getBoundingClientRect();
		var scrollTop = window.pageYOffset || html.scrollTop || body.scrollTop;
		var clientTop = html.clientTop || body.clientTop || 0;
		return box.top +  scrollTop - clientTop;
	}

/*
function getPositionParent(node) {
	var offsetParent = node.offsetParent;

	while (offsetParent && style("position", offsetParent) === "static") {
		offsetParent = offsetParent.offsetParent;
	}

	return offsetParent || document.documentElement;
}

	function offset(node) {
		// Pinched from jQuery.offset...
	    // Return zeros for disconnected and hidden (display: none) elements
	    // Support: IE <=11 only
	    // Running getBoundingClientRect on a
	    // disconnected node in IE throws an error
	    if (!node.getClientRects().length) { return [0, 0]; }

	    var rect     = node.getBoundingClientRect();
	    var document = node.ownerDocument;
	    var window   = document.defaultView;
	    var docElem  = document.documentElement;

	    return [
			 rect.left + window.pageXOffset - docElem.clientLeft,
			 rect.top  + window.pageYOffset - docElem.clientTop
	    ];
	}

	function position(node) {
		var rect;

	    // Fixed elements are offset from window (parentOffset = {top:0, left: 0},
	    // because it is its only offset parent
	    if (style('position', node) === 'fixed') {
	        rect = node.getBoundingClientRect();

	        return [
		        rect.left - (parseFloat(style("marginLeft", node)) || 0),
		        rect.top  - (parseFloat(style("marginTop", node)) || 0)
	        ];
	    }

		// Get *real* offsetParent
		var parent = getPositionParent(node);

		// Get correct offsets
		var nodeOffset = offset(node);
		var parentOffset = tag(parent) !== "html" ? [0, 0] : offset(parent);

		// Add parent borders
		parentOffset[0] += parseFloat(style("borderLeftWidth", parent)) || 0;
		parentOffset[1] += parseFloat(style("borderTopWidth", parent)) || 0;

	    // Subtract parent offsets and element margins
		nodeOffset[0] -= (parentOffset[0] + (parseFloat(style("marginLeft", node)) || 0)),
		nodeOffset[1] -= (parentOffset[1] + (parseFloat(style("marginTop", node)) || 0))

		return nodeOffset;
	}
*/

	function windowBox() {
		return {
			left:   0,
			top:    0,
			width:  window.innerWidth,
			height: window.innerHeight
		};
	}

	function box(node) {
		return node === window ?
			windowBox() :
			node.getClientRects()[0] ;
	}

	function bounds(node) {
		return node.getBoundingClientRect();
	}

	function position(node) {
		var rect = box(node);
		return [rect.left, rect.top];
	}

	//function offset(node) {
	//	var rect = box(node);
	//	var scrollX = window.scrollX === undefined ? window.pageXOffset : window.scrollX ;
	//	var scrollY = window.scrollY === undefined ? window.pageYOffset : window.scrollY ;
	//	return [rect.left + scrollX, rect.top + scrollY];
	//}

	function offset(node1, node2) {
		var box1 = box(node1);
		var box2 = box(node2);
		return [box2.left - box1.left, box2.top - box1.top];
	}


	// DOM Events

	var eventOptions = { bubbles: true };

	var eventsSymbol = Symbol('events');

	var keyCodes = {
		8:  'backspace',
		9:  'tab',
		13: 'enter',
		16: 'shift',
		17: 'ctrl',
		18: 'alt',
		27: 'escape',
		32: 'space',
		33: 'pageup',
		34: 'pagedown',
		35: 'pageright',
		36: 'pageleft',
		37: 'left',
		38: 'up',
		39: 'right',
		40: 'down',
		46: 'delete',
		48: '0',
		49: '1',
		50: '2',
		51: '3',
		52: '4',
		53: '5',
		54: '6',
		55: '7',
		56: '8',
		57: '9',
		65: 'a',
		66: 'b',
		67: 'c',
		68: 'd',
		69: 'e',
		70: 'f',
		71: 'g',
		72: 'h',
		73: 'i',
		74: 'j',
		75: 'k',
		76: 'l',
		77: 'm',
		78: 'n',
		79: 'o',
		80: 'p',
		81: 'q',
		82: 'r',
		83: 's',
		84: 't',
		85: 'u',
		86: 'v',
		87: 'w',
		88: 'x',
		89: 'y',
		90: 'z',
		// Mac Chrome left CMD
		91: 'cmd',
		// Mac Chrome right CMD
		93: 'cmd',
		186: ';',
		187: '=',
		188: ',',
		189: '-',
		190: '.',
		191: '/',
		219: '[',
		220: '\\',
		221: ']',
		222: '\'',
		// Mac FF
		224: 'cmd'
	};

	var untrapFocus = noop;

	function Event(type, properties) {
		var options = assign({}, eventOptions, properties);
		var event   = new CustomEvent(type, options);

		if (properties) {
			delete properties.detail;
			assign(event, properties);
		}

		return event;
	}

	function preventDefault(e) {
		e.preventDefault();
	}

	function isPrimaryButton(e) {
		// Ignore mousedowns on any button other than the left (or primary)
		// mouse button, or when a modifier key is pressed.
		return (e.which === 1 && !e.ctrlKey && !e.altKey && !e.shiftKey);
	}

	function toKey(e) {
		return keyCodes[e.keyCode];
	}

	function on(node, types, fn, data) {
		types = types.split(rspaces);

		var events  = node[eventsSymbol] || (node[eventsSymbol] = {});
		var handler = bindTail(fn, data);
		var handlers, type;

		var n = -1;
		while (n++ < types.length) {
			type = types[n];
			handlers = events[type] || (events[type] = []);
			handlers.push([fn, handler]);
			node.addEventListener(type, handler);
		}

		return node;
	}

	function off(node, types, fn) {
		types = types.split(rspaces);

		var events = node[eventsSymbol];
		var type, handlers, i;

		if (!events) { return node; }

		var n = -1;
		while (n++ < types.length) {
			type = types[n];
			handlers = events[type];
			if (!handlers) { continue; }
			i = handlers.length;
			while (i--) {
				if (handlers[i][0] === fn) {
					node.removeEventListener(type, handlers[i][1]);
					handlers.splice(i, 1);
				}
			}
		}

		return node;
	}

	function trigger(node, type, properties) {
		// Don't cache events. It prevents you from triggering an event of a
		// given type from inside the handler of another event of that type.
		var event = Event(type, properties);
		node.dispatchEvent(event);
	}

	function end(e, fn) {
		off(e.currentTarget, features.transitionend, end);
		fn(e.timeStamp);
	}

	function requestEvent(type, fn, node) {
		if (type === 'transitionend') {
			if (!features.transition) {
				fn(performance.now());
				return;
			}

			type = features.transitionend;
		}

		on(node, type, end, fn);
	}

	function delegate(selector, fn) {
		// Create an event handler that looks up the ancestor tree
		// to find selector.
		return function handler(e) {
			var node = closest(selector, e.target, e.currentTarget);
			if (!node) { return; }
			e.delegateTarget = node;
			fn(e, node);
			e.delegateTarget = undefined;
		};
	}

	function event(types, node) {
		types = types.split(rspaces);

		return new Stream(function setup(notify, stop) {
			var buffer = [];

			function update(value) {
				buffer.push(value);
				notify('push');
			}

			types.forEach(function(type) {
				node.addEventListener(type, update);
			});

			return {
				shift: function() {
					return buffer.shift();
				},

				stop: function stop() {
					types.forEach(function(type) {
						node.removeEventListener(type, update);
					});

					stop(buffer.length);
				}
			};
		});
	}

	function trapFocus(node) {
		// Trap focus as described by Nikolas Zachas:
		// http://www.nczonline.net/blog/2013/02/12/making-an-accessible-dialog-box/

		// If there is an existing focus trap, remove it
		untrapFocus();

		// Cache the currently focused node
		var focusNode = document.activeElement || document.body;

		function resetFocus() {
			var focusable = dom.query('[tabindex], a, input, textarea, button', node)[0];
			if (focusable) { focusable.focus(); }
		}

		function preventFocus(e) {
			if (node.contains(e.target)) { return; }

			// If trying to focus outside node, set the focus back
			// to the first thing inside.
			resetFocus();
			e.preventDefault();
			e.stopPropagation();
		}

		// Prevent focus in capture phase
		document.addEventListener("focus", preventFocus, true);

		// Move focus into node
		requestTick(resetFocus);

		return untrapFocus = function() {
			untrapFocus = noop;
			document.removeEventListener('focus', preventFocus, true);

			// Set focus back to the thing that was last focused when the
			// dialog was opened.
			requestTick(function() {
				focusNode.focus();
			});
		};
	}


	// DOM Fragments and Templates

	var mimetypes = {
		xml:  'application/xml',
		html: 'text/html',
		svg:  'image/svg+xml'
	};

	function fragmentFromChildren(node) {
		if (node.domFragmentFromChildren) {
			return node.domFragmentFromChildren;
		}

		var fragment = create('fragment');
		node.domFragmentFromChildren = fragment;
		append(fragment, node.childNodes);
		return fragment;
	}

	function fragmentFromHTML(html, tag) {
		var node = document.createElement(tag || 'div');
		node.innerHTML = html;
		return fragmentFromChildren(node);
	}

	function fragmentFromTemplate(node) {
		// A template tag has a content property that gives us a document
		// fragment. If that doesn't exist we must make a document fragment.
		return node.content || fragmentFromChildren(node);
	}

	function fragmentFromId(id) {
		var node = document.getElementById(id);

		if (!node) { throw new Error('DOM: element id="' + id + '" is not in the DOM.') }

		var t = tag(node);

		// In browsers where templates are not inert their content can clash
		// with content in the DOM - ids, for example. Remove the template as
		// a precaution.
		if (t === 'template' && !features.template) {
			remove(node);
		}

		return t === 'template' ? fragmentFromTemplate(node) :
			t === 'script' ? fragmentFromHTML(node.innerHTML, attribute('data-parent-tag', node)) :
			fragmentFromChildren(node) ;
	}

	function parse(type, string) {
		var mimetype = mimetypes[type];
		var xml;

		// From jQuery source...
		try {
			xml = (new window.DOMParser()).parseFromString(string, mimetype);
		} catch (e) {
			xml = undefined;
		}

		if (!xml || xml.getElementsByTagName("parsererror").length) {
			throw new Error("dom: Invalid XML: " + string);
		}

		return xml;
	}

	var escape = (function() {
		var pre  = document.createElement('pre');
		var text = document.createTextNode('');

		pre.appendChild(text);

		return function escape(value) {
			text.textContent = value;
			return pre.innerHTML;
		};
	})();


	// Units

	var rem = /(\d*\.?\d+)r?em/;
	//var rpercent = /(\d*\.?\d+)%/;

	var fontSize;

	var toPx = overload(toType, {
		'number': id,

		'string': function(string) {
			var data, n;

			data = rem.exec(string);
			if (data) {
				n = parseFloat(data[1]);
				return getFontSize() * n;
			}

			//data = rpercent.exec(string);
			//if (data) {
			//	n = parseFloat(data[1]) / 100;
			//	return width * n;
			//}

			throw new Error('dom: ' + string + '\' cannot be parsed as rem, em or %.');
		}
	});

	var toRem = overload(toType, {
		'number': function(n) {
			return n / getFontSize();
		}
	});

	function getFontSize() {
		return fontSize ||
			(fontSize = parseFloat(style("font-size", document.documentElement), 10));
	}


	// Animation and scrolling

	function transition(duration, fn) {
		var t0 = performance.now();

		function frame(t1) {
			// Progress from 0-1
			var progress = (t1 - t0) / (duration * 1000);

			if (progress < 1) {
				if (progress > 0) {
					fn(progress);
				}
				id = requestAnimationFrame(frame);
			}
			else {
				fn(1);
			}
		}

		var id = requestAnimationFrame(frame);

		return function cancel() {
			cancelAnimationFrame(id);
		};
	}

	function animate(duration, transform, name, object, value) {
		return transition(
			duration,
			pipe(transform, denormalise(object[name], value), set(name, object))
		);
	}

	function animateScroll(value) {
		return animate(0.6, pow(2), 'scrollTop', dom.viewport, toPx(value));
	}

	function scrollRatio(node) {
		return node.scrollTop / (node.scrollHeight - node.clientHeight);
	}

	function disableScroll(node) {
		node = node || document.documentElement;

		var scrollLeft = node.scrollLeft;
		var scrollTop  = node.scrollTop;

		// Remove scrollbars from the documentElement
		//docElem.css({ overflow: 'hidden' });
		node.style.overflow = 'hidden';

		// FF has a nasty habit of linking the scroll parameters
		// of document with the documentElement, causing the page
		// to jump when overflow is hidden on the documentElement.
		// Reset the scroll position.
		if (scrollTop)  { node.scrollTop = scrollTop; }
		if (scrollLeft) { node.scrollLeft = scrollLeft; }

		// Disable gestures on touch devices
		//add(document, 'touchmove', preventDefaultOutside, layer);
	}

	function enableScroll(node) {
		node = node || document.documentElement;

		var scrollLeft = node.scrollLeft;
		var scrollTop  = node.scrollTop;

		// Put scrollbars back onto docElem
		node.style.overflow = '';

		// FF fix. Reset the scroll position.
		if (scrollTop) { node.scrollTop = scrollTop; }
		if (scrollLeft) { node.scrollLeft = scrollLeft; }

		// Enable gestures on touch devices
		//remove(document, 'touchmove', preventDefaultOutside);
	}


	// dom

	function dom(selector) {
		return query(selector, document);
	}

	var ready = new Promise(function(accept, reject) {
		function handle() {
			document.removeEventListener('DOMContentLoaded', handle);
			window.removeEventListener('load', handle);
			accept();
		}

		document.addEventListener('DOMContentLoaded', handle);
		window.addEventListener('load', handle);
	});

	assign(dom, {

		// DOM lifecycle

		ready:    ready.then.bind(ready),

		// DOM traversal

		get: function get(id) {
			return document.getElementById(id) || undefined;
		},

		find:     Fn.deprecate(function get(id) {
			return document.getElementById(id) || undefined;
		}, 'dom.find(id) is now dom.get(id)'),

		query:    curry(query,    true),
		closest:  curry(closest,  true),
		contains: curry(contains, true),
		matches:  curry(matches,  true),
		children: children,
		next:     next,
		previous: previous,

		// DOM mutation

		assign:   curry(assignAttributes,  true),
		create:   create,
		clone:    clone,
		identify: identify,
		append:   curry(append,  true),
		before:   curry(before,  true),
		after:    curry(after,   true),
		replace:  curry(replace, true),
		empty:    empty,
		remove:   remove,

		// DOM inspection

		isElementNode:  isElementNode,
		isTextNode:     isTextNode,
		isCommentNode:  isCommentNode,
		isFragmentNode: isFragmentNode,
		isInternalLink: isInternalLink,

		type:        type,
		tag:         tag,
		attribute:   curry(attribute, true),
		classes:     classes,
		addClass:    curry(addClass,    true),
		removeClass: curry(removeClass, true),
		flashClass:  curry(flashClass,  true),

		box:         box,
		bounds:      bounds,
		rectangle:   deprecate(box, 'dom.rectangle(node) now dom.box(node)'),

		offset:      curry(offset, true),
		position:    position,

		prefix:      prefix,
		style: curry(function(name, node) {
			// If name corresponds to a custom property name in styleParsers...
			if (styleParsers[name]) { return styleParsers[name](node); }

			var value = style(name, node);

			// Pixel values are converted to number type
			return typeof value === 'string' && rpx.test(value) ?
				parseFloat(value) :
				value ;
		}, true),

		toPx:           toPx,
		toRem:          toRem,
		viewportLeft:   viewportLeft,
		viewportTop:    viewportTop,

		// DOM fragments and templates

		fragmentFromTemplate: fragmentFromTemplate,
		fragmentFromChildren: fragmentFromChildren,
		fragmentFromHTML:     fragmentFromHTML,
		fragmentFromId:       fragmentFromId,
		escape:               escape,
		parse:                curry(parse),

		// DOM events

		Event:           Event,
		delegate:        delegate,
		isPrimaryButton: isPrimaryButton,
		preventDefault:  preventDefault,
		toKey:           toKey,
		trapFocus:       trapFocus,
		trap:            Fn.deprecate(trapFocus, 'dom.trap() is now dom.trapFocus()'),

		events: {
			on:      on,
			off:     off,
			trigger: trigger
		},

		on:     Fn.deprecate(curry(event, true), 'dom.on() is now dom.event()'),

		trigger: curry(function(type, node) {
			trigger(node, type);
			return node;
		}, true),

		event: curry(event, true),

		// DOM animation adn scrolling

		// transition(duration, fn)
		//
		// duration  - duration seconds
		// fn        - callback that is called with a float representing
		//             progress in the range 0-1

		transition: curry(transition, true),
		schedule:   deprecate(transition, 'dom: .schedule() is now .transition()'),

		// animate(duration, transform, value, name, object)
		//
		// duration  - in seconds
		// transform - function that maps x (0-1) to y (0-1)
		// name      - name of property to animate
		// object    - object to animate
		// value     - target value

		animate: curry(animate, true),

		// animateScroll(n)
		//
		// Animate scrollTop of scrollingElement to n (in px)

		animateScroll: animateScroll,
		scrollTo: deprecate(animateScroll, 'scrollTo(px, node) renamed to animateScroll(px)'),

		// scrollRatio(node)
		//
		// Returns scrollTop as ratio of scrollHeight

		scrollRatio: scrollRatio,

		// disableScroll(node)
		//
		// Disables scrolling without causing node's content to jump

		disableScroll: disableScroll,

		// enableScroll(node)
		//
		// Enables scrolling without causing node's content to jump

		enableScroll: enableScroll,

		// requestEvent(type, fn, node)

		requestEvent: requestEvent,

		requestFrame: requestAnimationFrame.bind(null),

		requestFrameN: curry(deprecate(function requestFrameN(n, fn) {
			(function frame() {
				return requestAnimationFrame(--n ? frame : fn);
			}());
		}, 'requestFrameN() will be removed soon'), true),

		// Features

		features: features,

		// Safe visible area

		safe: define({
			left: 0
		}, {
			right:  { get: function() { return window.innerWidth; }, enumerable: true, configurable: true },
			top:    { get: function() { return style('padding-top', document.body); }, enumerable: true, configurable: true },
			bottom: { get: function() { return window.innerHeight; }, enumerable: true, configurable: true }
		})
	});

	define(dom, {
		// Element shortcuts
		root: { value: document.documentElement, enumerable: true },
		head: { value: document.head, enumerable: true },
		body: { get: function() { return document.body; }, enumerable: true	},
		viewport: { get: function() { return document.scrollingElement; }, enumerable: true }
	});


	// Export

	window.dom = dom;
})(this);
(function(window) {
	"use strict";

	var debug     = false;

	var Fn        = window.Fn;
	var dom       = window.dom;
	var classes   = dom.classes;
	var tag       = dom.tag;
	var on        = dom.events.on;
	var off       = dom.events.off;
	var trigger   = dom.events.trigger;
	var isDefined = Fn.isDefined;
	var overload  = Fn.overload;

	var activeClass = "active";
	var onClass   = "on";
	var location  = window.location;
	var id        = location.hash;
	var settings  = { cache: true };

	var store     = new WeakMap();


	function findButtons(id) {
		return dom
		.query('[href$="#' + id + '"]', dom.body)
		.filter(overload(tag, {
			a:       dom.isInternalLink,
			default: function() { return true; }
		}))
		.concat(dom.query('[data-href="#' + id + '"]', document));
	}

	function getData(node) {
		var data = store.get(node);
		if (!data) {
			data = {};
			store.set(node, data);
		}
		return data;
	}

	function cacheData(target) {
		var data = getData(target);
		var id   = target.id;

		if (!data.node) { data.node = target; }
		if (!data.buttons) { data.buttons = settings.cache && id && findButtons(id); }

		return data;
	}

	function getButtons(data) {
		return (settings.cache && data.buttons) || (data.node.id && findButtons(data.node.id));
	}

	// Listen to activate events

	function defaultActivate() {
		var data = this.data || cacheData(this.target);
		var buttons;

		// Don't do anything if elem is already active
		if (data.active) { return; }
		data.active = true;
		this.preventDefault();

		if (debug) { console.log('[activate] default | target:', this.target.id, 'data:', data); }

		classes(data.node).add(activeClass);
		buttons = getButtons(data);

		if (buttons) {
			buttons.forEach(function(node) {
				dom.classes(node).add(onClass);
			});
		}
	}

	function defaultDeactivate() {
		var data = this.data || cacheData(this.target);
		var buttons;

		// Don't do anything if elem is already inactive
		if (!data.active) { return; }
		data.active = false;
		this.preventDefault();

		if (debug) { console.log('[deactivate] default | target:', this.target.id, 'data:', data); }

		classes(data.node).remove(activeClass);
		buttons = getButtons(data);

		if (buttons) {
			buttons.forEach(function(node) {
				dom.classes(node).remove(onClass);
			});
		}
	}

	on(document, 'dom-activate', function(e) {
		if (e.defaultPrevented) { return; }

		var data = cacheData(e.target);

		// Don't do anything if elem is already active
		if (data.active) {
			e.preventDefault();
			return;
		}

		e.data    = data;
		e.default = defaultActivate;
	});

	on(document, 'dom-deactivate', function(e) {
		if (e.defaultPrevented) { return; }

		var data = cacheData(e.target);

		// Don't do anything if elem is already inactive
		if (!data.active) {
			e.preventDefault();
			return;
		}

		e.data    = data;
		e.default = defaultDeactivate;
	});


	// Listen to clicks

	var triggerActivate = dom.trigger('dom-activate');

	var nodeCache = {};

	var dialogs = {};

	var targets = {
		dialog: function(e) {
			var href = e.delegateTarget.getAttribute('data-href') || e.delegateTarget.hash || e.delegateTarget.href;

			//Todo: more reliable way of getting id from a hash ref
			var id = href.substring(1);
			var fragment;

//			if (!id) { return loadResource(e, href); }

//			if (parts = /([\w-]+)\/([\w-]+)/.exec(id)) {
//				id = parts[1];
//			}

			var node = nodeCache[id] || (nodeCache[id] = document.getElementById(id));

//			if (!node) { return loadResource(e, href); }

			e.preventDefault();

			// If the node is html hidden inside a text/html script tag,
			// extract the html.
			if (node.getAttribute && node.getAttribute('type') === 'text/html') {
				// Todo: trim whitespace from html?
				fragment = dom.create('fragment', node.innerHTML);
			}

			// If it's a template...
			if (node.tagName && node.tagName.toLowerCase() === 'template') {
				// If it is not inert (like in IE), remove it from the DOM to
				// stop ids in it clashing with ids in the rendered result.
				if (!node.content) { dom.remove(node); }
				fragment = dom.fragmentFromContent(node);
			}

			var dialog = dialogs[id] || (dialogs[id] = createDialog(fragment));
			trigger(dialog, 'dom-activate');
		}
	};

//	var rImage   = /\.(?:png|jpeg|jpg|gif|PNG|JPEG|JPG|GIF)$/;
//	var rYouTube = /youtube\.com/;

	function createDialog(content) {
		var layer = dom.create('div', { class: 'dialog-layer layer' });
		var dialog = dom.create('div', { class: 'dialog popable' });
		var button = dom.create('button', { class: 'close-thumb thumb' });

		dom.append(dialog, content);
		dom.append(layer, dialog);
		dom.append(layer, button);
		dom.append(document.body, layer);

		return dialog;
	}

//	function loadResource(e, href) {
//		var link = e.currentTarget;
//		var path = link.pathname;
//		var node, elem, dialog;
//
//		if (rImage.test(link.pathname)) {
//			e.preventDefault();
//			img = new Image();
//			dialog = createDialog();
//			var classes = dom.classes(dialog);
//			classes.add('loading');
//			dom.append(dialog, img);
//			on(img, 'load', function() {
//				classes.remove('loading');
//			});
//			img.src = href;
//			return;
//		}
//
//		if (rYouTube.test(link.hostname)) {
//			e.preventDefault();
//
//			// We don't need a loading indicator because youtube comes with
//			// it's own.
//			elem = dom.create('iframe', {
//				src:             href,
//				class:           "youtube_iframe",
//				width:           "560",
//				height:          "315",
//				frameborder:     "0",
//				allowfullscreen: true
//			});
//
//			node = elem[0];
//			elem.dialog('lightbox');
//			return;
//		}
//	}

	function preventClick(e) {
		// Prevent the click that follows the mousedown. The preventDefault
		// handler unbinds itself as soon as the click is heard.
		if (e.type === 'mousedown') {
			on(e.currentTarget, 'click', function prevent(e) {
				off(e.currentTarget, 'click', prevent);
				e.preventDefault();
			});
		}
	}

	function isIgnorable(e) {
		// Default is prevented indicates that this link has already
		// been handled. Save ourselves the overhead of further handling.
		if (e.defaultPrevented) { return true; }

		// Ignore mousedowns on any button other than the left (or primary)
		// mouse button, or when a modifier key is pressed.
		if (!dom.isPrimaryButton(e)) { return true; }

		// Ignore key presses other than the enter key
		if ((e.type === 'keydown' || e.type === 'keyup') && e.keyCode !== 13) { return true; }
	}

	function activate(e, node) {
		e.preventDefault();

		if (e.type === 'mousedown') {
			preventClick(e);
		}

		//if (data.active === undefined ?
		//		data.bolt.elem.hasClass('active') :
		//		data.active ) {
		//	return;
		//}

		trigger(node, 'dom-activate', { relatedTarget: e.currentTarget });
	}

	function getHash(node) {
		return (isDefined(node.hash) ?
			node.hash :
			node.getAttribute('href')
		).substring(1);
	}

	function activateId(e, id) {
		// Does it point to a node?
		var node = document.getElementById(id);
		if (!node) { return; }

		// Is the node popable, switchable or toggleable?
		var classes = dom.classes(node);
		if (classes.contains('popable') ||
			classes.contains('switchable') ||
			classes.contains('toggleable') ||
			classes.contains('focusable') ||
			classes.contains('removeable') ||
			classes.contains('locateable')) {
			activate(e, node);
		}
		// A bit of a fudge, but smooth scrolling is so project-dependent it is
		// hard to design a consistent way of doing it. The function
		// dom.activateOther() is an optional hook that allows otherwise
		// inactivateable things to get some action.
		else if (dom.activateOther) {
			dom.activateOther(node);
		}
	}

	function activateHref(e) {
		if (isIgnorable(e)) { return; }
		if (e.delegateTarget.hostname && !dom.isInternalLink(e.delegateTarget)) { return; }

		// Does it point to an id?
		var id = getHash(e.delegateTarget);
		if (!id) { return; }

		activateId(e, id);
	}

	function activateTarget(e) {
		var target = e.delegateTarget.target;

		if (isIgnorable(e)) { return; }

		// If the target is not listed, ignore
		if (!targets[target]) { return; }
		return targets[target](e);
	}

	// Clicks on buttons toggle activate on their hash
	on(document, 'click', dom.delegate('[href]', activateHref));

	// Clicks on buttons toggle activate on their targets
	on(document, 'click', dom.delegate('a[target]', activateTarget));

	// Document setup
	dom.ready(function() {
		// Setup all things that should start out active
		dom('.' + activeClass).forEach(triggerActivate);

		// Activate the node that corresponds to the hashref in
		// location.hash, checking if it's an alphanumeric id selector
		// (not a hash bang)
		if (!id || !(/^#\S+$/.test(id))) { return; }

		// Catch errors, as id may nonetheless be an invalid selector
		try { dom(id).forEach(triggerActivate); }
		catch(e) {}
	});
})(this);
(function(window) {
	"use strict";

	var Fn     = window.Fn;
	var Stream = window.Stream;
	var dom    = window.dom;


	// Number of pixels a pressed pointer travels before movestart
	// event is fired.
	var threshold = 8;

	var ignoreTags = {
			textarea: true,
			input: true,
			select: true,
			button: true
		};

	var mouseevents = {
		move:   'mousemove',
		cancel: 'mouseup dragstart',
		end:    'mouseup'
	};

	var touchevents = {
		move:   'touchmove',
		cancel: 'touchend',
		end:    'touchend'
	};


	// Functions

	var requestTick     = Fn.requestTick;
	var on              = dom.events.on;
	var off             = dom.events.off;
	var trigger         = dom.events.trigger;
	var isPrimaryButton = dom.isPrimaryButton;
	var preventDefault  = dom.preventDefault;

	function isIgnoreTag(e) {
		var tag = e.target.tagName;
		return tag && !!ignoreTags[tag.toLowerCase()];
	}

	function identifiedTouch(touchList, id) {
		var i, l;

		if (touchList.identifiedTouch) {
			return touchList.identifiedTouch(id);
		}

		// touchList.identifiedTouch() does not exist in
		// webkit yet… we must do the search ourselves...

		i = -1;
		l = touchList.length;

		while (++i < l) {
			if (touchList[i].identifier === id) {
				return touchList[i];
			}
		}
	}

	function changedTouch(e, data) {
		var touch = identifiedTouch(e.changedTouches, data.identifier);

		// This isn't the touch you're looking for.
		if (!touch) { return; }

		// Chrome Android (at least) includes touches that have not
		// changed in e.changedTouches. That's a bit annoying. Check
		// that this touch has changed.
		if (touch.pageX === data.pageX && touch.pageY === data.pageY) { return; }

		return touch;
	}


	// Handlers that decide when the first movestart is triggered

	function mousedown(e){
		// Ignore non-primary buttons
		if (!isPrimaryButton(e)) { return; }

		// Ignore form and interactive elements
		if (isIgnoreTag(e)) { return; }

		on(document, mouseevents.move, mousemove, [e]);
		on(document, mouseevents.cancel, mouseend, [e]);
	}

	function mousemove(e, events){
		events.push(e);
		checkThreshold(e, events, e, removeMouse);
	}

	function mouseend(e, data) {
		removeMouse();
	}

	function removeMouse() {
		off(document, mouseevents.move, mousemove);
		off(document, mouseevents.cancel, mouseend);
	}

	function touchstart(e) {
		// Don't get in the way of interaction with form elements
		if (ignoreTags[e.target.tagName.toLowerCase()]) { return; }

		var touch = e.changedTouches[0];

		// iOS live updates the touch objects whereas Android gives us copies.
		// That means we can't trust the touchstart object to stay the same,
		// so we must copy the data. This object acts as a template for
		// movestart, move and moveend event objects.
		var event = {
			target:     touch.target,
			pageX:      touch.pageX,
			pageY:      touch.pageY,
			identifier: touch.identifier,

			// The only way to make handlers individually unbindable is by
			// making them unique. This is a crap place to put them, but it
			// will work.
			touchmove:  function() { touchmove.apply(this, arguments); },
			touchend:   function() { touchend.apply(this, arguments); }
		};

		on(document, touchevents.move, event.touchmove, [event]);
		on(document, touchevents.cancel, event.touchend, [event]);
	}

	function touchmove(e, events) {
		var touch = changedTouch(e, events[0]);
		if (!touch) { return; }
		checkThreshold(e, events, touch, removeTouch);
	}

	function touchend(e, events) {
		var touch = identifiedTouch(e.changedTouches, events[0].identifier);
		if (!touch) { return; }
		removeTouch(events);
	}

	function removeTouch(events) {
		off(document, touchevents.move, events[0].touchmove);
		off(document, touchevents.cancel, events[0].touchend);
	}

	function checkThreshold(e, events, touch, fn) {
		var distX = touch.pageX - events[0].pageX;
		var distY = touch.pageY - events[0].pageY;

		// Do nothing if the threshold has not been crossed.
		if ((distX * distX) + (distY * distY) < (threshold * threshold)) { return; }

		var e0   = events[0];
		var node = events[0].target;
		var stream;

		// Unbind handlers that tracked the touch or mouse up till now.
		fn(events);

		// Trigger the touch event
		trigger(events[0].target, 'dom-touch', {
			pageX:  e0.pageX,
			pageY:  e0.pageY,
			detail: function() {
				if (!stream) {
					stream = TouchStream(node, events);
				}

				//return stream.clone();
				return stream;
			}
		});
	}


	// Handlers that control what happens following a movestart

	function activeMousemove(e, data) {
		data.touch = e;
		data.timeStamp = e.timeStamp;
		data.stream.push(e);
	}

	function activeMouseend(e, data) {
		var target = data.target;

		removeActiveMouse();
		data.stream.stop();
	}

	function removeActiveMouse() {
		off(document, mouseevents.move, activeMousemove);
		off(document, mouseevents.end, activeMouseend);
	}

	function activeTouchmove(e, data) {
		var touch = changedTouch(e, data);

		if (!touch) { return; }

		// Stop the interface from gesturing
		e.preventDefault();

		data.touch = touch;
		data.timeStamp = e.timeStamp;
		data.stream.push(touch);
	}

	function activeTouchend(e, data) {
		var touch  = identifiedTouch(e.changedTouches, data.identifier);

		// This isn't the touch you're looking for.
		if (!touch) { return; }

		removeActiveTouch(data);
		data.stream.stop();
	}

	function removeActiveTouch(data) {
		off(document, touchevents.move, data.activeTouchmove);
		off(document, touchevents.end, data.activeTouchend);
	}

	function TouchStream(node, events) {
		var stream = Stream.from(events).map(function(e) {
			return {
				x:    e.pageX - events[0].pageX,
				y:    e.pageY - events[0].pageY,
				time: (e.timeStamp - events[0].timeStamp) / 1000
			};
		});

		var data = {
			stream:     stream,
			target:     node,
			touch:      undefined,
			identifier: events[0].identifier
		};

		if (data.identifier === undefined) {
			// We're dealing with a mouse event.
			// Stop clicks from propagating during a move
			on(node, 'click', preventDefault);
			on(document, mouseevents.move, activeMousemove, data);
			on(document, mouseevents.cancel, activeMouseend, data);
		}
		else {
			// In order to unbind correct handlers they have to be unique
			data.activeTouchmove = function(e, data) { activeTouchmove(e, data); };
			data.activeTouchend  = function(e, data) { activeTouchend(e, data); };

			// We're dealing with a touch.
			on(document, touchevents.move, data.activeTouchmove, data);
			on(document, touchevents.end, data.activeTouchend, data);
		}

		stream.then(function() {
			// Unbind the click suppressor, waiting until after mouseup
			// has been handled. I don't know why it has to be any longer than
			// a tick, but it does, in Chrome at least.
			setTimeout(function() {
				off(node, 'click', preventDefault);
			}, 200);
		});

		return stream;
	}

	on(document, 'mousedown', mousedown);
	on(document, 'touchstart', touchstart);

})(this);
(function(window) {
	"use strict";

	var Fn      = window.Fn;
	var dom     = window.dom;

	var on      = dom.events.on;
	var trigger = dom.events.trigger;
	var closest = dom.closest;

//	var settings = {
//		// Ratio of distance over target finger must travel to be
//		// considered a swipe.
//		threshold: 0.4,
//		// Faster fingers can travel shorter distances to be considered
//		// swipes. 'sensitivity' controls how much. Bigger is shorter.
//		sensitivity: 6
//	};

	function touchdone(node, data) {
		data = data.shift();

		//var x = data.x;
		//var y = data.y;
		//var w = node.offsetWidth;
		//var h = node.offsetHeight;
		var polar = Fn.toPolar([data.x, data.y]);

		// Todo: check if swipe has enough velocity and distance
		//x/w > settings.threshold || e.velocityX * x/w * settings.sensitivity > 1

		trigger(node, 'dom-swipe', {
			detail:   data,
			angle:    polar[1],
			velocity: polar[0] / data.time
		});
	}

	on(document, 'dom-touch', function(e) {
		if (e.defaultPrevented) { return; }

		var node = closest('.swipeable', e.target);
		if (!node) { return; }

		var touch = e.detail();
		var data  = touch.clone().latest();

		data.then(function() {
			touchdone(node, data);
		});
	});
})(this);
// dom.popable
//
// Extends the default behaviour of events for the .tip class.

(function(window) {

	var dom     = window.dom;
	var name    = "popable";
	var trigger = dom.events.trigger;

	function activate(e) {
		// Use method detection - e.defaultPrevented is not set in time for
		// subsequent listeners on the same node
		if (!e.default) { return; }

		var node    = e.target;
		var classes = dom.classes(node);
		if (!classes.contains(name)) { return; }

		// Make user actions outside node deactivat the node

		requestAnimationFrame(function() {
			function click(e) {
				if (node.contains(e.target) || node === e.target) { return; }
				trigger(node, 'dom-deactivate');
			}

			function deactivate(e) {
				if (node !== e.target) { return; }
				if (e.defaultPrevented) { return; }
				document.removeEventListener('click', click);
				document.removeEventListener('dom-deactivate', deactivate);
			}

			document.addEventListener('click', click);
			document.addEventListener('dom-deactivate', deactivate);
		});

		e.default();
	}

	function deactivate(e) {
		if (!e.default) { return; }

		var target = e.target;
		if (!dom.classes(target).contains(name)) { return; }
		e.default();
	}

	document.addEventListener('dom-activate', activate);
	document.addEventListener('dom-deactivate', deactivate);
})(this);
// dom.toggleable

(function(window) {
	"use strict";

	var dom     = window.dom;

	// Define

	var name = 'toggleable';

	// Functions

	var on      = dom.events.on;
	var off     = dom.events.off;
	var trigger = dom.events.trigger;

	function click(e, activeTarget) {
		// A prevented default means this link has already been handled.
		if (e.defaultPrevented) { return; }
		if (!dom.isPrimaryButton(e)) { return; }

		var node = e.currentTarget;
		if (!node) { return; }

		trigger(activeTarget, 'dom-deactivate', {
			relatedTarget: e.target
		});

		e.preventDefault();
	}

	function activate(e) {
		// Use method detection - e.defaultPrevented is not set in time for
		// subsequent listeners on the same node
		if (!e.default) { return; }

		var target = e.target;
		if (!dom.classes(target).contains(name)) { return; }

		var id = dom.identify(target);

		dom('[href$="#' + id + '"]')
		.forEach(function(node) {
			on(node, 'click', click, e.target);
		});

		e.default();
	}

	function deactivate(e, data, fn) {
		if (!e.default) { return; }

		var target = e.target;
		if (!dom.classes(target).contains(name)) { return; }

		var id = dom.identify(e.target);

		dom('[href$="#' + id + '"]')
		.forEach(function(node) {
			off(node, 'click', click);
		});

		e.default();
	}

	on(document, 'dom-activate', activate);
	on(document, 'dom-deactivate', deactivate);
})(this);
// dom.switchable
//
// Extends the default behaviour of the activate and deactivate
// events with things to do when they are triggered on nodes.

(function(window) {
	"use strict";

	// Import

	var Fn      = window.Fn;
	var dom     = window.dom;

	// Define

	var name = 'switchable';
	var on   = dom.events.on;
	var triggerDeactivate = dom.trigger('dom-deactivate');

	function activate(e) {
		if (!e.default) { return; }

		var target = e.target;
		if (!dom.classes(target).contains(name)) { return; }

		var nodes = dom.query('.switchable', target.parentNode);
		var i     = nodes.indexOf(target);

		nodes.splice(i, 1);
		var active = nodes.filter(dom.matches('.active'));

		e.default();

		// Deactivate the previous active pane AFTER this pane has been
		// activated. It's important for panes who's style depends on the
		// current active pane, eg: .slide.active ~ .slide
		Fn.from(active).each(triggerDeactivate);
	}

	function deactivate(e) {
		if (!e.default) { return; }

		var target = e.target;
		if (!dom.classes(target).contains(name)) { return; }

		e.default();
	}

	on(document, 'dom-activate', activate);
	on(document, 'dom-deactivate', deactivate);
})(this);
(function(window) {
	"use strict";

	var Fn       = window.Fn;
	var last     = Fn.last;
	var dom      = window.dom;
	var children = dom.children;
	var on       = dom.events.on;
	var trigger  = dom.events.trigger;
	var closest  = dom.closest;
	var tau      = Math.PI * 2;

	var elasticDistance = 800;

	var rspaces = /\s+/;

	function elasticEase(n) {
		return Math.atan(n) / Math.PI ;
	}

	function xMinFromChildren(node) {
		var child = last(children(node).filter(dom.matches('.switchable')));

		// Get the right-most x of the last switchable child's right-most edge
		var w1 = child.offsetLeft + child.clientWidth;
		var w2 = node.parentNode.clientWidth;
		return w2 - w1;
	}

	on(document, 'dom-touch', function(e) {
		if (e.defaultPrevented) { return; }

		var node = closest('.swipeable', e.target);
		if (!node) { return; }

		var classes = dom.classes(node);
		var transform = dom.style('transform', node);

		transform = !transform || transform === 'none' ? '' : transform ;

		var x = dom.style('transform:translateX', node);

		// Elastic flags and limits
		var eMin = false;
		var eMax = false;
		var xMin = dom.attribute('data-slide-min', node);
		var xMax = dom.attribute('data-slide-max', node);

		if (!xMin && !xMax) {
			eMin = true;
			eMax = true;
			xMin = xMinFromChildren(node);
			xMax = 0;
		}
		else {
			eMin = /elastic/.test(xMin);
			eMax = /elastic/.test(xMax);
			xMin = parseFloat(xMin) || 0;
			xMax = parseFloat(xMax) || 0;
		}

		classes.add('notransition');

		var ax = x;

		// e.detail() is a stream of touch coordinates
		e.detail()
		.map(function(data) {
			ax = x + data.x;
			var tx = ax > 0 ?
					eMax ? elasticEase(ax / elasticDistance) * elasticDistance - x :
					xMax :
				ax < xMin ?
					eMin ? elasticEase((ax - xMin) / elasticDistance) * elasticDistance + xMin - x :
					xMin :
				data.x ;

			return transform + ' translate(' + tx + 'px, 0px)';
		})
		.each(function(transform) {
			node.style.transform = transform;
		})
		.then(function() {
			classes.remove('notransition');

			// Todo: Watch out, this may interfere with slides
			var xSnaps = dom.attribute('data-slide-snap', node);

			if (!xSnaps) { return; }
			xSnaps = xSnaps.split(rspaces).map(parseFloat);

			// Get closest x from list of snaps
			var tx = xSnaps.reduce(function(prev, curr) {
				return Math.abs(curr - ax) < Math.abs(prev - ax) ?
					curr : prev ;
			});

			//requestAnimationFrame(function() {
				node.style.transform = transform + ' translate(' + tx + 'px, 0px)';
			//});
		});
	});

	function transform(node, active) {
		var l1 = dom.viewportLeft(node);
		var l2 = dom.viewportLeft(active);

		// Round the translation - without rounding images and text become
		// slightly fuzzy as they are antialiased.
		var l  = Math.round(l1 - l2 - dom.style('margin-left', active));
		node.style.transform = 'translate(' + l + 'px, 0px)';
	}

	on(document, 'dom-swipe', function(e) {
		if (e.defaultPrevented) { return; }

		var node = closest('.swipeable', e.target);
		if (!node) { return; }

		var angle = Fn.wrap(0, tau, e.angle || 0);

			// If angle is rightwards
		var prop = (angle > tau * 1/8 && angle < tau * 3/8) ?
				'previousElementSibling' :
			// If angle is leftwards
			(angle > tau * 5/8 && angle < tau * 7/8) ?
				'nextElementSibling' :
				false ;

		if (!prop) { return; }

		var active = children(node)
		.filter(dom.matches('.active'))
		.shift();

		if (active[prop]) {
			trigger(active[prop], 'dom-activate');
		}
		else {
			transform(node, active);
		}
	});

	on(document, 'dom-activate', function(e) {
		// Use method detection - e.defaultPrevented is not set in time for
		// subsequent listeners on the same node
		if (!e.default) { return; }

		var node   = e.target;
		var parent = node.parentNode;

		if (!dom.matches('.swipeable', parent)) { return; }

		var classes = dom.classes(parent);
		classes.remove('notransition');
		document.documentElement.clientWidth;

		var l1 = dom.viewportLeft(node);
		var l2 = dom.viewportLeft(parent);
		var l  = l1 - l2 - dom.style('margin-left', node);

		parent.style.transform = 'translate(' + (-l) + 'px, 0px)';
		e.preventDefault();
	});
})(this);
(function(window) {
	"use strict";
	
	var Fn      = window.Fn;
	var dom     = window.dom;

	var noop          = Fn.noop;
	var requestTick   = Fn.requestTick;
	var on            = dom.events.on;
	var off           = dom.events.off;
	var trigger       = dom.events.trigger;
	var disableScroll = dom.disableScroll;
	var enableScroll  = dom.enableScroll;
	var trapFocus     = dom.trapFocus;
	var untrapFocus   = noop;

	var matches = dom.matches('.focusable');
	var delay   = 600;

	on(document, 'dom-activate', function(e) {
		if (e.defaultPrevented) { return; }
		if (!matches(e.target)) { return; }

		// Trap focus

		var node = e.target;
		var trap = function trap(e) {
			clearTimeout(timer);
			off(e.target, 'transitionend', trap);
			untrapFocus = trapFocus(e.target);
		};

		var timer = setTimeout(trap, delay, e);
		on(e.target, 'transitionend', trap);

		// Prevent scrolling of main document

		disableScroll(dom.root);

		// Make the escape key deactivate the focusable

		requestAnimationFrame(function() {
			function keydown(e) {
				if (e.keyCode !== 27) { return; }
				trigger(node, 'dom-deactivate');
				e.preventDefault();
			}

			function deactivate(e) {
				if (node !== e.target) { return; }
				if (e.defaultPrevented) { return; }
				document.removeEventListener('keydown', keydown);
				document.removeEventListener('dom-deactivate', deactivate);
			}

			document.addEventListener('keydown', keydown);
			document.addEventListener('dom-deactivate', deactivate);
		});
	});

	on(document, 'dom-deactivate', function(e) {
		if (e.defaultPrevented) { return; }
		if (!matches(e.target)) { return; }

		var untrap = function untrap(e) {
			clearTimeout(timer);
			off(e.target, 'transitionend', untrap);
			untrapFocus();
			untrapFocus = noop;
		};

		var timer = setTimeout(untrap, delay, e);
		on(e.target, 'transitionend', untrap);
		enableScroll(dom.root);
	});
})(this);
// dom.toggleable

(function(window) {
	"use strict";

	// Import
	var dom     = window.dom;

	// Define
	var name    = 'removeable';
	// Max duration of deactivation transition in seconds
	var maxDuration = 1;

	// Functions
	var on      = dom.events.on;
	var off     = dom.events.off;
	var remove  = dom.remove;

	function deactivate(e, data, fn) {
		if (!e.default) { return; }

		var target = e.target;
		if (!dom.classes(target).contains(name)) { return; }

		function update() {
			clearTimeout(timer);
			off(target, 'transitionend', update);
			remove(target);
		}

		var timer = setTimeout(update, maxDuration * 1000);
		on(target, 'transitionend', update);

		e.default();
	}

	on(document, 'dom-deactivate', deactivate);
})(this);
// dom.popable
//
// Extends the default behaviour of events for the .tip class.

(function(window) {

    var Fn       = window.Fn;
    var dom      = window.dom;

    var by       = Fn.by;
    var noop     = Fn.noop;
    var powOut   = Fn.exponentialOut;
    var animate  = dom.animate;
    var classes  = dom.classes;
    var box      = dom.box;
    var offset   = dom.offset;
    var on       = dom.events.on;

    var name     = "locateable";

    // Time after scroll event to consider the document is scrolling
    var idleTime = 90;

    // Duration and easing of scroll animation
    var scrollDuration  = 0.8;
    var scrollTransform = powOut(6);

    // Time of latest scroll event
    var scrollTime = 0;

    var activeNode;
    var cancel = noop;

    function activate(e) {
        if (!e.default) { return; }

        var target = e.target;
        if (!classes(target).contains(name)) { return; }

        // If node is already active, ignore
        if (target === activeNode) { return; }

        if (activeNode) {
            if (target === activeNode) {
                return;
            }

            cancel();
            //scrollTime = e.timeStamp;
            dom.trigger('dom-deactivate', activeNode);
        }

        var t = e.timeStamp;
        var coords, safeTop;

        // Heuristic for whether we are currently actively scrolling. Checks:
        // Is scroll currently being animated OR
        // was the last scroll event ages ago ?
        // TODO: test on iOS
        if (scrollTime > t || t > scrollTime + idleTime) {
            coords     = offset(dom.viewport, target);
            safeTop    = dom.safe.top;
            scrollTime = t + scrollDuration * 1000;
            cancel     = animate(scrollDuration, scrollTransform, 'scrollTop', dom.viewport, coords[1] - safeTop);
        }

        e.default();
        activeNode = target;
    }

	function deactivate(e) {
        if (!e.default) { return; }

        var target = e.target;

        if (!classes(target).contains(name)) { return; }

        e.default();

        // If node is already active, ignore
        if (target === activeNode) {
            activeNode = undefined;
        }
	}

    function windowBox() {
        return {
            left:   0,
            top:    0,
            right:  window.innerWidth,
            bottom: window.innerHeight,
            width:  window.innerWidth,
            height: window.innerHeight
        };
    }

    function update() {
        var locateables = dom('.locateable');
        var boxes       = locateables.map(box).sort(by('top'));
        var winBox      = windowBox();

        var n = -1;
        while (boxes[++n]) {
            // Stop on locateable lower than the break
            if (boxes[n].top > winBox.height / 2) {
                break;
            }
        }
        --n;

        if (n < 0) { return; }
        if (n >= boxes.length) { return; }

        var node = locateables[n];

        if (activeNode) {
            if (node === activeNode) {
                return;
            }

            dom.trigger('dom-deactivate', activeNode);
        }

        dom.trigger('dom-activate', node);
    }

    function scroll(e) {
        // If scrollTime is in the future we are currently animating scroll,
        // best do nothing
        if (scrollTime >= e.timeStamp) { return; }
        scrollTime = e.timeStamp;
        update();
    }

    on(document, 'dom-activate', activate);
    on(document, 'dom-deactivate', deactivate);
    on(window, 'scroll', scroll);
    update();
})(this);
(function(window) {
	"use strict";

	var DEBUG      = window.DEBUG;

	var Fn         = window.Fn;
	var Observable = window.Observable;
	var Stream     = window.Stream;
	var dom        = window.dom;

	var assign     = Object.assign;
	var compose    = Fn.compose;
	var curry      = Fn.curry;
	var get        = Fn.get;
	var id         = Fn.id;
	var isDefined  = Fn.isDefined;
	var isNaN      = Number.isNaN;
	var nothing    = Fn.nothing;
	var noop       = Fn.noop;
	var overload   = Fn.overload;
	var pipe       = Fn.pipe;
	var set        = Fn.set;
	var setPath    = Fn.setPath;
	var toType     = Fn.toType;


	// Matches tags plus any directly adjacent text
	//var rclasstagstemplate = /[^\s]*{{0}}[^\}]+{{1}}[^\s]*/g;
	//var rclasstags;

	// Matches filter string, capturing (filter name, filter parameter string)
	//var rfilter = /\s*([a-zA-Z0-9_\-]+)\s*(?::(.+))?/;

	// Matches anything with a space
	var rspaces = /\s+/;

	// Matches anything that contains a non-space character
	var rtext = /\S/;

	// Matches the arguments list in the result of a fn.toString()
	var rarguments = /function(?:\s+\w+)?\s*(\([\w,\s]*\))/;

	var settings = {
		prefix:       'data-',
		mount:        noop,
		transforms:   {},
		transformers: {},
		rtoken:       /(\{\[)\s*(.*?)(?:\s*(\|.*?))?\s*(\]\})/g
	};

	var toRenderString = overload(toType, {
		'boolean': function(value) {
			return value + '';
		},

		'function': function(value) {
			return (value.name || 'function')
				+ (rarguments.exec(value.toString()) || [])[1];
		},

		'number': function(value) {
			return Number.isNaN(value) ? '' : value + '' ;
		},

		'string': id,

		'symbol': function(value) { return value.toString(); },

		'undefined': function() { return ''; },

		'object': function(value) {
			return value === null ? '' : JSON.stringify(value);
		},

		'default': JSON.stringify
	});

	function addClasses(classList, text) {
		var classes = toRenderString(text).trim().split(rspaces);
		classList.add.apply(classList, classes);
	}

	function removeClasses(classList, text) {
		var classes = toRenderString(text).trim().split(rspaces);
		classList.remove.apply(classList, classes);
	}


	// Transform

	var rtransform = /\|\s*([\w\-]+)\s*(?::([^|]+))?/g;

	function Transform(transforms, transformers, string) {
		if (!string) { return id; }

		var fns = [];
		var token, name, fn, args;

		rtransform.lastIndex = 0;

		while (
			rtransform.lastIndex < string.length
			&& (token = rtransform.exec(string))
		) {
			name = token[1];
			fn   = transformers[name] ? transformers[name].transform : transforms[name] ;

			if (!fn) {
				throw new Error('Sparky: transform "' + name + '" not found');
			}

			if (token[2]) {
				args = JSON.parse('[' + token[2].replace(/'/g, '"') + ']');
				fns.push(fn.apply(null, args));
			}
			else {
				fns.push(fn);
			}

			if (!(typeof fns[fns.length - 1] === 'function')) {
				throw new Error('Sparky: transform "' + name + '" not resulting in fn');
			}
		}

		return pipe.apply(null, fns);
	}

	function InverseTransform(transformers, string) {
		if (!string) { return id; }

		var fns = [];
		var token, name, fn, args;

		rtransform.lastIndex = 0;

		while (
			rtransform.lastIndex < string.length
			&& (token = rtransform.exec(string))
		) {
			name = token[1];
			fn   = transformers[name].invert;

			if (!fn) {
				throw new Error('Sparky: transformers "' + name + '" not found');
			}

			if (token[2]) {
				args = JSON.parse('[' + token[2].replace(/'/g, '"') + ']');
				fns.unshift(fn.apply(null, args));
			}
			else {
				fns.unshift(fn);
			}
		}

		return pipe.apply(null, fns);
	}


	// Mount

	var listen = curry(function(node, type, fn) {
		node.addEventListener(type, fn);
		return function unlisten() {
			node.removeEventListener('input', fn);
		};
	}, true);

	function mountStringToken(text, render, strings, structs, match) {
		var i = strings.length;
		strings.push('');
		structs.push({
			token:  match[0],
			path:   match[2],
			pipe:   match[3],
			render: function renderText(value) {
				strings[i] = toRenderString(value);
				render(strings);
			}
		});
	}

	function mountString(string, render, options, structs) {
		var rtoken  = options.rtoken;
		var i       = rtoken.lastIndex = 0;
		var match   = rtoken.exec(string);

		if (!match) { return nothing; }

		var strings = [];

		var renderStrings = function(strings) {
			render(strings.join(''));
		};

		while (match) {
			if (match.index > i) {
				strings.push(string.slice(i, match.index));
			}

			mountStringToken(string, renderStrings, strings, structs, match);
			i = rtoken.lastIndex;
			match = rtoken.exec(string);
		}

		if (string.length > i + 1) {
			strings.push(string.slice(i));
		}
	}

	function mountAttributes(names, node, options, structs) {
		var name;

		while (name = names.shift()) {
			mountAttribute(name, node, options, structs);
		}
	}

	function mountAttribute(name, node, options, structs) {
		var text   = dom.attribute(name, node);

		return text ? mountString(text, function render(value) {
			node.setAttribute(name, value);
		}, options, structs) : nothing ;
	}

	function mountBoolean(name, node, options, structs) {
		var rtoken = options.rtoken;

		// Look for prefixed attributes before attributes.
		//
		// In FF, the disabled attribute is set to the previous value that the
		// element had when the page is refreshed, so it contains no sparky
		// tags. The proper way to address this problem is to set
		// autocomplete="off" on the parent form or on the field.
		//
		// Remember SVG has case sensitive attributes.

		var attr = node.getAttribute(options.prefix + name) || node.getAttribute(name) ;
		if (!attr) { return; }

		rtoken.lastIndex = 0;
		var tokens = rtoken.exec(attr.trim());
		if (!tokens) { return; }

		structs.push({
			token:  attr.trim(),
			path:   tokens[2],
			pipe:   tokens[3],
			render: name in node ?

				// Attribute is also a boolean property
				function render(value) {
					node[name] = !!value;
				} :

				// Attribute is not also a boolean property
				function render(value) {
					if (value) {
						node.setAttribute(name, name);
					}
					else {
						node.removeAttribute(name);
					}
				}
		});
	}

	function mountClass(node, options, structs) {
		var rtoken = options.rtoken;
		var attr   = dom.attribute('class', node);

		// If there are no classes, go no further
		if (!attr) { return; }

		var classes = dom.classes(node);

		// Extract the tags and overwrite the class with remaining text
		var text = attr.replace(rtoken, function($0, $1, $2, $3, $4) {
			var prev    = '';

			structs.push({
				token:  $0,
				path:   $2,
				pipe:   $3,
				render: function render(string) {
					if (prev && rtext.test(prev)) { removeClasses(classes, prev); }
					if (string && rtext.test(string)) { addClasses(classes, string); }
					prev = string;
				}
			});

			return '';
		});

		node.setAttribute('class', text);
	}

	function mountName(node, options, structs) {
		var string = node.name;
		var rtoken = options.rtoken;
		rtoken.lastIndex = 0;

		var match = rtoken.exec(string);
		if (!match) { return; }

		return mountNameByType(node, options, match, structs);
	}

	var types = {
		// element
		1: function(node, options, structs) {
			var children = node.childNodes;
			var n = -1;
			var child, renderer;

			while (child = children[++n]) {
				// Test to see if it needs a full Sparky mounting
				renderer = options.mount(child);

				if (renderer) {
					// Sparky mounted it
					structs.push(renderer);
				}
				else {
					// It's a plain old node with no data-fn
					mountNode(child, options, structs);
				}
			}

			mountClass(node, options, structs);
			mountAttributes(['id', 'title', 'style'], node, options, structs);
			mountTag(node, options, structs);

			if (DEBUG) { console.log('mounted:', node, structs.length); }
		},

		// text
		3: function(node, options, structs) {
			mountString(node.nodeValue, set('nodeValue', node), options, structs);
		},

		// Comment
		8: noop,

		// fragment
		11: function(node, options, structs) {
			var children = node.childNodes;
			var n = -1;
			var child, struct;

			while (child = children[++n]) {
				// If the optional mounter returns a struct
				struct = options.mount(child);

				if (struct) {
					structs.push(struct);
				}
				else {
					mountNode(child, options, structs);
				}
			}
		}
	};

	var tags = {

		// HTML

		a: function(node, options, structs) {
			mountAttribute('href', node, options, structs);
		},

		button: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
		},

		input: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
			mountBoolean('required', node, options, structs);
			mountAttributes(['value'], node, options, structs);
			mountInput(node, options, structs);
			mountName(node, options, structs);
		},

		img: function(node, options, structs) {
			mountAttribute('alt', node, options, structs);
		},

		label: function(node, options, structs) {
			mountAttribute('for', node, options, structs);
		},

		option: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
			mountAttribute('value', node, options, structs);
		},

		select: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
			mountBoolean('required', node, options, structs);
			mountAttribute('value', node, options, structs);
			// Two way bind here??
			mountName(node, options, structs);
		},

		textarea: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
			mountBoolean('required', node, options, structs);
			mountName(node, options, structs);
		},

		time: function(node, options, structs)  {
			mountAttributes(['datetime'], node, options, structs);
		},

		// SVG

		svg: function(node, options, structs) {
			mountAttributes(['viewbox'], node, options, structs);
		},

		g: function(node, options, structs) {
			mountAttributes(['transform'],  node, options, structs);
		},

		path: function(node, options, structs) {
			mountAttributes(['d', 'transform'], node, options, structs);
		},

		line: function(node, options, structs) {
			mountAttributes(['x1', 'x2', 'y1', 'y2', 'transform'], node, options, structs);
		},

		rect: function(node, options, structs) {
			mountAttributes(['x', 'y', 'width', 'height', 'rx', 'ry', 'transform'], node, options, structs);
		},

		text: function(node, options, structs) {
			mountAttributes(['x', 'y', 'dx', 'dy', 'text-anchor'], node, options, structs);
		},

		use: function(node, options, structs) {
			mountAttributes(['href', 'transform'], node, options, structs);
		},

		default: noop
	};

	var inputs = {
		date: function(node, options, structs) {
			mountAttributes(['min', 'max', 'step'], node, options, structs);
		},

		number: function(node, options, structs) {
			mountAttributes(['min', 'max', 'step'], node, options, structs);
		},

		range: function(node, options, structs) {
			mountAttributes(['min', 'max', 'step'], node, options, structs);
		},

		time: function(node, options, structs) {
			mountAttributes(['min', 'max', 'step'], node, options, structs);
		},

		checkbox: function() {},

		radio: function() {},

		default: noop
	};

	var inputTypes = {
		checkbox: function(node, options, match, structs) {
			structs.push({
				node:  node,
				token: match[0],
				path:  match[2],
				pipe:  match[3],

				read: function read() {
					return isDefined(node.getAttribute('value')) ?
						node.checked ? node.value : undefined :
						node.checked ;
				},

				render: function render(value) {
					// Where value is defined check against it, otherwise
					// value is "on", uselessly. Set checked state directly.
					node.checked = isDefined(node.getAttribute('value')) ?
						value === node.value :
						value === true ;
				},

				listen: listen(node, 'change')
			});
		},

		radio: function(node, options, match, structs) {
			structs.push({
				node:  node,
				token: match[0],
				path:  match[2],
				pipe:  match[3],

				read: function read() {
					if (!node.checked) { return; }

					return isDefined(node.getAttribute('value')) ?
						node.value :
						true ;
				},

				render: function render(value) {
					// Where value="" is defined check against it, otherwise
					// value is "on", uselessly: set checked state directly.
					node.checked = isDefined(node.getAttribute('value')) ?
						value === node.value :
						value === true ;
				},

				listen: listen(node, 'change')
			});
		},

		number: function(node, options, match, structs) {
			structs.push({
				node:  node,
				token: match[0],
				path:  match[2],
				pipe:  match[3],

				read: function read() {
					return node.value ? parseFloat(node.value) : undefined ;
				},

				render: function render(value) {
					// Avoid updating with the same value as it sends the cursor to
					// the end of the field (in Chrome, at least).
					if (value === parseFloat(node.value)) { return; }

					node.value = typeof value === 'number' && !isNaN(value) ?
						value :
						'' ;
				},

				listen: listen(node, 'input')
			});
		},

		range: function(node, options, match, structs) {
			structs.push({
				node:  node,
				token: match[0],
				path:  match[2],
				pipe:  match[3],

				read: function read() {
					return node.value ? parseFloat(node.value) : undefined ;
				},

				render: function render(value) {
					// Avoid updating with the same value as it sends the cursor to
					// the end of the field (in Chrome, at least).
					if (value === parseFloat(node.value)) { return; }

					node.value = typeof value === 'number' && !isNaN(value) ?
						value :
						'' ;
				},

				listen: listen(node, 'input')
			});
		},

		default: function(node, options, match, structs) {
			structs.push({
				node:  node,
				token: match[0],
				path:  match[2],
				pipe:  match[3],

				read: function read() {
					return node.value;
				},

				render: function render(value) {
					// Avoid updating with the same value as it sends the cursor to
					// the end of the field (in Chrome, at least).
					if (value === node.value) { return; }

					node.value = typeof value === 'string' ?
						value :
						'' ;
				},

				listen: listen(node, 'input')
			});
		}
	};

	var mountNode       = overload(get('nodeType'), types);
	var mountTag        = overload(dom.tag, tags);
	var mountInput      = overload(get('type'), inputs);
	var mountNameByType = overload(get('type'), inputTypes);

	function setupStruct(struct, options) {
		var transform = Transform(options.transforms, options.transformers, struct.pipe);
		var update    = compose(struct.render, transform);
		var throttle  = Fn.throttle(update, requestAnimationFrame, cancelAnimationFrame);

		struct.update = update;
		struct.push = throttle;
	}

	function RenderStream(structs, options, node) {
		var old;

		return {
			/* A read-only stream. */
			shift: noop,

			stop: function stopRenderer() {
				structs.forEach(function(struct) {
					struct.unbind && struct.unbind();
					struct.stop && struct.stop();
				});
			},

			push: function pushRenderer(data) {
				if (old === data) { return; }
				old = data;

				if (DEBUG) {
					console.groupCollapsed('Sparky: update', node);
				}

				var observable = Observable(data);
				var unlisten;

				// Rebind structs
				structs.forEach(function(struct) {
					// Unbind Structs
					struct.unbind && struct.unbind();

					// Set up struct. Sparky objects, which masquerade as structs,
					// already have a .push() method. They don't need to be set
					// up. Also, they don't need to be throttled
					if (!struct.push) {
						setupStruct(struct, options);
					}

					struct.unbind = struct.unbind || function(data) {
						// If the struct is not a Sparky it's .push() is a
						// throttle and must be cancelled. TODO: dodgy.
						struct.push.cancel && struct.push.cancel();
						struct.input.stop();
						if (struct.listen) { unlisten(); }
					};

					// Rebind struct
					var input = struct.input = Stream.observe(struct.path, observable);
					var value = input.latest().shift();

					// If there is an initial scope render it synchronously, as
					// it is assumed we are already working inside an animation
					// frame
					if (value !== undefined) { (struct.update || struct.push)(value); }

					// Render future scopes at throttled frame rate, where
					// throttle is defined
					input.each(struct.push);

					var set, invert, change;

					// Listen to changes
					if (struct.listen) {
						set = setPath(struct.path, observable);
						invert = InverseTransform(options.transformers, struct.pipe);
						change = pipe(function() { return struct.read(); }, invert, set);
						unlisten = struct.listen(change);

						if (value === undefined) { change(); }
					}
				});

				if (DEBUG) {
					console.groupEnd();
				}

				return data;
			}
		}
	}

	function mount(node, options) {
		options = assign({}, settings, options);

		if (DEBUG) {
			console.groupCollapsed('Sparky: mount ', node);
		}

		var structs = [];
		mountNode(node, options, structs);

		if (DEBUG) {
			console.table(structs, ["token", "path", "pipe"]);
			console.groupEnd();
		}

		return RenderStream(structs, options, node);
	}


	// Export

	mount.types  = types;
	mount.tags   = tags;
	mount.inputs = inputs;
	mount.mountAttribute = mountAttribute;
	mount.mountBoolean   = mountBoolean;
	mount.mountInput     = mountInput;
	mount.mountName      = mountName;

	window.mount = mount;

})(this);
(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('Sparky      - https://github.com/cruncher/sparky');
})(this);

(function(window) {
	"use strict";

	var DEBUG      = window.DEBUG;

	var Fn         = window.Fn;
	var Observable = window.Observable;
	var Stream     = window.Stream;
	var dom        = window.dom;
	var mount      = window.mount;

	var assign     = Object.assign;
	var each       = Fn.each;
	var getPath    = Fn.getPath;
	var invoke     = Fn.invoke;
	var noop       = Fn.noop;
	var nothing    = Fn.nothing;
	var append     = dom.append;
	var children   = dom.children;
	var empty      = dom.empty;
	var fragmentFromId = dom.fragmentFromId;
	var fragmentFromTemplate = dom.fragmentFromTemplate;
	var preventDefault = dom.preventDefault;
	var remove     = dom.remove;
	var tag        = dom.tag;


	// Matches:     xxxx: xxx, "xxx", 'xxx'
	var rfn       = /\s*([-\w]+)(?:\s*:\s*((?:"[^"]*"|'[^']*'|[\w-\[\]]*)(?:\s*,\s*(?:"[^"]*"|'[^']*'|[\w-\[\]]*))*))?/;

	var settings = {
		mount: function mount(node) {
			var fn       = dom.attribute('data-fn', node);
			var template = dom.attribute('data-template', node);

			if (!fn && !template) { return; }

			var sparky = Sparky(node, undefined, {
				fn: fn,
				template: template
			});

			if (DEBUG) { console.log('mounted:', node, fn, template); }

			sparky.token = fn;
			sparky.path  = '';
			return sparky;
		}
	};

	function callReducer(object, fn) {
		fn(object);
		return object;
	}

	function createRenderStream(sparky, settings) {
		var streams = [];
		var n = -1;

		while (sparky[++n]) {
			streams.push(mount(sparky[n], settings));
		}

		// An aggragate stream for all the mounted streams. How many nested
		// streams do we need in this project?
		return {
			stop: function stop() {
				return streams.forEach(invoke('stop', arguments));
			},

			push: function push() {
				return streams.forEach(invoke('push', arguments));
			}
		};
	}

	function escapeSelector(selector) {
		return selector.replace(/\//g, '\\\/');
	}

	function Sparky(node, data, options) {
		if (!Sparky.prototype.isPrototypeOf(this)) {
			return new Sparky(node, data, options);
		}

		node = typeof node === 'string' ?
			document.querySelector(escapeSelector(node)) :
			node ;

		if (tag(node) === 'template') {
			var fragment = fragmentFromTemplate(node).cloneNode(true);
			var nodes    = fragment.childNodes;
			var n        = -1;

			// assign doesn't seem to work on node collections
			while (nodes[++n]) {
				this[n] = nodes[n];
			}
			this.length = nodes.length;
			node = children(fragment)[0];
		}
		else {
			this[0] = node;
			this.length  = 1;
		}

		var fnstring = options && options.fn || dom.attribute('data-fn', node) || '';
		var calling  = true;
		var sparky   = this;
		var input    = this;
		var renderer = nothing;

		Stream.call(this, function Source(notify, stop) {
			this.shift = function() {
				var object;

				if (data !== undefined) {
					object = Observable(data);
					data   = undefined;
					return object;
				}

				//notify('pull');
			};

			this.push = function() {
				data = arguments[arguments.length - 1];
				notify('push');
			};

			this.stop = function() {
				input.stop && input.stop !== sparky.stop && input.stop();
				renderer.stop && renderer.stop();

				// Schedule stop, if data is waiting to be collected make
				// sure we get it
				stop(data ? 1 : 0);
			};
		});


		this.interrupt = function interrupt() {
			calling = false;
			return { fn: fnstring };
		};

		// Parse the fns and params to execute
		var token, fn, params;
		while (token = fnstring.match(rfn)) {
			fn       = Sparky.fn[token[1]];

			if (!fn) {
				throw new Error('Sparky: fn "' + token[1] + '" not found in Sparky.fn');
			}

			params   = token[2] && JSON.parse('[' + token[2].replace(/'/g, '"') + ']');
			fnstring = fnstring.slice(token[0].length);
			input    = fn.call(this, node, input, params) || input;

			// If fns have been interrupted return the sparky without mounting
			if (!calling) { return this; }
		}

		// TEMP: Find a better way to pass these in
		settings.transforms   = Sparky.transforms;
		settings.transformers = Sparky.transformers;

		var template = (options && options.template)
			|| dom.attribute('data-template', node)
			|| '' ;

		if (template) {
			input
			.take(1)
			.each(function(scope) {
				var fragment = fragmentFromId(template);

				if (!fragment) {
					throw new Error('Sparky: data-template="' + template + '" not found in DOM');
				}

				// Replace node content with fragment
				empty(node);
				append(node, fragment);

				// Update
				renderer = createRenderStream(sparky, settings);
				renderer.push(scope);
				input.each(renderer.push);
			});
		}
		else {
			renderer = createRenderStream(sparky, settings);
			input.each(renderer.push);
		}
	}

	Sparky.prototype = Object.create(Stream.prototype);

	assign(Sparky, {
		fn: {
			scope: function(node, stream, params) {
				var scope = getPath(params[0], window);

				if (!scope) {
					console.warn('Sparky: no object at path ' + params[0], data.cuts[110]);
					return Fn.of();
				}

				return Fn.of(getPath(params[0], window));
			},

			get: function(node, stream, params) {
				return stream.map(getPath(params[0]));
			},

			ignore: function ignore(node, stream) {
				console.log(this.interrupt(), node, stream);
			},

			prevent: function preventSubmitCtrl(node, stream, params) {
				node.addEventListener(params[0], preventDefault);

				// TODO: Work out how Sparky 2 is to handle teardowns

				//this.on('destroy', function() {
				//	node.removeEventListener('submit', preventDefault);
				//});
			},

			log: function(node, scopes) {
				var sparky = this;

				// In IE11 and probably below, and possibly Edge, who knows,
				// console.groups can arrive in really weird orders. They
				// are not at all useful for debugging as a result. Rely on
				// console.log.

				function log(scope) {
					console.group('Sparky: scope', node);
					console.log('data ', sparky.data);
					console.log('scope', scope);
					console.log('fn   ', sparky.fn);
					console.groupEnd('---');
				}

				console.group('Sparky: run  ', node);
				console.log('data ', sparky.data);
				console.groupEnd('---');

				return scopes.tap(log);
			}
		},

		transforms: {},

		mount:      mount,

		MarkerNode: function MarkerNode(node) {
			// A text node, or comment node in DEBUG mode, for marking a
			// position in the DOM tree so it can be swapped out with some
			// content node.

			if (!DEBUG) {
				return dom.create('text', '');
			}

			var attrScope = node && node.getAttribute('data-scope');
			var attrCtrl  = node && node.getAttribute('data-fn');

			return dom.create('comment',
				(attrScope ? ' data-scope="' + attrScope + '"' : '') +
				(attrCtrl ? ' data-fn="' + attrCtrl + '" ' : '')
			);
		}
	});

	Object.defineProperties(Sparky, {
		rtoken: {
			get: function() { return settings.rtoken; },
			set: function(rtoken) { settings.rtoken = rtoken; },
			enumerable: true,
			configurable: true
		}
	});

	window.Sparky = Sparky;

})(this);

// Sparky.fn

Sparky.nodeToString = Fn.id;

(function(window) {
	var Sparky = window.Sparky;

	// Detect IE
	var isIE = !!(document.all && document.compatMode || window.navigator.msPointerEnabled);

	// Logs nodes, scopes and data.
	Sparky.fn.log = function(node, scopes) {
		var sparky = this;

		// In IE11 and probably below, and possibly Edge, who knows,
		// console.groups can arrive in really weird orders. They are not at all
		// useful for debugging as a result. Rely on console.log.

		function log(scope) {
			//console[isIE ? 'log' : 'group']('Sparky: scope ' + Sparky.nodeToString(node));
			//console.log('data ', sparky.data);
			console.log('Sparky node:', node, 'scope:', scope);
			//console.log('fn   ', node, sparky.fn);
			//console[isIE ? 'log' : 'groupEnd']('---');
		}

		//console[isIE ? 'log' : 'group']('Sparky: run   ' + Sparky.nodeToString(node));
		//console.log('data ', sparky.data);
		//console[isIE ? 'log' : 'groupEnd']('---');

		return scopes.tap(log);
	};
})(this);

(function(window) {
	"use strict";

	var assign = Object.assign;
	var dom    = window.dom;
	var Sparky = window.Sparky;

	assign(Sparky.fn, {
		"show-on-scope": function(node, scopes) {
			scopes.tap(function() {
				window.requestAnimationFrame(function() {
					dom.classes(node).remove('sparky-hidden');
				});
			});
		}
	});
})(this);

(function(window) {
	"use strict";

	var assign = Object.assign;
	var Sparky = window.Sparky;

	assign(Sparky.fn, {
		html: function(node, scopes) {
			scopes.tap(function(html) {
				node.innerHTML = html;
			});
		}
	});
})(this);

(function(window) {
	"use strict";

	var Fn = window.Fn;

	function preventDefault(e) {
		e.preventDefault();
	}

	Sparky.scope = function(node) {
		console.warn('Sparky: Sparky.scope() deprecated in favour of Sparky.getScope()')
		return Sparky.getScope(node);
	};

	Sparky.setScope = function(node, scope) {
		if (!window.jQuery) {
			throw new Error('data-fn="store-scope" requires jQuery.');
		}

		window.jQuery && jQuery.data(node, 'scope', scope);
	};

	Sparky.getScope = function(node) {
		if (!window.jQuery) {
			throw new Error('data-fn="store-scope" requires jQuery.');
		}

		return jQuery.data(node, 'scope');
	};

	Object.assign(Sparky.fn, {
		"prevent": function(node, scopes, params) {
			node.addEventListener(params[0], preventDefault);
		},

		"ajax-on-submit": function(node, scopes, params) {
			var method = node.getAttribute('method') || 'POST';
			var url    = node.getAttribute('action');

			if (!Fn.isDefined(url)) {
				throw new Error('Sparky: fn ajax-on-submit requires an action="url" attribute.');
			}

			var submit;

			node.addEventListener('submit', preventDefault);

			scopes.tap(function(scope) {
				if (submit) { node.removeEventListener(submit); }

				submit = function(e) {
					// Axios
					axios
					.post(url, scope, {
						headers: { "X-CSRFToken": getCookie('csrftoken') }
					})
					.then(function (response) {
						console.log(response);
					})
					.catch(function (error) {
						console.log(error);
					});

					// jQuery
					//jQuery.ajax({
					//	//type: method.toLowerCase(),
					//	//url:  url,
					//	//data: JSON.stringify(scope),
					//	//dataType: 'json'
					//})
					//.then(function(value) {
					//	console.log(value);
					//});
				};

				node.addEventListener('submit', submit);
			})

			//this
			//.on('destroy', function() {
			//	node.removeEventListener('submit', submit);
			//});
		},

		"expose-scope": function(node, scopes) {
			scopes.tap(function(scope) {
				Sparky.setScope(node, scope);
			});
		}
	});
})(this);


(function() {
	"use strict";

	Sparky.fn['x-scroll-slave'] = function(node) {
		var name = node.getAttribute('data-x-scroll-master');
		var master;

		function update() {
			node.scrollLeft = master.scrollLeft;
		}

		this
		.on('dom-add', function() {
			master = document.getElementById(name);

			if (!master) {
				console.error(node);
				throw new Error('Sparky scroll-x-slave: id="' + name + '" not in the DOM.');
			}

			master.addEventListener('scroll', update);
			update();
		})
		.on('destroy', function() {
			if (!master) { return; }
			master.removeEventListener('scroll', update);
		});
	};

	Sparky.fn['y-scroll-slave'] = function(node) {
		var name = node.getAttribute('data-y-scroll-master');
		var master = document.getElementById(name);

		if (!master) {
			console.error(node);
			throw new Error('Sparky scroll-x-slave: id="' + name + '" not in the DOM.');
		}

		function update() {
			node.scrollTop = master.scrollTop;
		}

		master.addEventListener('scroll', update);
		update();

		this.on('destroy', function() {
			master.removeEventListener('scroll', update);
		});
	};
})();
(function(window) {
	"use strict";

	var Fn         = window.Fn;
	var dom        = window.dom;
	var Observable = window.Observable;
	var Sparky     = window.Sparky;
	var A          = Array.prototype;

	var noop       = Fn.noop;
	var clone      = dom.clone;
	var tag        = dom.tag;
	var observe    = Observable.observe;
	var MarkerNode = Sparky.MarkerNode;

	var $object    = Symbol('object');

	// We maintain a list of sparkies that are scheduled for destruction. This
	// time determines how long we wait during periods of inactivity before
	// destroying those sparkies.
	var destroyDelay = 8000;

	function create(node, object, options) {
		var sparky = new Sparky(node, object, options);
		sparky[$object] = object;
		return sparky;
	}

	function reorderCache(template, options, array, sparkies) {
		var n    = -1;
		var sparky, object, i;

		// Reorder sparkies
		while (++n < array.length) {
			object = array[n];
			sparky = sparkies[n];

			if (sparky && object === sparky[$object]) {
				continue;
			}

			i = -1;
			while (sparkies[++i] && sparkies[i][$object] !== object);

			sparky = i === sparkies.length ?
				create(clone(template), object, options) :
				sparkies.splice(i, 1)[0];

			sparkies.splice(n, 0, sparky);
		}
	}

	function reorderNodes(node, array, sparkies) {
		// Reordering has pushed all removed sparkies to the end of the
		// sparkies. Remove them.
		while (sparkies.length > array.length) {
			A.forEach.call(sparkies.pop().stop(), dom.remove);
		}

		// Reorder nodes in the DOM
		var l = sparkies.length;
		var n = -1;
		var parent = node.parentNode;

		while (n < l) {
			// Note that node is null where nextSibling does not exist
			node = node ? node.nextSibling : null ;

			while (++n < l && sparkies[n][0] !== node) {
				parent.insertBefore(sparkies[n][0], node);
			}
		}
	}

	Sparky.fn.each = function each(node, scopes, params) {
		var sparkies = [];
		var template = node.cloneNode(true);
		var options  = this.interrupt();
		var marker   = MarkerNode(node);
		var isSelect = tag(node) === 'option';

		function update(array) {
			// Selects will lose their value if the selected option is removed
			// from the DOM, even if there is another <option> of same value
			// already in place. (Interestingly, value is not lost if the
			// selected <option> is simply moved). Make an effort to have
			// selects retain their value.
			var value = isSelect ? marker.parentNode.value : undefined ;

			reorderCache(template, options, array, sparkies);
			reorderNodes(marker, array, sparkies);

			// A fudgy workaround because observe() callbacks (like this update
			// function) are not batched to ticks.
			// TODO: batch observe callbacks to ticks.
			if (isSelect && value !== undefined) {
				marker.parentNode.value = value;
			}
		}

		var throttle = Fn.throttle(update, requestAnimationFrame, noop);
		//var timer;

		//fns.unshift(function() {
		//	this.data = Object.create(data);
		//});

		// Stop Sparky trying to bind the same scope and ctrls again.
		template.removeAttribute('data-scope');
		template.removeAttribute('data-fn');

		// Put the marker in place and remove the node
		dom.before(node, marker);
		dom.remove(node);

		var unobserve = noop;
		var initial = scopes.latest().shift();

		if (initial) {
			observe(initial, '', update);
		}

		scopes.each(function(scope) {
			unobserve();
			unobserve = observe(scope, '', throttle);
		});

		//this.on('stop', function destroy() {
		//	throttle.cancel();
		//	unobserve();
		//});
	};
})(this);

// Sparky.filter

(function(window) {
	"use strict";

	var Fn        = window.Fn;
	var dom       = window.dom;
	var Sparky    = window.Sparky;

	var assign    = Object.assign;
	var curry     = Fn.curry;
	var isDefined = Fn.isDefined;
	var settings  = (Sparky.settings = Sparky.settings || {});

	function createList(ordinals) {
		var array = [], n = 0;

		while (n++ < 31) {
			array[n] = ordinals[n] || ordinals.n;
		}

		return array;
	}

	// Language settings
	settings.en = {
		days:     ('Sunday Monday Tuesday Wednesday Thursday Friday Saturday').split(' '),
		months:   ('January February March April May June July August September October November December').split(' '),
		ordinals: createList({ n: 'th', 1: 'st', 2: 'nd', 3: 'rd', 21: 'st', 22: 'nd', 23: 'rd', 31: 'st' })
	};

	settings.fr = {
		days:     ('dimanche lundi mardi mercredi jeudi vendredi samedi').split(' '),
		months:   ('janvier février mars avril mai juin juillet août septembre octobre novembre décembre').split(' '),
		ordinals: createList({ n: "ième", 1: "er" })
	};

	settings.de = {
		days:     ('Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag').split(' '),
		months:   ('Januar Februar März April Mai Juni Juli Oktober September Oktober November Dezember').split(' '),
		ordinals: createList({ n: "er" })
	};

	settings.it = {
		days:     ('domenica lunedì martedì mercoledì giovedì venerdì sabato').split(' '),
		months:   ('gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre').split(' '),
		ordinals: createList({ n: "o" })
	};

	// Document language
	var lang = document.documentElement.lang;
	settings.lang = lang && settings[lang] ? lang : 'en';

	function spaces(n) {
		var s = '';
		while (n--) { s += ' '; }
		return s;
	}

	var rletter = /([YMDdHhms]{2,4}|[a-zA-Z])/g;
	//var rtimezone = /(?:Z|[+-]\d{2}:\d{2})$/;
	var rnonzeronumbers = /[1-9]/;

	function createDate(value) {
		// Test the Date constructor to see if it is parsing date
		// strings as local dates, as per the ES6 spec, or as GMT, as
		// per pre ES6 engines.
		// developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse#ECMAScript_5_ISO-8601_format_support
		var date = new Date(value);
		var json = date.toJSON();
		var gmt =
			// It's GMT if the first characters of the json match
			// the value...
			json.slice(0, value.length) === value &&

			// ...and if all remaining numbers in the json are 0.
			!json.slice(value.length).match(rnonzeronumbers) ;

		return typeof value !== 'string' ? new Date(value) :
			// If the Date constructor parses to gmt offset the date by
			// adding the date's offset in milliseconds to get a local
			// date. getTimezoneOffset returns the offset in minutes.
			gmt ? new Date(+date + date.getTimezoneOffset() * 60000) :

			// Otherwise use the local date.
			date ;
	}

	assign(Sparky.transformers = {}, {
		add:         { transform: Fn.add,         invert: curry(function(m, n) { return n - m; }) },
		decibels:    { transform: Fn.todB,        invert: Fn.toLevel },
		multiply:    { transform: Fn.multiply,    invert: curry(function(d, n) { return n / d; }) },
		degrees:     { transform: Fn.toDeg,       invert: Fn.toRad },
		radians:     { transform: Fn.toRad,       invert: Fn.toDeg },
		pow:         { transform: Fn.pow,         invert: curry(function(n, x) { return Fn.pow(1/n, x); }) },
		exp:         { transform: Fn.exp,         invert: Fn.log },
		log:         { transform: Fn.log,         invert: Fn.exp },
		int:         { transform: Fn.toFixed(0),  invert: Fn.toInt },
		float:       { transform: Fn.toString,    invert: Fn.toFloat },
		normalise:   { transform: Fn.normalise,   invert: Fn.denormalise },
		denormalise: { transform: Fn.denormalise, invert: Fn.normalise },
		floatformat: { transform: Fn.toFixed,     invert: curry(function(n, str) { return parseFloat(str); }) },
	});

	assign(Sparky.transformers, {
		// Aliases
		decimals: Sparky.transformers.floatformat
	});

	assign(Sparky.transforms, {

		// Transforms from Fn's map functions

		add:          Fn.add,
		append:       Fn.append,
		contains:     Fn.contains,
		diff:         Fn.diff,
		equals:       Fn.equals,
		//exp:          Fn.exp,
		factorise:    Fn.factorise,
		gcd:          Fn.gcd,
		get:          Fn.get,
		getPath:      Fn.getPath,
		intersect:    Fn.intersect,
		invoke:       Fn.invoke,
		is:           Fn.is,
		lcm:          Fn.lcm,
		limit:        Fn.limit,
		//log:          Fn.log,
		max:          Fn.max,
		min:          Fn.min,
		mod:          Fn.mod,
		not:          Fn.not,
		percent:      Fn.multiply(100),
		prepend:      Fn.prepend,
		rest:         Fn.rest,
		root:         Fn.nthRoot,
		slugify:      Fn.slugify,
		sort:         Fn.sort,
		take:         Fn.take,
		toCartesian:  Fn.toCartesian,
		todB:         Fn.todB,
		toDeg:        Fn.toDeg,
		toLevel:      Fn.toLevel,
		toFixed:      Fn.toFixed,
		toFloat:      Fn.toFloat,
		toPolar:      Fn.toPolar,
		toRad:        Fn.toRad,
		toStringType: Fn.toStringType,
		toType:       Fn.toType,
		unique:       Fn.unique,
		unite:        Fn.unite,


		// Transforms from dom's map functions

		escape:       dom.escape,
		toPx:         dom.toPx,
		toRem:        dom.toRem,


		// Sparky transforms

//		add: function(value, n) {
//			var result = parseFloat(value) + n ;
//			if (Number.isNaN(result)) { return; }
//			return result;
//		},

		capfirst: function(value) {
			return value.charAt(0).toUpperCase() + value.substring(1);
		},

		cut: function(value, string) {
			return Sparky.filter.replace(value, string, '');
		},

		formatdate: (function(settings) {
			var formatters = {
				YYYY: function(date) { return ('000' + date.getFullYear()).slice(-4); },
				YY:   function(date) { return ('0' + date.getFullYear() % 100).slice(-2); },
				MM:   function(date) { return ('0' + (date.getMonth() + 1)).slice(-2); },
				MMM:  function(date) { return this.MMMM(date).slice(0,3); },
				MMMM: function(date) { return settings[lang].months[date.getMonth()]; },
				DD:   function(date) { return ('0' + date.getDate()).slice(-2); },
				d:    function(date) { return '' + date.getDay(); },
				dd:   function(date) { return ('0' + date.getDay()).slice(-2); },
				ddd:  function(date) { return this.dddd(date).slice(0,3); },
				dddd: function(date) { return settings[lang].days[date.getDay()]; },
				HH:   function(date) { return ('0' + date.getHours()).slice(-2); },
				mm:   function(date) { return ('0' + date.getMinutes()).slice(-2); },
				ss:   function(date) { return ('0' + date.getSeconds()).slice(-2); },
				sss:  function(date) { return (date.getSeconds() + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
			};

			return function formatDate(value, format, lang) {
				if (!value) { return; }

				var date = value instanceof Date ? value : createDate(value) ;

				lang = lang || settings.lang;

				return format.replace(rletter, function($0, $1) {
					return formatters[$1] ? formatters[$1](date, lang) : $1 ;
				});
			};
		})(settings),

		formattime: function(value, format, lang) {
			return Time(value).render(format, lang);
		},

		date: (function(settings) {
			var formatters = {
				a: function(date) { return date.getHours() < 12 ? 'a.m.' : 'p.m.'; },
				A: function(date) { return date.getHours() < 12 ? 'AM' : 'PM'; },
				b: function(date, lang) { return settings[lang].months[date.getMonth()].toLowerCase().slice(0,3); },
				c: function(date) { return date.toISOString(); },
				d: function(date) { return date.getDate(); },
				D: function(date, lang) { return settings[lang].days[date.getDay()].slice(0,3); },
				//e: function(date) { return ; },
				//E: function(date) { return ; },
				//f: function(date) { return ; },
				F: function(date, lang) { return settings[lang].months[date.getMonth()]; },
				g: function(date) { return date.getHours() % 12; },
				G: function(date) { return date.getHours(); },
				h: function(date) { return ('0' + date.getHours() % 12).slice(-2); },
				H: function(date) { return ('0' + date.getHours()).slice(-2); },
				i: function(date) { return ('0' + date.getMinutes()).slice(-2); },
				//I: function(date) { return ; },
				j: function(date) { return date.getDate(); },
				l: function(date, lang) { return settings[lang].days[date.getDay()]; },
				//L: function(date) { return ; },
				m: function(date) { return ('0' + date.getMonth()).slice(-2); },
				M: function(date, lang) { return settings[lang].months[date.getMonth()].slice(0,3); },
				n: function(date) { return date.getMonth(); },
				//o: function(date) { return ; },
				O: function(date) {
					return (date.getTimezoneOffset() < 0 ? '+' : '-') +
						 ('0' + Math.round(100 * Math.abs(date.getTimezoneOffset()) / 60)).slice(-4) ;
				},
				r: function(date) { return date.toISOString(); },
				s: function(date) { return ('0' + date.getSeconds()).slice(-2); },
				S: function(date) { return settings.ordinals[date.getDate()]; },
				//t: function(date) { return ; },
				//T: function(date) { return ; },
				U: function(date) { return +date; },
				w: function(date) { return date.getDay(); },
				//W: function(date) { return ; },
				y: function(date) { return ('0' + date.getFullYear() % 100).slice(-2); },
				Y: function(date) { return date.getFullYear(); },
				//z: function(date) { return ; },
				Z: function(date) { return -date.getTimezoneOffset() * 60; }
			};

			return curry(function formatDate(format, value) {
				if (!value) { return; }

				var date = value instanceof Date ? value : createDate(value) ;

				lang = settings.lang;

				return format.replace(rletter, function($0, $1) {
					return formatters[$1] ? formatters[$1](date, lang) : $1 ;
				});
			});
		})(settings),

		decibels: Fn.todB,
		decimals: Fn.toFixed,

		divide: curry(function(n, value) {
			if (typeof value !== 'number') { return; }
			return value / n;
		}),

		'find-in': curry(function(path, id) {
			if (!isDefined(id)) { return; }
			var collection = Fn.getPath(path, Sparky.data);
			return collection && collection.find(id);
		}),

		first: Fn.get(0),

		floatformat: curry(function(n, value) {
			return typeof value === 'number' ? Number.prototype.toFixed.call(value, n) :
				!isDefined(value) ? '' :
				(Sparky.debug && console.warn('Sparky: filter floatformat: ' + n + ' called on non-number ' + value)) ;
		}),

		floor: function(value) {
			return Math.floor(value);
		},

		"greater-than": curry(function(value1, value2) {
			return value2 > value1;
		}),

		invert: function(value) {
			return typeof value === 'number' ? 1 / value : !value ;
		},

		join: curry(function(string, value) {
			return Array.prototype.join.call(value, string);
		}),

		json: function(value) {
			return JSON.stringify(value);
		},

		last: function(value) {
			return value[value.length - 1];
		},

		length: function(value) {
			return value.length;
		},

		"less-than": curry(function(value2, str1, str2, value1) {
			return value1 < value2 ? str1 : str2 ;
		}),

		//length_is
		//linebreaks

		//linebreaksbr: (function() {
		//	var rbreaks = /\n/;
		//
		//	return function(value) {
		//		return value.replace(rbreaks, '<br/>')
		//	};
		//})(),

		localise: curry(function(digits, value) {
			var locale = document.documentElement.lang;
			var options = {};

			if (isDefined(digits)) {
				options.minimumFractionDigits = digits;
				options.maximumFractionDigits = digits;
			}

			// Todo: localise value where toLocaleString not supported
			return value.toLocaleString ? value.toLocaleString(locale, options) : value ;
		}),

		lowercase: function(value) {
			if (typeof value !== 'string') { return; }
			return String.prototype.toLowerCase.apply(value);
		},

		map: curry(function(method, path, array) {
			return array && array.map(Sparky.transforms[method](path));
		}),

		//mod: curry(function(n, value) {
		//	if (typeof value !== 'number') { return; }
		//	return value % n;
		//}),

		pluralise: curry(function(str1, str2, lang, value) {
			if (typeof value !== 'number') { return; }

			str1 = str1 || '';
			str2 = str2 || 's';

			// In French, numbers less than 2 are considered singular, where in
			// English, Italian and elsewhere only 1 is singular.
			return lang === 'fr' ?
				(value < 2 && value >= 0) ? str1 : str2 :
				value === 1 ? str1 : str2 ;
		}),

		postpad: curry(function(n, value) {
			var string = isDefined(value) ? value.toString() : '' ;
			var l = string.length;
			var m = parseInt(n, 10);

			return m === l ? value :
				m > l ? string + spaces(m - l) :
				string.substring(0, m) ;
		}),

		prepad: curry(function(n, char, value) {
			var string = isDefined(value) ? value.toString() : '' ;
			var l = string.length;
			var array = [];

			// String is longer then padding: let it through unprocessed
			if (n - l < 1) { return value; }

			array.length = 0;
			array.length = n - l;
			array.push(string);
			return array.join(char || ' ');
		}),

		random: function(value) {
			return value[Math.floor(Math.random() * value.length)];
		},

		reduce: curry(function(name, initialValue, array) {
			return array && array.reduce(Fn[name], initialValue || 0);
		}),

		replace: curry(function(str1, str2, value) {
			if (typeof value !== 'string') { return; }
			return value.replace(RegExp(str1, 'g'), str2);
		}),

		round: Math.round,

		//reverse

		//safe: function(string) {
		//	if (typeof string !== string) { return; }
		//	// Actually, we can't do this here, because we cant return DOM nodes
		//	return;
		//},

		//safeseq

		slice: curry(function(i0, i1, value) {
			return typeof value === 'string' ?
				value.slice(i0, i1) :
				Array.prototype.slice.call(value, i0, i1) ;
		}),

		//sort
		//stringformat

		striptags: (function() {
			var rtag = /<(?:[^>'"]|"[^"]*"|'[^']*')*>/g;

			return function(value) {
				return value.replace(rtag, '');
			};
		})(),

		switch: function(value) {
			if (typeof value === 'string') { value = parseInt(value, 10); }
			if (typeof value !== 'number' || Number.isNaN(value)) { return; }
			return arguments[value + 1];
		},

		symbolise: function(value) {
			// Takes infinity values and convert them to infinity symbol
			var string = value + '';
			var infinity = Infinity + '';

			if (string === infinity) { return '∞'; }
			if (string === ('-' + infinity)) { return '-∞'; }
			return value;
		},

		time: function() {

		},

		//timesince
		//timeuntil
		//title

		trans: (function() {
			var warned = {};

			return function(value) {
				var translations = Sparky.data.translations;

				if (!translations) {
					if (!warned.missingTranslations) {
						console.warn('Sparky: Missing lookup object Sparky.data.translations');
						warned.missingTranslations = true;
					}
					return value;
				}

				var text = translations[value] ;

				if (!text) {
					if (!warned[value]) {
						console.warn('Sparky: Sparky.data.translations contains no translation for "' + value + '"');
						warned[value] = true;
					}

					return value;
				}

				return text ;
			};
		})(),

		truncatechars: curry(function(n, value) {
			return value.length > n ?
				value.slice(0, n) + '…' :
				value ;
		}),

		type: function(value) {
			return typeof value;
		},

		//truncatewords
		//truncatewords_html
		//unique

		uppercase: function(value) {
			if (typeof value !== 'string') { return; }
			return String.prototype.toUpperCase.apply(value);
		},

		//urlencode
		//urlize
		//urlizetrunc
		//wordcount
		//wordwrap

		yesno: curry(function(truthy, falsy, value) {
			return value ? truthy : falsy ;
		})
	});
})(this);
