// Object.assign polyfill
//
// Object.assign(target, source1, source2, ...)
//
// All own enumerable properties are copied from the source
// objects to the target object.

(Object.assign || (function(Object) {
	"use strict";

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function ownPropertyKeys(object) {
		var keys = Object.keys(object);
		var symbols, n, descriptor;

		if (Object.getOwnPropertySymbols) {
			symbols = Object.getOwnPropertySymbols(object);
			n = symbols.length;

			while (n--) {
				descriptor = Object.getOwnPropertyDescriptor(object, symbols[n]);

				if (descriptor.enumerable) {
					keys.push(symbol);
				}
			}
		}

		return keys;
	}

	Object.defineProperty(Object, 'assign', {
		value: function (target) {
			if (!isDefined(target)) {
				throw new TypeError('Object.assign: First argument ' + target + ' cannot be converted to object.');
			}

			var object = Object(target);
			var n, source, keys, key, k;

			for (n = 1; n < arguments.length; n++) {
				source = arguments[n];

				// Ignore any undefined sources
				if (!isDefined(source)) { continue; }

				// Get own enumerable keys and symbols
				keys = ownPropertyKeys(Object(source));
				k = keys.length;

				// Copy key/values to target object
				while (k--) {
					key = keys[k];
					object[key] = source[key];
				}
			}

			return object;
		},

		configurable: true,
		writable: true
	});
})(Object));


// Number.isNaN(n) polyfill

if (!Number.isNaN) {
	if (window.console) { console.log('Polyfill: Number.isNaN()'); }

	(function(globalIsNaN) {
		"use strict";
	
		Object.defineProperty(Number, 'isNaN', {
			value: function isNaN(value) {
				return typeof value === 'number' && globalIsNaN(value);
			},
			configurable: true,
			enumerable: false,
			writable: true
		});
	})(isNaN);
}

if (!Math.log10) {
	if (window.console) { console.log('Polyfill: Math.log10()'); }

	Math.log10 = function log10(n) {
		return Math.log(n) / Math.LN10;
	};
}

// window.requestAnimationFrame polyfill

(function(window) {
	var frameDuration = 40;
	var vendors = ['ms', 'moz', 'webkit', 'o'];
	var n = vendors.length;

	while (n-- && !window.requestAnimationFrame) {
		window.requestAnimationFrame = window[vendors[n]+'RequestAnimationFrame'];
		window.cancelAnimationFrame = window[vendors[n]+'CancelAnimationFrame'] || window[vendors[n]+'CancelRequestAnimationFrame'];
	}

	if (!window.requestAnimationFrame) {
		if (window.console) { console.log('Polyfill: requestAnimationFrame()'); }

		window.requestAnimationFrame = function(callback, element) {
			var currTime = +new Date();
			var nextTime = frameDuration - (currTime % frameDuration);
			var id = window.setTimeout(function() { callback(nextTime); }, nextTime);
			return id;
		};
	}

	if (!window.cancelAnimationFrame) {
		window.cancelAnimationFrame = function(id) {
			clearTimeout(id);
		};
	}
})(window);

(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('Fn     – https://github.com/stephband/fn');
})(this);

(function(window) {
	"use strict";


	// Import

	var A = Array.prototype;
	var N = Number.prototype;
	var O = Object.prototype;
	var S = String.prototype;

	var debug = true;


	// Define

	var empty = Object.freeze(Object.defineProperties([], {
		shift: { value: noop }
	}));

	// Constant for converting radians to degrees
	var angleFactor = 360 / (Math.PI * 2);


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

	function setFunctionProperties(string, parity, fn1, fn2) {
		// Make the string representation of this function equivalent to fn
		fn2.toString = function() {
			return /function\s*[\w\d]*\s*\([,\w\d\s]*\)/.exec(fn1.toString()) + ' { [' + string + '] }';
		};

		// Where possible, define length so that curried functions show how
		// many arguments they are yet expecting
		if (isFunctionLengthDefineable) {
			Object.defineProperty(fn2, 'length', { value: parity });
		}
	}


	// Functional functions

	var loggers = [];

	function noop() {}

	function id(object) { return object; }

	function call(fn) {
		return fn();
	}

	function invoke(n, fn) {
		return fn(n);
	}

	function bind(values, fn) {
		var params = [null];
		params.push.apply(params, values);
		return fn.bind.apply(fn, params);
	}

	function compose(fn2, fn1) {
		return function composed(n) {
			return fn2(fn1(n));
		};
	}

	function pipe() {
		var a = arguments;
		return function piped(n) {
			return A.reduce.call(a, invoke, n);
		};
	}

	function cache(fn) {
		var map = new Map();

		function cached(object) {
			if (arguments.length !== 1) {
				throw new Error('Fn: Cached function called with ' + arguments.length + ' arguments. Accepts exactly 1.');
			}

			if (map.has(object)) {
				return map.get(object);
			}

			var result = fn(object);
			map.set(object, result);
			return result;
		}

		if (debug) {
			setFunctionProperties('cached function', 1, fn, cached);
		}

		return cached;
	}

	function curry(fn, parity) {
		parity = parity || fn.length;

		if (parity < 2) { return fn; }

		var curried = function curried() {
			var a = arguments;
			return a.length >= parity ?
				// If there are enough arguments, call fn.
				fn.apply(this, a) :
				// Otherwise create a new function. And curry that. The param is
				// declared so that partial has length 1.
				curry(function partial(param) {
					var params = A.slice.apply(a);
					A.push.apply(params, arguments);
					return fn.apply(this, params);
				}, parity - a.length) ;
		};

		if (debug) {
			setFunctionProperties('curried function', parity, fn, curried);
		}

		return curried;
	}

	function cacheCurry(fn, parity) {
		parity = parity || fn.length;

		if (parity < 2) { return cache(fn); }

		var memo = cache(function partial(object) {
			return cacheCurry(function() {
				var params = [object];
				A.push.apply(params, arguments);
				return fn.apply(null, params);
			}, parity - 1) ;
		});

		// For convenience, allow curried functions to be called as:
		// fn(a, b, c)
		// fn(a)(b)(c)
		// fn(a, b)(c)
		function curried() {
			return arguments.length > 1 ?
				memo(arguments[0]).apply(null, A.slice.call(arguments, 1)) :
				memo(arguments[0]) ;
		}

		if (debug) {
			setFunctionProperties('cached and curried function', parity, fn, curried);
		}

		return curried;
	}

	function overloadLength(object) {
		return function overload() {
			var length = arguments.length;
			var fn = object[length] || object.default;

			if (fn) {
				return fn.apply(this, arguments);
			}

			console.warn('Fn: method overload for ' + length + ' arguments not available');
			return this;
		}
	}

	function overloadTypes(map) {
		return function overload() {
			var types = Array.prototype.map.call(arguments, toType);
			var fn = map[types] || map['default'];

			if (!fn) {
				console.warn('Fn: method overload for type (' + types + ') not available')
				return;
			}

			return fn.apply(this, arguments);
		};
	}


	// Array functions

	function sortedSplice(array, fn, value) {
		// Splices value into array at position determined by result of fn,
		// where result is either in the range [-1, 0, 1] or [true, false]
		var n = array.length;
		while (n-- && fn(array[n], value) > 0);
		array.splice(++n, 0, value);
	}

	function shiftSparse(array) {
		// Shift values ignoring undefined holes
		var value;
		while (array.length) {
			value = A.shift.apply(array);
			if (value !== undefined) { return value; }
		}
	}

	function byGreater(a, b) {
		return a === b ? 0 : a > b ? 1 : -1 ;
	}


	// Get and set paths

	var rpathtrimmer  = /^\[|\]$/g;
	var rpathsplitter = /\]?(?:\.|\[)/g;
	var rpropselector = /(\w+)=(\w+)/;

	function isObject(obj) { return obj instanceof Object; }

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function select(object, selector) {
		var selection = rpropselector.exec(selector);

		return selection ?
			findByProperty(object, selection[1], JSON.parse(selection[2])) :
			Fn.get(selector, object) ;
	}

	function findByProperty(array, name, value) {
		// Find first matching object in array
		var n = -1;

		while (++n < array.length) {
			if (array[n] && array[n][name] === value) {
				return array[n];
			}
		}
	}

	function objFrom(object, array) {
		var key = array.shift();
		var value = select(object, key);

		return array.length === 0 ? value :
			Fn.isDefined(value) ? objFrom(value, array) :
			value ;
	}

	function objTo(root, array, value) {
		var key = array.shift();

		if (array.length === 0) {
			Fn.set(key, value, root);
			return value;
		}

		var object = Fn.get(key, root);
		if (!isObject(object)) { object = {}; }

		Fn.set(key, object, root);
		return objTo(object, array, value) ;
	}


	// String types

	var regex = {
		url:       /^(?:\/|https?:\/\/)(?:[!#$&-;=?-~\[\]\w]|%[0-9a-fA-F]{2})+$/,
		//url:       /^([a-z][\w\.\-\+]*\:\/\/)[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,6}/,
		email:     /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
		date:      /^\d{4}-(?:0[1-9]|1[012])-(?:0[1-9]|[12][0-9]|3[01])$/,
		hexColor:  /^(#)?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
		hslColor:  /^(?:(hsl)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?(\))?$/,
		rgbColor:  /^(?:(rgb)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?(\))?$/,
		hslaColor: /^(?:(hsla)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		rgbaColor: /^(?:(rgba)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		cssValue:  /^(\-?\d+(?:\.\d+)?)(px|%|em|ex|pt|in|cm|mm|pt|pc)?$/,
		cssAngle:  /^(\-?\d+(?:\.\d+)?)(deg)?$/,
		image:     /(?:\.png|\.gif|\.jpeg|\.jpg)$/,
		float:     /^(\-?\d+(?:\.\d+)?)$/,
		int:       /^(\-?\d+)$/
	};


	// Throttle

	// Returns a function 

	var requestAnimationFrame = window.requestAnimationFrame;

	var now = window.performance && window.performance.now ? function now() {
		return window.performance.now();
	} : function now() {
		return +new Date();
	} ;

	function createRequestTimerFrame(time) {
		var timer = false;
		var t = 0;
		var fns = [];

		function timed() {
			timer = false;
			t = now();
			fns.forEach(Fn.run([now()]));
			fns.length = 0;
		}

		return function requestTimerFrame(fn) {
			// Add fn to queue
			if (timer) {
				fns.push(fn);
				return;
			}

			var n = now();

			// Set the timer
			if (t + time > n) {
				fns.push(fn);
				timer = setTimeout(timed, time + t - n);
				return;
			}

			t = n;
			fn(t);
			return;
		};
	}

	function Throttle(fn, time) {
		var request = time ?
			createRequestTimerFrame(time * 1000) :
			requestAnimationFrame ;

		var queue = function() {
			// Don't queue update if it's already queued
			if (queued) { return; }
			queued = true;

			// Queue update
			request(update);
		};

		var queued, context, a;

		function update() {
			queued = false;
			fn.apply(context, a);
		}

		function cancel() {
			// Don't permit further changes to be queued
			queue = noop;

			// If there is an update queued apply it now
			if (queued) { update(); }

			// Make the queued update do nothing
			fn = noop;
		}

		function throttle() {
			// Store the latest context and arguments
			context = this;
			a = arguments;

			// Queue the update
			queue();
		}

		throttle.cancel = cancel;
		return throttle;
	}


	// Hold

	// Returns a function that waits for `time` seconds without being called
	// before calling fn with the latest context and arguments.

	function Hold(fn, time) {
		var timer;

		var queue = function() {
			clearTimeout(timer);
			// Set time in milliseconds
			timer = setTimeout(update, (time || 0) * 1000);
		};

		var context, a;

		function update() {
			fn.apply(context, a);
		}

		function cancel() {
			// Don't permit further changes to be queued
			queue = noop;

			// If there is an update queued apply it now
			clearTimeout(timer);
		}

		function hold() {
			// Store the latest context and arguments
			context = this;
			a = arguments;

			// Queue the update
			queue();
		}

		hold.cancel = cancel;
		return hold;
	}


	// Fn

	function Fn(fn) {
		if (!this || !Fn.prototype.isPrototypeOf(this)) {
			return new Fn(fn);
		}

		var source = this;
		var buffer;

		if (!fn) {
			this.shift = noop;
			return;
		}

		if (typeof fn === "function") {
			this.shift = fn;
			return;
		}

		// fn is an object with a shift function
		if (typeof fn.shift === "function" && fn.length === undefined) {
			this.shift = function shift() {
				if (source.status === 'done') { return; }
				var value = fn.shift();
				if (fn.status === "done") { source.status = 'done'; }
				return value;
			};
			return;
		}

		// fn is an iterator
		if (typeof fn.next === "function") {
			this.shift = function shift() {
				if (source.status === 'done') { return; }
				var result = fn.next();
				if (result.done) { source.status = 'done'; }
				return result.value;
			};
			return;
		}

		// fn is an arguments object, maybe from Fn.of()
		if (Fn.toClass(fn) === "Arguments") {
			this.shift = function shift() {
				if (source.status === 'done') { return; }
				var result = shiftSparse(fn);
				if (result === undefined) { source.status = "done"; }
				return result;
			};
			return;
		}

		// fn is an array or array-like object
		buffer = A.slice.apply(fn);
		this.shift = function shift() {
			if (source.status === 'done') { return; }
			return buffer.shift();
		};
	}

	function create(object, fn) {
		var functor = Object.create(object);
		functor.shift = fn;
		return functor;
	}

	Object.assign(Fn.prototype, {
		// Input

		of: function() {
			// Delegate to the constructor's .of()
			return this.constructor.of.apply(this.constructor, arguments);
		},


		// Transform

		process: function(fn) { return fn(this); },

		ap: function ap(object) {
			var fn = this.shift();
			if (fn === undefined) { return; }
			return object.map(fn);
		},

		map: function(fn) {
			return create(this, Fn.compose(function map(object) {
				return object === undefined ? undefined : fn(object) ;
			}, this.shift));
		},

		filter: function(fn) {
			var source = this;

			return create(this, function filter() {
				var value;
				while ((value = source.shift()) !== undefined && !fn(value));
				return value;
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

		dedup: function() {
			var value;
			return this.filter(function(newValue) {
				var oldValue = value;
				value = newValue;
				return oldValue !== newValue;
			});
		},

		join: function() {
			var source = this;
			var buffer = empty;

			return create(this, function join(object) {
				var value = buffer.shift();
				if (value !== undefined) { return value; }
				buffer = source.shift();
				if (buffer !== undefined) { return join(object); }
				buffer = empty;
			});
		},

		chain: function(fn) {
			return this.map(fn).join();
		},

		concat: function(object) {
			var source = this;
			return create(this, function concat() {
				var value = source.shift();

				if (value === undefined) {
					value = object.shift();
				}

				return value;
			});
		},

		// Todo: Perhaps CueTimer should become part of Fn?
		cue: function(request, cancel, cuetime, map, test) {
			var source    = this;
			var cuestream = Stream.of();
			var startTime = -Infinity;
			var stopTime  = Infinity;
			var t1        = startTime;
			var value, mappedValue;

			function cue(time) {
				var t2 = time >= stopTime ? stopTime : time ;

				if (value === undefined) {
					while ((value = source.shift()) !== undefined && (mappedValue = map(value)) !== undefined && test(t1, t2, mappedValue)) {
						cuestream.push(mappedValue);
						value = undefined;
					}
				}
				else {
					mappedValue = map(value);

					if (mappedValue !== undefined && test(t1, t2, mappedValue)) {
						cuestream.push(mappedValue);

						while ((value = source.shift()) !== undefined && (mappedValue = map(value)) !== undefined && test(t1, t2, mappedValue)) {
							cuestream.push(mappedValue);
							value = undefined;
						}
					}
				}

				if (source.status === 'done') { return; }
				if (time === stopTime) { return; }

				t1 = startTime > time ? startTime : time ;
				request(cue);
			}

			cuestream.stop = function stop(time) {
				stopTime = time;
				if (stopTime <= t1) { cancel(cue); }
				return this;
			};

			cuestream.start = function start(time) {
				startTime = time;
				t1 = startTime;

				if (startTime >= cuetime()) {
					// This is ok even when cuetime() is -Infinity, because the
					// first request() goes through the timer synchronously, ie
					// immediately
					request(cue);
				}
				else {
					cue(cuetime());
				}

				return this;
			};

			return cuestream;
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

		head: function() {
			var source = this;

			return create(this, function head() {
				if (source.status === 'done') { return; }
				source.status = 'done';
				return source.shift();
			});
		},

		tail: function() {
			var source = this;
			var i = 0;

			return create(this, function tail() {
				if (i++ === 0) { source.shift(); }
				return source.shift();
			});
		},

		last: function() {
			var source = this;
			var i = 0;

			return create(this, function last() {
				var n;

				source.each(function(value) {
					n = value;
				});

				return n;
			});
		},

		slice: function(n, m) {
			var source = this;
			var i = -1;

			return create(this, function slice() {
				while (++i < n) {
					source.shift();
				}

				if (i < m) {
					if (i === m - 1) { this.status = 'done'; }
					return source.shift();
				}
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

		batch: function(n) {
			var source = this;
			var buffer = [];

			return create(this, n ?
				// If n is defined batch into arrays of length n.
				function nextBatchN() {
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
				function nextBatch() {
					buffer = source.toArray();
					// An empty array is equivalent to undefined
					return buffer.length ? buffer : undefined ;
				});
		},

		group: function(fn) {
			var source = this;
			var buffer = [];
			var streams = new Map();

			fn = fn || Fn.id;

			function group() {
				var array = [];
				var stream = Stream(function group() {
					if (!array.length) {
						// Pull until a new value is added to the current stream
						pullUntil(Fn.is(stream));
					}

					return array.shift();
				}, function push() {
					array.push.apply(array, arguments);
				});

				buffer.push(stream);
				return stream;
			}

			function pullUntil(check) {
				var value = source.shift();
				if (value === undefined) { return; }
				var key = fn(value);
				var stream = streams.get(key);

				if (stream === undefined) {
					stream = group();
					streams.set(key, stream);
				}

				stream.push(value);
				return check(stream) || pullUntil(check);
			}

			function isBuffered() {
				return !!buffer.length;
			}

			return create(this, function group() {
				// Pull until a new stream is available
				pullUntil(isBuffered);
				return buffer.shift();
			});
		},

		//groupTo: function(fn, object) {
		//	var source = this;
		//
		//	function group() {
		//		var array = [];
		//		return Stream(function group() {
		//			if (!array.length) {
		//				// Pull until a new value is added to the current stream
		//				pullAll();
		//			}
		//			return array.shift();
		//		}, function push() {
		//			array.push.apply(array, arguments);
		//		});
		//	}
		//
		//	function pullAll() {
		//		var value = source.shift();
		//		if (value === undefined) { return; }
		//		var key = fn(value);
		//		var stream = Fn.get(key, object);
		//
		//		if (stream === undefined) {
		//			stream = group();
		//			Fn.set(key, stream, object);
		//		}
		//
		//		stream.push(value);
		//		return pullAll();
		//	}
		//
		//	return create(this, function group() {
		//		if (source.status === 'done') { return; }
		//		source.status = 'done';
		//		pullAll();
		//		return object;
		//	});
		//},

		scan: function(fn, seed) {
			// seed defaults to 0
			seed = arguments.length > 1 ? seed : 0 ;
			var i = 0;
			return this.map(function scan(value) {
				return (seed = fn(seed, value, i++));
			});
		},

		unique: function() {
			var source = this;
			var values = [];

			return create(this, function unique() {
				var value = source.shift();
				if (value === undefined) { return; }

				if (values.indexOf(value) === -1) {
					values.push(value);
					return value;
				}

				return unique();
			});
		},

		assign: function(object) { return this.map(Fn.assign(object)); },

		parse: function() { return this.map(JSON.parse); },

		stringify: function() { return this.map(Fn.stringify); },


		// Output

		next: function() {
			var value = this.shift();
			return {
				done: value === undefined,
				value: value
			};
		},

		pipe: function(stream) {
			if (!stream || !stream.push) {
				throw new Error('Fn: Fn.pipe(object) object must be a pushable stream. (' + stream + ')');
			}

			var source = this;

			if (stream.push && source.on) {
				source.on('push', stream.push);
			}

			stream.on('pull', function pull() {
				var value = source.shift();
				if (source.status === 'done') { stream.off('pull', pull); }
				return value;
			});

			return stream;
		},

		clone: function() {
			var shift = this.shift;
			var buffer1 = [];
			var buffer2 = [];

			function fill() {
				var value = shift();
				if (value === undefined) { return; }
				buffer1.push(value);
				buffer2.push(value);
			}

			this.shift = function() {
				if (!buffer1.length) { fill(); }
				return buffer1.shift();
			};

			return create(this, function clone() {
				if (!buffer2.length) { fill(); }
				return buffer2.shift();
			});
		},

		tap: function(fn) {
			// Overwrite shift to copy values to tap fn
			this.shift = Fn.compose(function(value) {
				if (value !== undefined) { fn(value); }
				return value;
			}, this.shift);

			return this;
		},

		each: function(fn) {
			var value;

			while ((value = this.shift()) !== undefined) {
				fn(value);
			}

			return this;
		},

		reduce: function(fn, value) {
			var output = Fn.isDefined(value) ? value : 0 ;

			while ((value = this.shift()) !== undefined) {
				output = fn(output, value);
			}

			return output;
		},

		find: function(fn) {
			return this.filter(fn).head().shift();
		},

		toJSON: function() {
			return this.reduce(function(t, v) {
				t.push(v);
				return t;
			}, []);
		},

		toFunction: function() {
			var source = this;
			return function fn() {
				if (arguments.length) {
					this.push.apply(this, arguments);
				}
				return source.shift();
			};
		},

		log: function() {
			var a = arguments;

			return this.tap(function(object) {
				console.log.apply(console, Fn.push(object, A.slice.apply(a)));
			});
		}
	});

	Fn.prototype.toArray = Fn.prototype.toJSON;

	if (window.Symbol) {
		Fn.prototype[Symbol.iterator] = function() {
			return this;
		};
	}

	Object.assign(Fn, {
		of: function of() { return new this(arguments); },

		empty:          empty,
		noop:           noop,
		id:             id,
		cache:          cache,
		curry:          curry,
		cacheCurry:     cacheCurry,
		compose:        compose,
		pipe:           pipe,
		overloadLength: overloadLength,
		overloadTypes:  overloadTypes,

		returnThis: function() { return this; },

		is: curry(function is(a, b) { return a === b; }),

		equals: curry(function equals(a, b) {
			// Fast out if references are for the same object.
			if (a === b) { return true; }

			if (typeof a !== 'object' || typeof b !== 'object') { return false; }

			var akeys = Object.keys(a);
			var bkeys = Object.keys(b);

			if (akeys.length !== bkeys.length) { return false; }

			var n = akeys.length;

			while (n--) {
				if (!equals(a[akeys[n]], b[akeys[n]])) {
					return false;
				}
			}

			return true;
		}),

		isGreater: curry(function byGreater(a, b) { return b > a ; }),

		by: curry(function by(property, a, b) {
			return byGreater(a[property], b[property]);
		}),

		byGreater: curry(byGreater),

		byAlphabet: curry(function byAlphabet(a, b) {
			return S.localeCompare.call(a, b);
		}),

		assign: curry(Object.assign, 2),

		get: curry(function get(key, object) {
			return object && (typeof object.get === "function" ?
				object.get(key) :
				// Coerse null to undefined
				object[key] === null ?
					undefined :
					object[key]
			);
		}),

		set: curry(function set(key, value, object) {
			return typeof object.set === "function" ?
				object.set(key, value) :
				(object[key] = value) ;
		}),

		getPath: curry(function get(path, object) {
			return object && (object.get ? object.get(path) :
				typeof path === 'number' ? object[path] :
				path === '' || path === '.' ? object :
				objFrom(object, splitPath(path))) ;
		}),

		setPath: curry(function set(path, value, object) {
			if (object.set) { object.set(path, value); }
			if (typeof path === 'number') { return object[path] = value; }
			var array = splitPath(path);
			return array.length === 1 ?
				(object[path] = value) :
				objTo(object, array, value);
		}),

		bind: curry(bind),

		invoke: curry(function invoke(name, args, object) {
			return object[name].apply(object, args);
		}),

		run: curry(function apply(values, fn) {
			return fn.apply(null, values);
		}),

		map: curry(function map(fn, object) {
			return object.map ? object.map(fn) : A.map.call(object, fn);
		}),

		find: curry(function find(fn, object) {
			return object.find ? object.find(fn) : A.find.call(object, fn);
		}),

		throttle: function(time, fn) {
			// Overload the call signature to support Fn.throttle(fn)
			if (fn === undefined && time.apply) {
				fn = time;
				time = undefined;
			}

			function throttle(fn) {
				return Throttle(fn, time);
			}

			// Where fn not given return a partially applied throttle
			return fn ? throttle(fn) : throttle ;
		},

		requestTick: (function(promise) {
			return function(fn) {
				promise.then(fn);
			};
		})(Promise.resolve()),

		entries: function(object){
			return typeof object.entries === 'function' ?
				object.entries() :
				A.entries.apply(object) ;
		},

		keys: function(object){
			return typeof object.keys === 'function' ?
				object.keys() :

				/* Don't use Object.keys(), it returns an array,
				   not an iterator. */
				A.keys.apply(object) ;
		},

		values: function(object){
			return typeof object.values === 'function' ?
				object.values() :
				A.values.apply(object) ;
		},

		each: curry(function each(fn, object) {
			return object && (
				object.each ? object.each(fn) :
				object.forEach ? object.forEach(function(item) { fn(item); }) :
				A.forEach.call(object, function(item) { fn(item); })
			);
		}),

		concat:   curry(function concat(array2, array1) { return array1.concat ? array1.concat(array2) : A.concat.call(array1, array2); }),

		filter:   curry(function filter(fn, object) { return object.filter ? object.filter(fn) : A.filter.call(object, fn); }),

		reduce:   curry(function reduce(fn, n, object) { return object.reduce ? object.reduce(fn, n) : A.reduce.call(object, fn, n); }),

		slice:    curry(function slice(n, m, object) { return object.slice ? object.slice(n, m) : A.slice.call(object, n, m); }),

		sort:     curry(function sort(fn, object) { return object.sort ? object.sort(fn) : A.sort.call(object, fn); }),

		push:     curry(function push(value, object) {
			(object.push || A.push).call(object, value);
			return object;
		}),

		intersect: curry(function intersect(arr1, arr2) {
			// A fast intersect that assumes arrays are sorted (ascending) numbers.
			var l1 = arr1.length, l2 = arr2.length,
			    i1 = 0, i2 = 0,
			    arr3 = [];
		
			while (i1 < l1 && i2 < l2) {
				if (arr1[i1] === arr2[i2]) {
					arr3.push(arr1[i1]);
					++i1;
					++i2;
				}
				else if (arr2[i2] > arr1[i1]) {
					++i1;
				}
				else {
					++i2;
				}
			}
		
			return arr3;
		}),

		diff: curry(function(arr1, arr2) {
			// A fast diff that assumes arrays are sorted (ascending) numbers.
			var l1 = arr1.length, l2 = arr2.length,
			    i1 = 0, i2 = 0,
			    arr3 = [], n;
		
			while (i1 < l1) {
				while (i2 < l2 && arr1[i1] > arr2[i2]) {
					arr3.push(arr2[i2]);
					++i2;
				}
		
				if (arr1[i1] !== arr2[i2]) {
					arr3.push(arr1[i1]);
				}
		
				n = arr1[i1];
				while (n === arr1[i1] && ++i1 < l1);
				while (n === arr2[i2] && ++i2 < l2);
			}
		
			while (i2 < l2) {
				arr3.push(arr2[i2]);
				++i2;
			}
		
			return arr3;
		}),
	
		unite: curry(function unite(arr1, arr2) {
			return arr1.concat(arr2).filter(unique).sort(Fn.byGreater);
		}),

		randomGaussian: function randomGaussian(n) {
			// Returns a random number with a bell curve probability centred
			// around 0 with limits -n to n.
			return n * (Math.random() + Math.random() - 1);
		},

		add:      curry(function add(a, b) { return b + a; }),

		multiply: curry(function multiply(a, b) { return b * a; }),

		mod:      curry(function mod(a, b) { return b % a; }),

		pow:      curry(function pow(a, b) { return Math.pow(b, a); }),

		min:      curry(function min(a, b) { return a > b ? b : a ; }),

		max:      curry(function max(a, b) { return a < b ? b : a ; }),

		limit:    curry(function limit(min, max, n) { return n > max ? max : n < min ? min : n ; }),

		wrap:     curry(function wrap(min, max, n) { return (n < min ? max : min) + (n - min) % (max - min); }),

		degToRad: function toDeg(n) { return n / angleFactor; },

		radToDeg: function toRad(n) { return n * angleFactor; },

		toPolar:  function setPolar(cartesian) {
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

		toCartesian: function setCartesian(polar) {
			var d = polar[0];
			var a = polar[1];

			return [
				Math.sin(a) * d ,
				Math.cos(a) * d
			];
		},

		// conflicting properties not allowed in strict mode
		// log:         curry(function log(base, n) { return Math.log(n) / Math.log(base); }),
		nthRoot:     curry(function nthRoot(n, x) { return Math.pow(x, 1/n); }),

		gcd: function gcd(a, b) {
			// Greatest common divider
			return b ? gcd(b, a % b) : a ;
		},

		lcm: function lcm(a, b) {
			// Lowest common multiple.
			return a * b / Fn.gcd(a, b);
		},

		factorise: function factorise(n, d) {
			// Reduce a fraction by finding the Greatest Common Divisor and
			// dividing by it.
			var f = Fn.gcd(n, d);
			return [n/f, d/f];
		},

		normalise:   curry(function normalise(min, max, value) { return (value - min) / (max - min); }),

		denormalise: curry(function denormalise(min, max, value) { return value * (max - min) + min; }),

		toFixed:     curry(function toFixed(n, value) { return N.toFixed.call(value, n); }),

		rangeLog:    curry(function rangeLog(min, max, n) {
			return Fn.denormalise(min, max, Math.log(n / min) / Math.log(max / min))
		}),

		rangeLogInv: curry(function rangeLogInv(min, max, n) {
			return min * Math.pow(max / min, Fn.normalise(min, max, n));
		}),

		dB: function(n) {
			return this.map(function(value) {
				return 20 * Math.log10(value);
			});
		},


		// Strings

		match:       curry(function match(regex, string) { return regex.test(string); }),

		exec:        curry(function parse(regex, string) { return regex.exec(string) || undefined; }),

		replace:     curry(function replace(regex, fn, string) { return string.replace(regex, fn); }),

		slugify: function slugify(string) {
			if (typeof string !== 'string') { return; }
			return string.trim().toLowerCase().replace(/[\W_]/g, '-');
		},


		// Booleans
		not: function not(object) { return !object; },


		// Types

		isDefined: function isDefined(value) {
			// !!value is a fast out for non-zero numbers, non-empty strings
			// and other objects, the rest checks for 0, '', etc.
			return !!value || (value !== undefined && value !== null && !Number.isNaN(value));
		},

		toType: function toType(object) {
			return typeof object;
		},

		toClass: function toClass(object) {
			return O.toString.apply(object).slice(8, -1);
		},

		toArray: function(object) {
			return object.toArray ?
				object.toArray() :
				Fn(object).toArray() ;
		},

		toInt: function(n) {
			return parseInt(n, 10);
		},

		toFloat: parseFloat,

		toPlainText: function toPlainText(string) {
			return string
			// Decompose string to normalized version
			.normalize('NFD')
			// Remove accents
			.replace(/[\u0300-\u036f]/g, '');
		},

		toStringType: (function(regex, types) {
			return function toStringType(string) {
				// Determine the type of string from its text content.
				var n = -1;

				// Test regexable string types
				while (++n < types.length) {
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
		})(regex, ['date', 'url', 'email', 'int', 'float']),


		// JSON
		stringify: function stringify(object) {
			return JSON.stringify(Fn.toClass(object) === "Map" ?
				Fn(object) : object
			);
		},

		log: curry(function(text, object) {
			console.log(text, object);
			return object;
		})
	});


	// Stream

	var eventsSymbol = Symbol('events');

	function Stream(shift, push, stop) {
		// Enable construction without the `new` keyword
		if (!Stream.prototype.isPrototypeOf(this)) {
			return new Stream(shift, push, stop);
		}

		var stream = this;

		this.shift = shift;

		if (push) {
			this.push = function() {
				push.apply(stream, arguments);
				trigger('push', stream);
			};
		}

		if (stop) { stream.stop = stop; }

		stream[eventsSymbol] = {};
	}

	Stream.prototype = Object.create(Fn.prototype);

	function latest(source) {
		var value, v;

		while ((v = source.shift()) !== undefined) {
			value = v;
		}
		
		return value;
	}

	function getEvents(object) {
		return object[eventsSymbol] || (object[eventsSymbol] = {});
	}

	function trigger(type, object) {
		var events = object[eventsSymbol];
		// Todo: make sure forEach is acting on a copy of events[type] ?
		events && events[type] && events[type].forEach(call);
	}

	Object.assign(Stream.prototype, {
		on: function(type, fn) {
			var events = this[eventsSymbol];
			var listeners = events[type] || (events[type] = []);
			listeners.push(fn);
			return this;
		},

		off: function(type, fn) {
			var events = this[eventsSymbol];
			var listeners = events[type];
			if (!listeners) { return; }
			var n = listeners.length;
			while (n--) {
				if (listeners[n] === fn) { listeners.splice(n, 1); }
			}
			return this;
		},

		stop: function() {
			this.status = "done";
			trigger('done', this);
		},

		ap: function ap(object) {
			var source = this;
			return create(this, function ap() {
				var fn = source.shift();
				if (fn === undefined) { return; }
				return object.map(fn);
			});
		},

		push: function error() {
			throw new Error('Fn: ' + this.constructor.name + ' is not pushable.');
		},

		each: function(fn) {
			var source = this;
			var a = arguments;

			function each() {
				// Delegate to Fn.each()
				Fn.prototype.each.apply(source, a);
			}

			// Flush and observe
			each();
			return this.on('push', each);
		},

		pipe: function(stream) {
			// Delegate to Fn.pipe
			Fn.prototype.pipe.apply(this, arguments);
			this('push', stream.push);
			return stream;
		},

		concatParallel: function() {
			var source = this;
			var order = [];

			function bind(object) {
				object.on('push', function() {
					order.push(object);
				});
				order.push(object);
			}

			function shiftNext() {
				var stream = order.shift();
				if (stream === undefined) { return; }
				var value = stream.shift();
				return value === undefined ?
					shiftNext() :
					value ;
			}

			return create(this, function concatParallel() {
				var object = source.shift();
				if (object !== undefined) { bind(object); }
				var value = shiftNext();
				return value;
			});
		},

		delay: function(time) {
			var source = this;
			var push = this.push;
			var stream = Stream(source.shift, Fn.noop);

			this.push = function() {
				push.apply(source, arguments);
				setTimeout(stream.push, time);
			};

			return stream;
		},

		throttle: function(time) {
			var source   = this;
			var push     = this.push;
			var stream   = Stream(function() {
				var value = latest(source);
				if (source.status === "done") {
					throttle.cancel();
					stream.status = "done";
				}
				return value;
			}, Fn.noop);
			var throttle = Fn.Throttle(stream.push, time);

			this.push = function() {
				push.apply(source, arguments);
				throttle();
			};

			return stream;
		},

		toPromise: function() {
			var source = this;

			return new Promise(function setup(resolve, reject) {
				var value = source.shift();

				if (value !== undefined) {
					resolve(value);
					return;
				}

				source
				.on('push', function() {
					var value = source.shift();
					if (value !== undefined) { resolve(value); }
				})
				.on('stop', reject);
			});
		}
	});

	Object.assign(Stream, {
		of: function() {
			var a = arguments;

			return new Stream(function shift() {
				return shiftSparse(a);
			}, function push() {
				A.push.apply(a, arguments);
			});
		}
	});


	// Pool

	function Pool(options, prototype) {
		var create = options.create || Fn.noop;
		var reset  = options.reset  || Fn.noop;
		var isIdle = options.isIdle;
		var store = [];
	
		// Todo: This is bad! It keeps a reference to the pools hanging around,
		// accessible from the global scope, so even if the pools are forgotten
		// they are never garbage collected!
		loggers.push(function log() {
			var total = store.length;
			var idle  = store.filter(isIdle).length;
			return {
				name:   options.name,
				total:  total,
				active: total - idle,
				idle:   idle
			};
		});

		return function PooledObject() {
			var object = store.find(isIdle);

			if (!object) {
				object = Object.create(prototype || null);
				create.apply(object, arguments);
				store.push(object);
			}

			reset.apply(object, arguments);
			return object;
		};
	}

	Pool.snapshot = function() {
		return Fn(loggers).map(call).toJSON();
	};


	// Export

	Object.assign(Fn, {
		Pool:          Pool,
		Throttle:      Throttle,
		Hold:          Hold,
		Stream:        Stream
	});

	window.Fn = Fn;
})(this);

// mixin.listeners

// .on(types, fn, [args...])
// Binds a function to be called on events in types. The
// callback fn is called with this object as the first
// argument, followed by arguments passed to .trigger(),
// followed by arguments passed to .on().

// .on(object)
// Registers object as a propagation target. Handlers bound
// to the propagation target are called with 'this' set to
// this object, and the target object as the first argument.

// .off(types, fn)
// Unbinds fn from given event types.

// .off(types)
// Unbinds all functions from given event types.

// .off(fn)
// Unbinds fn from all event types.

// .off(object)
// Stops propagation of all events to given object.

// .off()
// Unbinds all functions and removes all propagation targets.

// .trigger(type, [args...])
// Triggers event of type.

(function(window) {
	"use strict";

	var Fn = window.Fn;

	var mixin = window.mixin || (window.mixin = {});
	var eventObject = {};
	var slice = Function.prototype.call.bind(Array.prototype.slice);

	function getListeners(object) {
		if (!object.listeners) {
			Object.defineProperty(object, 'listeners', {
				value: {}
			});
		}

		return object.listeners;
	}

	function getDelegates(object) {
		if (!object.delegates) {
			Object.defineProperty(object, 'delegates', {
				value: []
			});
		}

		return object.delegates;
	}

	function setupPropagation(object1, object2) {
		var delegates = getDelegates(object1);

		// Make sure delegates stays unique
		if (delegates.indexOf(object2) === -1) {
			delegates.push(object2);
		}
	}

	function teardownPropagation(object1, object2) {
		var delegates = getDelegates(object1);

		if (object2 === undefined) {
			delegates.length = 0;
			return;
		}

		var i = delegates.indexOf(object2);

		if (i === -1) { return; }

		delegates.splice(i, 1);
	}

	function triggerListeners(object, listeners, args) {
		var i = -1;
		var l = listeners.length;
		var params, result;

		while (++i < l && result !== false) {
			params = args.concat(listeners[i][1]);
			result = listeners[i][0].apply(object, params);
		}

		return result;
	}


	mixin.events = {
		// .on(type, fn)
		//
		// Callback fn is called with this set to the current object
		// and the arguments (target, triggerArgs..., onArgs...).
		on: function(types, fn) {
			var root = this;

			if (arguments.length === 1) {
				// If types is a string return a stream.
				if (typeof types === 'string') {
					return Fn.Stream(function setup(notify) {
						var buffer = [];

						function push(collection, object) {
							buffer.push(object);
							notify('push');
						}

						root.on(types, push);

						return {
							next: function next() {
								return buffer.shift();
							},

							end: function end() {
								root.off(types, push);
							}
						};
					});
				}

				// If types is an object with a trigger method, set it up so
				// that events propagate from this object.
				else if (types.trigger) {
					setupPropagation(this, types);
					return this;
				}
			}

			if (!fn) {
				throw new Error('Sparky: calling .on("' + types + '", fn) but fn is ' + typeof fn);
			}

			var events = getListeners(this);
			var type, item;

			if (typeof types === 'string') {
				types = types.trim().split(/\s+/);
				item = [fn, slice(arguments, 2)];
			}
			else {
				return this;
			}

			while (type = types.shift()) { // eslint-disable-line no-cond-assign
				// If the event has no listener queue, create.
				if (!events[type]) {
					events[type] = [];
				}

				// Store the listener in the queue
				events[type].push(item);
			}

			return this;
		},

		// Remove one or many callbacks. If `context` is null, removes all callbacks
		// with that function. If `callback` is null, removes all callbacks for the
		// event. If `events` is null, removes all bound callbacks for all events.
		off: function(types, fn) {
			var type, listeners, n;

			// If no arguments passed in, unbind everything.
			if (arguments.length === 0) {
				teardownPropagation(this);

				if (this.listeners) {
					for (type in this.listeners) {
						this.listeners[type].length = 0;
						delete this.listeners[type];
					}
				}

				return this;
			}

			// If types is an object with a trigger method, stop propagating
			// events to it.
			if (arguments.length === 1 && types.trigger) {
				teardownPropagation(this, types);
				return this;
			}

			// No events.
			if (!this.listeners) { return this; }

			if (typeof types === 'string') {
				// .off(types, fn)
				types = types.trim().split(/\s+/);
			}
			else {
				// .off(fn)
				fn = types;
				types = Object.keys(this.listeners);
			}

			while (type = types.shift()) { // eslint-disable-line no-cond-assign
				listeners = this.listeners[type];

				if (!listeners) { continue; }

				if (!fn) {
					this.listeners[type].length = 0;
					delete this.listeners[type];
					continue;
				}

				n = listeners.length;

				// Go through listeners in reverse order to avoid
				// mucking up the splice indexes.
				while (n--) {
					if (listeners[n][0] === fn) {
						listeners.splice(n, 1);
					}
				}
			}

			return this;
		},

		trigger: function(e) {
			var events = getListeners(this);
			// Copy delegates. We may be about to mutate the delegates list.
			var delegates = getDelegates(this).slice();
			var args = slice(arguments);
			var type, target, i, l;

			if (typeof e === 'string') {
				type = e;
				target = this;
			}
			else {
				type = e.type;
				target = e.target;
			}

			if (events[type]) {
				args[0] = target;

				// Use a copy of the event list in case it gets mutated
				// while we're triggering the callbacks. If a handler
				// returns false stop the madness.
				if (triggerListeners(this, events[type].slice(), args) === false) {
					return this;
				}
			}

			if (!delegates.length) { return this; }

			i = -1;
			l = delegates.length;
			args[0] = eventObject;

			if (typeof e === 'string') {
				// Prepare the event object. It's ok to reuse a single object,
				// as trigger calls are synchronous, and the object is internal,
				// so it does not get exposed.
				eventObject.type = type;
				eventObject.target = target;
			}

			while (++i < l) {
				delegates[i].trigger.apply(delegates[i], args);
			}

			// Return this for chaining
			return this;
		}
	};
})(this);


// observe(object, [prop], fn)
// unobserve(object, [prop], [fn])
//
// Observes object properties for changes by redefining
// properties of the observable object with setters that
// fire a callback function whenever the property changes.
// I warn you, this is hairy stuff. But when it works, it
// works beautifully.

(function(window){
	var debug = false;

	var slice = Function.prototype.call.bind(Array.prototype.slice);
	var toString = Function.prototype.call.bind(Object.prototype.toString);

	function isFunction(object) {
		toString(object) === '[object Function]';
	}

	function call(array) {
		// Call observer with stored arguments
		array[0].apply(null, array[1]);
	}

	function getDescriptor(object, property) {
		return object && (
			Object.getOwnPropertyDescriptor(object, property) ||
			getDescriptor(Object.getPrototypeOf(object), property)
		);
	}

	function notifyObservers(object, observers) {
		// Copy observers in case it is modified.
		observers = observers.slice();

		var n = -1;
		var params, scope;

		// Notify this object, and any objects that have
		// this object in their prototype chain.
		while (observers[++n]) {
			params = observers[n];
			scope = params[1][0];

// Why did I do this? Why? Pre-emptive 'watch out, mates'?
//			if (scope === object || scope.isPrototypeOf(object)) {
				call(params);
//			}
		}
	}

	function notify(object, property) {
		var prototype = object;

		var descriptor = getDescriptor(object, property);
		if (!descriptor) { return; }

		var observers = descriptor.get && descriptor.get.observers;
		if (!observers) { return; }

		notifyObservers(object, observers);
	}

	function createProperty(object, property, observers, descriptor) {
		var value = object[property];

		delete descriptor.writable;
		delete descriptor.value;

		descriptor.configurable = false;
		descriptor.get = function() { return value; };
		descriptor.set = function(v) {
			if (v === value) { return; }
			value = v;
			// Copy the array in case an observer modifies it.
			observers.slice().forEach(call);
		};

		// Store the observers on the getter. TODO: We may
		// want to think about putting them in a weak map.
		descriptor.get.observers = observers;

		Object.defineProperty(object, property, descriptor);
	}

	function replaceGetSetProperty(object, property, observers, descriptor) {
		var set = descriptor.set;

		if (set) {
			descriptor.set = function(v) {
				set.call(this, v);
				notifyObservers(this, observers);
			};
		}

		// Prevent anything losing these observers.
		descriptor.configurable = false;

		// Store the observers so that future observers can be added.
		descriptor.get.observers = observers;

		Object.defineProperty(object, property, descriptor);
	}

	function observeProperty(object, property, fn) {
		var args = slice(arguments, 0);

		// Cut both prop and fn out of the args list
		args.splice(1, 2);

		var observer = [fn, args];
		var prototype = object;
		var descriptor;

		// Find the nearest descriptor in the prototype chain.
		while (
			!(descriptor = Object.getOwnPropertyDescriptor(prototype, property)) &&
			(prototype = Object.getPrototypeOf(prototype))
		);

		// If an observers list is already defined all we
		// have to do is add our fn to the queue.
		if (descriptor && descriptor.get && descriptor.get.observers) {
			descriptor.get.observers.push(observer);
			return;
		}

		var observers = [observer];

		// If there is no descriptor, create a new property.
		if (!descriptor) {
			createProperty(object, property, observers, { enumerable: true });
			return;
		}

		// If the property is not configurable we cannot
		// overwrite the set function, so we're stuffed.
		if (descriptor.configurable === false) {
			// Although we can get away with observing
			// get-only properties, as they don't replace
			// the setter and they require an explicit call
			// to notify().
			if (descriptor.get && !descriptor.set) {
				descriptor.get.observers = observers;
			}
			else {
				debug && console.warn('observe: Property .' + property + ' has { configurable: false }. Can not observe.', object);
				debug && console.trace();
			}

			return;
		}

		// If the property is writable, we're ok to overwrite
		// it with a getter/setter. This has a side effect:
		// normally a writable property in a prototype chain
		// will be superseded by a property set on the object
		// at the time of the set, but we're going to
		// supersede it now. There is not a great deal that
		// can be done to mitigate this.
		if (descriptor.writable === true) {
			createProperty(object, property, observers, descriptor);
			return;
		}

		// If the property is not writable, we don't want to
		// be replacing it with a getter/setter.
		if (descriptor.writable === false) {
			debug && console.warn('observe: Property .' + property + ' has { writable: false }. Shall not observe.', object);
			return;
		}

		// If the property has no getter, what is the point
		// even trying to observe it?
		if (!descriptor.get) {
			debug && console.warn('observe: Property .' + property + ' has a setter but no getter. Will not observe.', object);
			return;
		}

		// Replace the getter/setter
		replaceGetSetProperty(prototype, property, observers, descriptor);
	}

	function observe(object, property, fn) {
		var args, key;

		// Overload observe to handle observing all properties with
		// the function signature observe(object, fn).
		if (toString(property) === '[object Function]') {
			fn = prop;
			args = slice(arguments, 0);
			args.splice(1, 0, null);

			for (property in object) {
				args[1] = property;
				observeProperty.apply(null, args);
			};

			return;
		}

		observeProperty.apply(null, arguments);
	}

	function unobserve(object, property, fn) {
		var index;

		if (property instanceof Function) {
			fn = property;

			for (property in object) {
				unobserve(data, key, fn);
			};

			return;
		}

		var descriptor = getDescriptor(object, property);
		if (!descriptor) { return; }

		var observers = descriptor.get && descriptor.get.observers;
		if (!observers) { return; }

		var n;

		if (fn) {
			n = observers.length;
			while (n--) {
				if (observers[n][0] === fn) {
					observers.splice(n, 1);
				}
			}
		}
		else {
			observers.length = 0;
		}
	}

	window.observe = observe;
	window.unobserve = unobserve;
	window.notify = notify;
})(window);


// Collection()

(function(window) {
	"use strict";

	var assign    = Object.assign;
	var Fn        = window.Fn;
	var observe   = window.observe;
	var unobserve = window.unobserve;
	var mixin     = window.mixin;

	var debug = false;

	var defaults = { index: 'id' };


	// Utils

	function returnThis() { return this; }

	// Each functions

	function setValue(value, i) {
		this[i] = value;
	}

	// Collection functions

	function findByIndex(collection, id) {
		var index = collection.index;
		var n = -1;
		var l = collection.length;

		while (++n < l) {
			if (collection[n][index] === id) {
				return collection[n];
			}
		}
	}

	function queryObject(object, query, keys) {
		// Optionally pass in keys to avoid having to get them repeatedly.
		keys = keys || Object.keys(query);

		var k = keys.length;
		var key;

		while (k--) {
			key = keys[k];

			// Test equality first, allowing the querying of
			// collections of functions or regexes.
			if (object[key] === query[key]) {
				continue;
			}

			// Test function
			if (typeof query[key] === 'function' && query[key](object, key)) {
				continue;
			}

			// Test regex
			if (query[key] instanceof RegExp && query[key].test(object[key])) {
				continue;
			}

			return false;
		}

		return true;
	}

	function queryByObject(collection, query) {
		var keys = Object.keys(query);

		// Match properties of query against objects in the collection.
		return keys.length === 0 ?
			collection.slice() :
			collection.filter(function(object) {
				return queryObject(object, query, keys);
			}) ;
	}

	function push(collection, object) {
		Array.prototype.push.call(collection, object);
		collection.trigger('add', object);
	}

	function splice(collection, i, n) {
		var removed = Array.prototype.splice.call.apply(Array.prototype.splice, arguments);
		var r = removed.length;
		var added = Array.prototype.slice.call(arguments, 3);
		var l = added.length;
		var a = -1;

		while (r--) {
			collection.trigger('remove', removed[r], i + r);
		}

		while (++a < l) {
			collection.trigger('add', added[a], a);
		}

		return removed;
	}

	function add(collection, object) {
		// Add an item, keeping the collection sorted by id.
		var index = collection.index;

		// If the object does not have an index key...
		if (!Fn.isDefined(object[index])) {
			// ...check that it is not already in the
			// collection before pushing it in.
			if (collection.indexOf(object) === -1) {
				push(collection, object);
			}

			return;
		}

		// Insert the object in the correct index. TODO: we
		// should use the sort function for this!
		var l = collection.length;
		while (collection[--l] && (collection[l][index] > object[index] || !Fn.isDefined(collection[l][index])));
		splice(collection, l + 1, 0, object);
	}

	function remove(collection, obj, i) {
		if (i === undefined) { i = -1; }

		while (++i < collection.length) {
			if (obj === collection[i] || obj === collection[i][collection.index]) {
				splice(collection, i, 1);
				--i;
			}
		}
	}

	function update(collection, obj) {
		var item = collection.find(obj);

		if (item) {
			assign(item, obj);
			collection.trigger('update', item);
		}
		else {
			add(collection, obj);
		}
	}

	function callEach(fn, collection, objects) {
		var l = objects.length;
		var n = -1;

		while (++n < l) {
			fn.call(null, collection, objects[n]);
		}
	}

	function overloadByLength(map) {
		return function distribute() {
			var length = arguments.length;
			var fn = map[length] || map.default;

			if (fn) {
				return fn.apply(this, arguments);
			}

			console.warn('Collection: method is not overloaded to accept ' + length + ' arguments.');
			return this;
		}
	}

	function isCollection(object) {
		return Collection.prototype.isPrototypeOf(object) ||
			SubCollection.prototype.isPrototypeOf(object);
	}

	function createLengthObserver(collection) {
		var length = collection.length;

		return function lengthObserver() {
			var object;

			while (length-- > collection.length) {
				object = collection[length];

				// The length may have changed due to a splice or remove, in
				// which case there will be no object at this index, but if
				// there was, let's trigger it's demise.
				if (object !== undefined) {
					delete collection[length];
					collection.trigger('remove', object, length);
				}
			}

			length = collection.length;
		};
	}

	function Collection(array, settings) {
		if (this === undefined || this === window) {
			// If this is undefined the constructor has been called without the
			// new keyword, or without a context applied. Do that now.
			return new Collection(array, settings);
		}

		// Handle the call signatures Collection() and Collection(settings).
		if (array === undefined) {
			array = [];
		}
		else if (!Fn.isDefined(array.length)) {
			settings = array;
			array = [];
		}

		var collection = this;
		var options = assign({}, defaults, settings);

		function byIndex(a, b) {
			// Sort collection by index.
			return a[collection.index] > b[collection.index] ? 1 : -1 ;
		}

		Object.defineProperties(collection, {
			length: { value: 0, writable: true, configurable: true },
			index: { value: options.index },
			sort:  {
				value: function sort(fn) {
					// Collections get sorted by index by default, or by a function
					// passed into options, or passed into the .sort(fn) call.
					Array.prototype.sort.call(this, fn || options.sort || byIndex);
					return this.trigger('sort');
				},
				writable: true
			}
		});

		// Populate the collection. Don't use Object.assign for this, as it
		// doesn't get values from childNode dom collections.
		var n = -1;
		while (array[++n]) { collection[n] = array[n]; }

		collection.length = array.length;

		// Sort the collection
		//collection.sort();

		// Watch the length and delete indexes when the
		// length becomes shorter like a nice array does.
		observe(collection, 'length', createLengthObserver(collection));
	};

	assign(Collection, {
		// Fantasy land .of()
		of: function() {
			return Collection(arguments);
		},

		add: add,
		remove: remove,
		isCollection: isCollection
	});

	assign(Collection.prototype, mixin.events, {
		// Fantasy land .of()
		of: function() {
			return Collection(arguments);
		},

		// Fantasy land .ap()
		ap: function(object) {
			return this.map(function(fn) {
				return object.map(fn);
			});
		},

		filter:  Array.prototype.filter,
		map:     Array.prototype.map,
		reduce:  Array.prototype.reduce,
		concat:  Array.prototype.concat,
		sort:    Array.prototype.sort,
		slice:   Array.prototype.slice,
		some:    Array.prototype.some,
		indexOf: Array.prototype.indexOf,
		forEach: Array.prototype.forEach,

		each: function each() {
			Array.prototype.forEach.apply(this, arguments);
			return this;
		},

		add: overloadByLength({
			0: returnThis,

			"default": function addArgs() {
				callEach(add, this, arguments);
				return this;
			}
		}),

		remove: overloadByLength({
			0: function removeAll() {
				while (this.length) { this.pop(); }
				return this;
			},

			"default": function removeArgs() {
				callEach(remove, this, arguments);
				return this;
			}
		}),

		push: function() {
			callEach(push, this, arguments);
			return this;
		},

		pop: function() {
			var object = this[this.length - 1];
			--this.length;
			return object;
		},

		shift: function() {
			var object = this[0];
			this.remove(object);
			return object;
		},

		splice: function() {
			Array.prototype.unshift.call(arguments, this);
			return splice.apply(this, arguments);
		},

		update: function() {
			callEach(update, this, arguments);
			return this;
		},

		find: overloadByLength({
			0: Fn.noop,

			1: function findObject(object) {
				// Fast out. If object in collection, return it.
				if (this.indexOf(object) > -1) { return object; }

				// Otherwise find by index.
				var index = this.index;

				// Return the first object with matching key.
				return typeof object === 'string' || typeof object === 'number' || object === undefined ?
					findByIndex(this, object) :
					findByIndex(this, object[index]) ;
			}
		}),

		query: function(object) {
			// query() is gauranteed to return an array.
			return object ?
				queryByObject(this, object) :
				[] ;
		},

		contains: function(object) {
			return this.indexOf(object) !== -1;
		},

		getAll: function(property) {
			// Get the value of a property of all the objects in
			// the collection if they all have the same value.
			// Otherwise return undefined.

			var n = this.length;

			if (n === 0) { return; }

			while (--n) {
				if (this[n][property] !== this[n - 1][property]) { return; }
			}

			return this[n][property];
		},

		setAll: function(property, value) {
			// Set a property on every object in the collection.

			if (arguments.length !== 2) {
				throw new Error('Collection.set(property, value) requires 2 arguments. ' + arguments.length + ' given.');
			}

			var n = this.length;
			while (n--) { this[n][property] = value; }
			return this;
		},

		toJSON: function() {
			// Convert to array.
			return Array.prototype.slice.apply(this);
		},

		toObject: function(key) {
			// Convert to object, using a keyed value on
			// each object as map keys.
			key = key || this.index;

			var object = {};
			var prop, type;

			while (n--) {
				prop = this[n][key];
				type = typeof prop;

				if (type === 'string' || type === 'number' && prop > -Infinity && prop < Infinity) {
					object[prop] = this[n];
				}
				else {
					console.warn('Collection: toObject() ' + typeof prop + ' ' + prop + ' cannot be used as a key.');
				}
			}

			return object;
		},

		sub: function(query, settings) {
			return new SubCollection(this, query, settings);
		}
	});

	function SubCollection(collection, query, settings) {
		// TODO: Clean up SubCollection

		var options = assign({ sort: sort }, settings);
		var keys = Object.keys(query);
		var echo = true;
		var subset = this;

		function sort(o1, o2) {
			// Keep the subset ordered as the collection
			var i1 = collection.indexOf(o1);
			var i2 = collection.indexOf(o2);
			return i1 > i2 ? 1 : -1 ;
		}

		function update(object) {
			var i = subset.indexOf(object);

			echo = false;

			if (queryObject(object, query, keys)) {
				if (i === -1) {
					// Keep subset is sorted with default sort fn,
					// splice object into position
					if (options.sort === sort) {
						var i1 = collection.indexOf(object) ;
						var n = i1;
						var o2, i2;

						while (n--) {
							o2 = collection[n];
							i2 = subset.indexOf(o2);
							if (i2 > -1 && i2 < i1) { break; }
						}

						subset.splice(i2 + 1, 0, object);
					}
					else {
						subset.add(object);
					}

					subset.on('add', subsetAdd);
				}
			}
			else {
				if (i !== -1) {
					subset.remove(object);
				}
			}

			echo = true;
		}

		function add(collection, object) {
			var n = keys.length;
			var key;

			// Observe keys of this object that might affect
			// it's right to remain in the subset
			while (n--) {
				key = keys[n];
				observe(object, key, update);
			}

			update(object);
		}

		function remove(collection, object) {
			var n = keys.length;
			var key;

			while (n--) {
				key = keys[n];
				unobserve(object, key, update);
			}

			var i = subset.indexOf(object);

			if (i > -1) {
				echo = false;
				subset.splice(i, 1);
				echo = true;
			}
		}

		function destroy(collection) {
			collection.forEach(function(object) {
				remove(collection, object);
			});

			subset
			.off('add', subsetAdd)
			.off('remove', subsetRemove);
		}

		function subsetAdd(subset, object) {
			if (!echo) { return; }
			collection.add(object);
		}

		function subsetRemove(subset, object) {
			if (!echo) { return; }
			collection.remove(object);
		}

		// Initialise as collection.
		Collection.call(this, options);

		// Observe the collection to update the subset
		collection
		.on('add', add)
		.on('remove', remove)
		.on('destroy', destroy);

		// Initialise existing object in collection and echo
		// subset add and remove operations to collection.
		if (collection.length) {
			collection.forEach(function(object) {
				add(collection, object);
			});
		}
		else {
			subset
			.on('add', subsetAdd)
			.on('remove', subsetRemove);
		}

		this.destroy = function() {
			// Lots of unbinding
			destroy(collection);

			collection
			.off('add', add)
			.off('remove', remove)
			.off('destroy', destroy);

			subset.off();
		};

		this.synchronise = function() {
			// Force a sync from code that only has access
			// to the subset.
			collection.forEach(update);
			return this;
		};
	}

	assign(SubCollection.prototype, Collection.prototype);

	window.Collection = Collection;
})(this);

(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('Sparky - https://github.com/cruncher/sparky');
})(this);

(function(window) {
	"use strict";


	// Imports

	var assign     = Object.assign;
	var Collection = window.Collection;
	var Fn         = window.Fn;
	var dom        = window.dom;
	var Stream     = Fn.Stream;


	// Variables

	var rurljson = /\/\S*\.json$/;


	// Functions

	var noop       = Fn.noop;
	var isDefined  = Fn.isDefined;
	var returnThis = Fn.returnThis;

	function call(fn) { fn(); }


	// Debug

	function nodeToString(node) {
		return [
			'<',
			dom.tag(node),
			//(node.getAttribute('href') ? ' href="' + node.getAttribute('href') + '"' : ''),
			(node.getAttribute('data-scope') ? ' data-scope="' + node.getAttribute('data-scope') + '"' : ''),
			(node.getAttribute('data-fn') ? ' data-fn="' + node.getAttribute('data-fn') + '"' : ''),
			(node.getAttribute('data-template') ? ' data-template="' + node.getAttribute('data-template') + '"' : ''),
			(node.className ? ' class="' + node.className + '"' : ''),
			(node.id ? ' id="' + node.id + '"' : ''),
			'>'
		].join('');
	}

	function log() {
		if (!Sparky.debug) { return; }
		if (Sparky.debug === 'errors') { return; }
		var array = ['Sparky:'];
		Array.prototype.push.apply(array, arguments);
		console.log.apply(console, array);
	}

	function logVerbose() {
		if (Sparky.debug !== 'verbose') { return; }
		var array = ['Sparky:'];
		Array.prototype.push.apply(array, arguments);
		console.log.apply(console, array);
	}


	// Sparky

	function resolveNode(selector) {
		// If node is a string assume it is a selector. Sparky does not yet
		// support node collections, so we just use querySelector to get
		// one node.
		var node = typeof selector === 'string' ?
			document.querySelector(selector) :
			selector ;

		if (!node) {
			console.warn('Sparky: node cannot be found on Sparky(node) setup: ' + selector);
			return;
			//throw new Error('Sparky: node cannot be found on Sparky(node) setup: ' + selector);
		}

		// If node is a template use a copy of it's content.
		var tag = dom.tag(node);
		if (tag === 'template' || tag === 'script') {
			node = Sparky.template(node.id);
		}

		return node;
	}

	function resolveScope(node, scope, data, observe, update) {
		// No getAttribute method (may be a fragment), use current scope.
		if (!node.getAttribute) {
			return update(scope);
		}

		var path = node.getAttribute('data-scope');

		// No data-scope attribute, use current scope.
		if (!isDefined(path)) {
			return update(scope);
		}

		// data-scope="/path/to/data.json"
		rurljson.lastIndex = 0;
		var isURL = rurljson.test(path);

		if (isURL) {
			jQuery.get(path)
			.then(function(res) {
				update(res);
			});

			return;
		}

		// data-scope="{{path.to.data}}", find new scope in current scope.
		Sparky.rtags.lastIndex = 0;
		var parsedPath = Sparky.rtags.exec(path);
		if (parsedPath) {
			path = parsedPath[2];
		}

		// data-scope="path.to.data", find new scope in data.
		else {
			scope = data;
		}

		return scope && path ?
			observe(scope, path) :
			update(scope);
	}

	function resolveFn(node, fn, ctrl, instream) {
		// The ctrl list can be a space-separated string of ctrl paths,
		return typeof fn === 'string' ? makeFn(fn, ctrl, instream) :
			// a function,
			typeof fn === 'function' ? makeDistributeFn([fn], instream) :
			// an array of functions,
			typeof fn === 'object' ? makeDistributeFn(fn, instream) :
			// or defined in the data-fn attribute
			node.getAttribute && makeFn(node.getAttribute('data-fn'), ctrl, instream) ;
	}

	function makeDistributeFn(list, instream) {
		return function distributeFn(node) {
			// Distributor controller
			var l = list.length;
			var n = -1;
			var result;
			var flag = false;

			// TODO: This is exposes solely so that ctrl
			// 'observe-selected' can function in sound.io.
			// Really naff. Find a better way.
			this.ctrls = list;

			this.interrupt = function interrupt() {
				flag = true;
				return list.slice(n + 1);
			};

			while (++n < l) {
				// Call the list of ctrls, in order.
				result = list[n].call(this, node, instream);

				// Returning false interrupts the fn calls.
				if (flag) { return false; }

				// Returning an object sets that object to
				// be used as scope.
				if (result !== undefined) { instream = result.each ? result : Fn.of(result) ; }
			}

			return instream;
		};
	}

	function makeDistributeFnFromPaths(paths, ctrls, instream) {
		var list = [];
		var l = paths.length;
		var n = -1;
		var ctrl;

		while (++n < l) {
			ctrl = Fn.getPath(paths[n], ctrls);
			if (!ctrl) {
				throw new Error('Sparky: data-fn "' + paths[n] + '" not found in sparky.fn');
			}

			list.push(ctrl);
		}

		return makeDistributeFn(list, instream);
	}

	function makeFn(string, ctrls, instream) {
		if (!isDefined(string)) { return; }
		var paths = string.trim().split(Sparky.rspaces);
		return makeDistributeFnFromPaths(paths, ctrls, instream);
	}

	function replaceWithComment(node, i, sparky) {
		// If debug use comments as placeholders, otherwise use text nodes.
		var placeholder = Sparky.debug ?
			dom.create('comment', dom.tag(node)) :
			dom.create('text', '') ;
		dom.before(node, placeholder);
		dom.remove(node);
		return placeholder;
	}

	function replaceWithNode(node, i, sparky) {
		var placeholder = sparky.placeholders[i];
		dom.before(placeholder, node);
		dom.remove(placeholder);
	}

	function initialise(inits, init) {
		// On initial run we populate the DOM immediately, unthrottled.
		if (init) { inits.forEach(call); }

		// Otherwise we wait for the next frame.
		else { inits.forEach(window.requestAnimationFrame); }

		inits.length = 0;
	}

	function setup(scope, bindings, init) {
		var n = bindings.length;
		var path, fn, throttle;

		while (n--) {
			path = bindings[n][0];
			fn = bindings[n][1];
			throttle = bindings[n][2];
			Sparky.observePath(scope, path, throttle, !init);
			if (init) {
				fn(Fn.getPath(path, scope));
			}
		}
	}

	function teardown(scope, bindings) {
		var n = bindings.length;
		var path, throttle;

		while (n--) {
			path = bindings[n][0];
			throttle = bindings[n][2];
			Sparky.unobservePath(scope, path, throttle);
		}
	}

	function render(scope, bindings, paths) {
		var n = bindings.length;
		var path, throttle;

		// If paths are given, only render those paths
		if (paths && paths.length) {
			bindings = bindings.filter(function(binding) {
				return paths.indexOf(binding[0]) > -1;
			});
		}

		while (n--) {
			path = bindings[n][0];
			throttle = bindings[n][2];
			if (path) { throttle(Fn.getPath(path, scope)); }
			else { throttle(); }
		}
	}

	function destroy(parsed) {
		parsed.setups.length = 0;
		parsed.teardowns.forEach(call);
		parsed.teardowns.length = 0;

		var bindings = parsed.bindings;
		var n = bindings.length;
		var throttle;

		while (n--) {
			throttle = bindings[n][2];
			throttle.cancel();
		}

		parsed.bindings.length = 0;
	}

	function addNodes(sparky) {
		if (!sparky.placeholders) {
			// If nodes are already in the DOM trigger the event.
			// Can't use document.contains - doesn't exist in IE9.
			if (document.body.contains(sparky[0])) {
				sparky.trigger('dom-add');
			}

			return;
		}
		sparky.forEach(replaceWithNode);
		sparky.placeholders = false;
		sparky.trigger('dom-add');
	}

	function removeNodes(sparky) {
		if (sparky.placeholders) { return; }
		sparky.placeholders = sparky.map(replaceWithComment);
		sparky.trigger('dom-remove');
	}

	function updateNodes(sparky, scope, addNodes, addThrottle, removeNodes, removeThrottle, init) {
		// Where there is scope, the nodes should be added to the DOM, if not,
		// they should be removed.
		if (scope) {
			if (init) { addNodes(sparky, init); }
			else { addThrottle(sparky); }
		}
		else {
			if (init) { removeNodes(sparky); }
			else { removeThrottle(sparky); }
		}
	}

	function Sparky(node, rootscope, fn, parent) {
		// Allow calling the constructor with or without 'new'.
		if (!(this instanceof Sparky)) {
			return new Sparky(node, rootscope, fn, parent);
		}

		var sparky = this;
		var init = true;
		var scope;
		var parsed;

		var value;
		var instream = Stream(function shift() {
			var v = value;
			value = undefined;
			return v;
		}, function push() {
			value = arguments[arguments.length - 1];
		})
		.dedup();

		var data = parent ? parent.data : Sparky.data;
		var ctrl = parent ? parent.fn : Sparky.fn;
		var unobserveScope = noop;
		var addThrottle = Fn.Throttle(addNodes);
		var removeThrottle = Fn.Throttle(removeNodes);

		function updateScope(object) {
			instream.push(object);
		}

		function observeScope(scope, path) {
			unobserveScope();
			unobserveScope = function() {
				Sparky.unobservePath(scope, path, updateScope);
			};
			Sparky.observePath(scope, path, updateScope, true);
		}

		node = resolveNode(node);

		if (!node) {
			console.warn("Sparky: Sparky(node) – node not found: " + node);
			return;
			//throw new Error("Sparky: Sparky(node) – node not found: " + node);
		}

		Sparky.logVerbose('Sparky(', node, rootscope, fn && (fn.call ? fn.name : fn), ')');

		fn = resolveFn(node, fn, ctrl, instream);

		// Define data and ctrl inheritance
		Object.defineProperties(this, {
			data: { value: Object.create(data), writable: true },
			fn:   { value: Object.create(ctrl) },
			placeholders: { writable: true }
		});

		this.scope = function(object) {
			// If we are already using this object as rootscope, bye bye.
			if (object === rootscope) { return; }
			rootscope = object;
			resolveScope(node, object, parent ? parent.data : Sparky.data, observeScope, updateScope);
			return this;
		};

		// Setup this as a Collection of nodes. Where node is a document
		// fragment, assign all it's children to sparky collection.
		Collection.call(this, [node]);

		// If fn is to be called and a stream is returned, we use that.
		var outstream = fn ? fn.call(sparky, node, instream) : instream ;

		// A controller returning false is telling us not to do data
		// binding. We can skip the heavy work.
		if (outstream === false) {
			this.on('destroy', function() {
				dom.remove(this);
			});

			this.scope(rootscope);
			init = false;
			return;
		}

		var children = [];

		this.create = function(node, scope1, fn) {
			var sparky = Sparky.prototype.create.apply(this, arguments);

			// If scope is already set, apply it immediately, handling the
			// case where a sparky instance is created after a parent sparky
			// has been initialised.
			if (isDefined(scope)) { sparky.scope(scope); }

			// We can't .tap() the outstream here. If a sparky instance is
			// created after a parent sparky is instantiated outstream.tap()
			// will follow the outstream's .each() and it will never receive
			// anything. So push child scope() calls into an array and deal
			// with that inside outstream.each();
			children.push(sparky.scope);

			return sparky.on('destroy', function() {
				var i = children.indexOf(sparky.scope);
				if (i > -1) { children.splice(i, 1); }
			});
		};

		// Define .render() for forcing tags to update.
		this.render = function() {
			render(scope, parsed.bindings, arguments);
			this.trigger.apply(this, ['render'].concat(arguments));
		};

		// Register destroy on this sparky before creating child nodes, so that
		// this gets destroyed before child sparkies do.
		this.on('destroy', function() {
			dom.remove(this);
			this.placeholders && dom.remove(this.placeholders);
			unobserveScope();
			teardown(scope, parsed.bindings);
			destroy(parsed);
		});

		// Parse the DOM nodes for Sparky tags.
		parsed = Sparky.parse(sparky, function get(path) {
			return scope && Fn.getPath(path, scope);
		}, function set(property, value) {
			scope && Fn.setPath(property, value, scope);
		});

		// Instantiate children AFTER this sparky has been fully wired up. Not
		// sure why. Don't think it's important.
		parsed.nodes.forEach(function(node) {
			return sparky.create(node, scope);
		});

		// Don't keep nodes hanging around in memory
		parsed.nodes.length = 0;

		outstream
		.dedup()
		.map(function(object) {
			// If old scope exists, tear it down
			if (scope && parsed) { teardown(scope, parsed.bindings); }

			scope = object;

			if (scope && parsed) {
				// Run initialiser fns, if any
				if (parsed.setups.length) { initialise(parsed.setups, init); }

				// Assign and set up scope
				setup(scope, parsed.bindings, init);
			}

			Sparky.log('Sparky: scope change', node, scope);

			// Trigger children
			//sparky.trigger('scope', scope);

			// Update DOM insertion of this sparky's nodes
			updateNodes(sparky, scope, addNodes, addThrottle, removeNodes, removeThrottle, init);

			// Then update this node
			init = false;

			return scope;
		})
		.each(function(scope) {
			children.forEach(function(fn) {
				fn(scope);
			});
		});

		// If there is scope, set it up now
		resolveScope(node, rootscope, parent ? parent.data : Sparky.data, observeScope, updateScope);

		init = false;
	}

	Sparky.prototype = Object.create(Collection.prototype);

	assign(Sparky.prototype, {
		// Create dependent Sparky
		create: function create(node, scope, fn) {
			var boss   = this;
			var sparky = Sparky(node, scope, fn, this);

			function delegateDestroy() { sparky.destroy(); }
			function delegateRender(self) { sparky.render(); }

			// Bind events...
			this
			.on('destroy', delegateDestroy)
			.on('render', delegateRender);

			return sparky.on('destroy', function() {
				boss
				.off('destroy', delegateDestroy)
				.off('render', delegateRender);
			});
		},

		// Unbind and destroy Sparky bindings and nodes.
		destroy: function destroy() {
			return this.trigger('destroy').off();
		},

		scope: returnThis,
		render: returnThis,

		interrupt: function interrupt() { return []; },

		// Returns sparky's element nodes wrapped as a jQuery object. If jQuery
		// is not present, returns undefined.
		tojQuery: function() {
			if (!window.jQuery) { return; }
			return jQuery(this.filter(dom.isElementNode));
		}
	});

	// Export

	var fragments = {};

	assign(Sparky, {
		debug: false,
		log: log,
		logVerbose: logVerbose,
		nodeToString: nodeToString,

		try: function(fn, createMessage) {
			return function catchError() {
				// If Sparky is in debug mode call fn inside a try-catch
				if (Sparky.debug) {
					try { return fn.apply(this, arguments); }
					catch(e) { throw new Error(createMessage.apply(this, arguments)); }
				}

				// Otherwise just call fn
				return fn.apply(this, arguments);
			};
		},

		svgNamespace:   "http://www.w3.org/2000/svg",
		xlinkNamespace: "http://www.w3.org/1999/xlink",
		data: {},
		fn:   {},

		template: function(id, node) {
			if (node) {
				console.warn('Cant cache Sparky.template(id, node)')
				return;
			}

			var fragment = fragments[id] || (fragments[id] = dom.fragmentFromId(id));
			return fragment.cloneNode(true);
		}
	});

	window.Sparky = Sparky;
})(this);


// Sparky.observe()
// Sparky.unobserve()

(function(window) {
	"use strict";

	// Import

	var Fn        = window.Fn;
	var Sparky    = window.Sparky;
	var observe   = window.observe;
	var unobserve = window.unobserve;

	// Utility functions

	var noop = Fn.noop;
	var isDefined = Fn.isDefined;

	// Handle paths

	var rpathtrimmer = /^\[|\]$/g;
	var rpathsplitter = /\]?(?:\.|\[)/g;
	var rpropselector = /(\w+)=(\w+)/;
	var map = [];

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function findByProperty(array, name, value) {
		// Find first matching object in array
		var n = -1;

		while (++n < array.length) {
			if (array[n] && array[n][name] === value) {
				return array[n];
			}
		}
	}

	function observePath3(root, prop, array, fn, notify) {
		function update() {
			Sparky.logVerbose('path resolved to value:', root[prop]);
			fn(root[prop]);
		}

		Sparky.observe(root, prop, update, notify);

		return function() {
			Sparky.unobserve(root, prop, update);
		};
	}

	function observePath2(root, prop, array, fn, notify) {
		var destroy = noop;
		var object;

		function update() {
			destroy();

			if (typeof object !== 'object' && typeof object !== 'function') {
				destroy = noop;
				if (notify) { fn(); }
			}
			else {
				destroy = observePath1(object, array.slice(), fn, notify) ;
			}
		}

		function updateSelection() {
			var obj = findByProperty(root, selection[1], JSON.parse(selection[2]));
			// Check that object has changed
			if (obj === object) { return; }
			object = obj;
			update();
		}

		function updateProperty() {
			object = root[prop];
			update();
		}

		var selection = rpropselector.exec(prop);

		if (selection) {
			if (!root.on) {
				throw new Error('Sparky: Sparky.observe trying to observe with property selector on a non-collection.')
			}

			root.on('add remove sort', updateSelection);
			updateSelection();
			notify = true;
			return function() {
				destroy();
				root.off('add remove sort', updateSelection);
			};
		}
			
		Sparky.observe(root, prop, updateProperty, true);
		notify = true;
		return function() {
			destroy();
			Sparky.unobserve(root, prop, updateProperty);
		};
	}

	function observePath1(root, array, fn, notify) {
		if (array.length === 0) { return noop; }

		var prop = array.shift();

		return array.length === 0 ?
			observePath3(root, prop, array, fn, notify) :
			observePath2(root, prop, array, fn, notify) ;
	}

	function observePath(root, path, fn, immediate) {
		// If path refers to root object no observation is possible, but where
		// immediate is defined we should call fn with root.
		if (path === '.') {
			if (immediate) { fn(root); }
			return;
		}

		var array = splitPath(path);

		// Observe path without logs.
		var destroy = observePath1(root, array, fn, immediate || false) ;

		// Register this binding in a map
		map.push([root, path, fn, destroy]);
	}

	function observePathOnce(root, path, fn) {
		var value = Fn.getPath(path, root);

		if (isDefined(value)) {
			fn(value);
			return;
		}

		var array   = splitPath(path);
		var destroy = observePath1(root, array, update, false);

		// Hack around the fact that the first call to destroy()
		// is not ready yet, becuase at the point update has been
		// called by the observe recursers, the destroy fn has
		// not been returned yet. TODO: Perhaps make direct returns
		// async to get around this (they would be async if they were
		// using Object.observe).
		var hasRun = false;

		function update(value) {
			if (hasRun) { return; }
			if (isDefined(value)) {
				hasRun = true;
				fn(value);
				setTimeout(function() {
					unobservePath(root, path, fn);
				}, 0);
			}
		}

		// Register this binding in a map
		map.push([root, path, fn, destroy]);
	}

	function unobservePath(root, path, fn) {
		var n = map.length;
		var record;

		// Allow for the call signatures (root) and (root, fn)
		if (typeof path !== 'string') {
			fn = path;
			path = undefined;
		}

		while (n--) {
			record = map[n];
			if ((root === record[0]) &&
				(!path || path === record[1]) &&
				(!fn || fn === record[2])) {
				record[3]();
				map.splice(n, 1);
			}
		}
	}

	//Sparky.observePath = Sparky.try(observePath, function message(root, path) {
	//	return 'Sparky: failed to observe path "' + path + '" in object ' + JSON.stringify(root);
	//});

	Sparky.observePath = observePath;
	Sparky.unobservePath = unobservePath;
	Sparky.observePathOnce = observePathOnce;

	// Binding

	function isAudioParam(object) {
		return window.AudioParam && window.AudioParam.prototype.isPrototypeOf(object);
	}

	function Poll(object, property, fn) {
		var v1 = object[property];
		var active = true;

		function frame() {
			var v2 = object[property];

			if (v1 !== v2) {
				v1 = v2;
				fn();
			}

			if (!active) { return; }

			window.requestAnimationFrame(frame);
		}

		function cancel() {
			active = false;
		}

		window.requestAnimationFrame(frame);
		return cancel;
	}

	var unpollers = [];

	function poll(object, property, fn) {
		unpollers.push([object, property, fn, Poll(object, property, fn)]);
		return object;
	}

	function unpoll(object, property, fn) {
		var n = unpollers.length;
		var unpoller;

		while (n--) {
			unpoller = unpollers[n];

			if (object === unpoller[0] && property === unpoller[1] && fn === unpoller[2]) {
				unpoller[3]();
				unpollers.splice(n, 1);
				return object;
			}
		}

		return object;
	}

	Sparky.observe = function(object, property, fn, immediate) {
		if (!object) {
			throw new Error('Sparky: Sparky.observe requires an object!', object, property);
		}

		// AudioParams objects must be polled, as they cannot be reconfigured
		// to getters/setters, nor can they be Object.observed. And they fail
		// to do both of those completely silently. So we test the scope to see
		// if it is an AudioParam and set the observe and unobserve functions
		// to poll.
		if (isAudioParam(object)) {
			return poll(object, property, fn);
		}

		var descriptor;

		if (property === 'length') {
			// Observe length and update the DOM on next
			// animation frame if it changes.
			descriptor = Object.getOwnPropertyDescriptor(object, property);

			if (!descriptor.get && !descriptor.configurable) {
				console.warn && console.warn('Sparky: Are you trying to observe an array?. Sparky is going to observe it by polling. You may want to use a Collection() to avoid this.', object, object instanceof Array);
				console.trace && console.trace();
				return poll(object, property, fn);
			}
		}

		observe(object, property, fn);
		if (immediate) { fn(object); }
	};

	Sparky.unobserve = function(object, property, fn) {
		if (isAudioParam(object)) {
			return unpoll(object, property, fn);
		}

		var descriptor;

		if (property === 'length') {
			descriptor = Object.getOwnPropertyDescriptor(object, property);
			if (!descriptor.get && !descriptor.configurable) {
				return unpoll(object, property, fn);
			}
		}

		return unobserve(object, property, fn);
	};
})(this);

(function(window) {

	var Sparky = window.Sparky;

	function multiline(fn) {
		return fn.toString()
			.replace(/^function.+\{\s*\/\*\s*/, '')
			.replace(/\s*\*\/\s*\}$/, '');
	}

	function replaceStringFn(obj) {
		return function($0, $1) {
			// $1 is the template key. Don't render falsy values like undefined.
			var value = obj[$1];

			return value instanceof Array ?
				value.join(', ') :
				value === undefined || value === null ? '' :
				value ;
		};
	}

	function replaceRegexFn(obj) {
		return function($0, $1, $2) {
			// $1 is the template key in {{key}}, while $2 exists where
			// the template tag is followed by a repetition operator.
			var r = obj[$1];

			if (r === undefined || r === null) { throw new Error("Exception: attempting to build RegExp but obj['"+$1+"'] is undefined."); }

			// Strip out beginning and end matchers
			r = r.source.replace(/^\^|\$$/g, '');

			// Return a non-capturing group when $2 exists, or just the source.
			return $2 ? ['(?:', r, ')', $2].join('') : r ;
		};
	}

	Sparky.render = function render(template, obj) {
		return typeof template === 'function' ?
			multiline(template).replace(Sparky.rsimpletags, replaceStringFn(obj)) :

		template instanceof RegExp ?
			RegExp(template.source
				.replace(/\{\{\s*(\w+)\s*\}\}(\{\d|\?|\*|\+)?/g, replaceRegexFn(obj)),
				(template.global ? 'g' : '') +
				(template.ignoreCase ? 'i' : '') +
				(template.multiline ? 'm' : '')
			) :

			template.replace(Sparky.rsimpletags, replaceStringFn(obj));
	};
})(this);


// Sparky.parse()
//
// Sparky.parse(nodes, get, set, bind, unbind, create);
//
// Parses a collection of DOM nodes and all their descendants looking for
// Sparky tags. For each tag found in the DOM, the bind callback is called
// with the params (path, fn), where path is of the form 'path.to.data' and
// fn is a function to be called when the data at that path changes.

(function(window) {
	"use strict";

	var assign = Object.assign;
	var Fn     = window.Fn;
	var dom    = window.dom;
	var Sparky = window.Sparky;

	var attributes = ['href', 'title', 'id', 'style', 'src', 'alt'];

	var aliases = {
		"viewbox": "viewBox"
	};

	// Matches a sparky template tag, capturing (path, filter)
	var rtagstemplate = /({{0}})\s*([\w\-\.]+)\s*(?:\|([^\}]+))?\s*{{1}}/g;
	var rtags;

	// Matches a simple sparky template tag, capturing (path)
	var rsimpletagstemplate = /{{0}}\s*([\w\-\.\[\]]+)\s*{{1}}/g;
	var rsimpletags;

	// Matches tags plus any directly adjacent text
	var rclasstagstemplate = /[^\s]*{{0}}[^\}]+{{1}}[^\s]*/g;
	var rclasstags;

	// Matches filter string, capturing (filter name, filter parameter string)
	var rfilter = /\s*([a-zA-Z0-9_\-]+)\s*(?::(.+))?/;

	// Matches anything with a space
	var rspaces = /\s+/;

	// Matches anything that contains a non-space character
	var rtext = /\S/;

	// Matches the arguments list in the result of a fn.toString()
	var rarguments = /function(?:\s+\w+)?\s*(\([\w,\s]*\))/;

	var filterCache = {};


	// Utility functions

	var identity  = Fn.id;
	var isDefined = Fn.isDefined;
	var toClass   = Fn.toClass;

	var slice = Function.prototype.call.bind(Array.prototype.slice);


	// DOM

	//function setAttributeSVG(node, attribute, value) {
	//	if (attribute === 'd' || attribute === "transform" || attribute === "viewBox") {
	//		node.setAttribute(attribute, value);
	//	}
	//	else if (attribute === "href") {
	//		node.setAttributeNS(Sparky.xlinkNamespace, attribute, value);
	//	}
	//	else {
	//		node.setAttributeNS(Sparky.svgNamespace, attribute, value);
	//	}
	//}

	function setAttributeHTML(node, attribute, value) {
		node.setAttribute(attribute, value);
	}

	//function toggleAttributeSVG(node, attribute, value) {
	//  if (attribute in node) { node[attribute] = !!value; }
	//  else if (value) { setAttributeSVG(node, attribute, value); }
	//  else { node.removeAttribute(attribute); }
	//}

	function toggleAttributeHTML(node, attribute, value) {
		if (attribute in node) { node[attribute] = !!value; }
		else if (value) { node.setAttribute(attribute, attribute); }
		else { node.removeAttribute(attribute); }
	}

	function addClasses(classList, text) {
		var classes = text.trim().split(rspaces);
		classList.add.apply(classList, classes);
	}

	function removeClasses(classList, text) {
		var classes = text.trim().split(rspaces);
		classList.remove.apply(classList, classes);
	}


	// Binding system

	var tags = {
		label: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttribute(node, 'for', bind, unbind, get, unobservers);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		button: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		input: function(node, bind, unbind, get, set, setup, create, unobservers) {
			var type = node.type;

			bindAttribute(node, 'value', bind, unbind, get, unobservers);
			bindAttribute(node, 'min', bind, unbind, get, unobservers);
			bindAttribute(node, 'max', bind, unbind, get, unobservers);
			bindAttribute(node, 'step', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'required', bind, unbind, get, unobservers);

			var unbindName = type === 'number' || type === 'range' ?
				// Only let numbers set the value of number and range inputs
				parseName(node, get, set, bind, unbind, floatToString, stringToFloat) :
			// Checkboxes default to value "on" when the value attribute
			// is not given. Make them behave as booleans.
			(type === 'checkbox' || type === 'radio') && !isDefined(node.getAttribute('value')) ?
				parseName(node, get, set, bind, unbind, boolToStringOn, stringOnToBool) :
				// Only let strings set the value of other inputs
				parseName(node, get, set, bind, unbind, identity, identity) ;

			if (unbindName) { unobservers.push(unbindName); }

			bindAttribute(node, 'name', bind, unbind, get, unobservers);
		},

		select: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttribute(node, 'value', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'required', bind, unbind, get, unobservers);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);

			// Only let strings set the value of selects
			var unbindName = parseName(node, get, set, bind, unbind, identity, identity);
			if (unbindName) { unobservers.push(unbindName); }

			bindAttribute(node, 'name', bind, unbind, get, unobservers);
		},

		option: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttribute(node, 'value', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		textarea: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'required', bind, unbind, get, unobservers);

			// Only let strings set the value of a textarea
			var unbindName = parseName(node, get, set, bind, unbind, identity, identity);
			if (unbindName) { unobservers.push(unbindName); }
			bindAttribute(node, 'name', bind, unbind, get, unobservers);
		},

		time: function(node, bind, unbind, get, set, setup, create, unobservers)  {
			bindAttributes(node, bind, unbind, get, unobservers, ['datetime']);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		svg: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['viewbox']);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		g: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['transform']);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		path: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['d', 'transform']);
		},

		line: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['x1', 'x2', 'y1', 'y2', 'transform']);
		},

		rect: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['x', 'y', 'width', 'height', 'rx', 'ry', 'transform']);
		},

		text: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['x', 'y', 'dx', 'dy', 'text-anchor']);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		use: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['href', 'transform']);
		},

		template: Sparky.noop,
		script: Sparky.noop
	};

	var parsers = {
		1: function domNode(node, bind, unbind, get, set, setup, create) {
			var unobservers = [];
			var tag = node.tagName.toLowerCase();

			if (Sparky.debug === 'verbose') { console.group('Sparky: dom node: ', node); }
			bindClasses(node, bind, unbind, get, unobservers);
			bindAttributes(node, bind, unbind, get, unobservers, attributes);

			// Set up special bindings for certain tags, like form inputs
			if (tags[tag]) {
				tags[tag](node, bind, unbind, get, set, setup, create, unobservers);
			}

			// Or sparkify the child nodes
			else {
				bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
			}

			if (Sparky.debug === 'verbose') { console.groupEnd(); }
			return unobservers;
		},

		3: function textNode(node, bind, unbind, get, set, setup, create) {
			var unobservers = [];

			if (Sparky.debug === 'verbose') { console.group('Sparky: text node:', node); }
			observeProperties(node.nodeValue, bind, unbind, get, function(text) {
				node.nodeValue = text;
			}, unobservers);

			if (Sparky.debug === 'verbose') { console.groupEnd(); }
			return unobservers;
		},

		11: function fragmentNode(node, bind, unbind, get, set, setup, create) {
			var unobservers = [];

			if (Sparky.debug === 'verbose') { console.group('Sparky: fragment: ', node); }
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);

			if (Sparky.debug === 'verbose') { console.groupEnd(); }
			return unobservers;
		}
	};

	function bindNodes(node, bind, unbind, get, set, setup, create, unobservers) {
		// Document fragments do not have a getAttribute method.
		var id = node.getAttribute && node.getAttribute('data-template');
		var template, nodes;

		if (isDefined(id)) {
			// Node has a data-template attribute
			template = Sparky.template(id);

			// If the template does not exist, do nothing
			if (!template) {
				Sparky.log('template "' + id + '" not found in DOM.');
				return;
			}

			// childNodes is a live list, and we don't want that because we may
			// be about to modify the DOM
			nodes = slice(template.childNodes);

			// Wait for scope to become available with a self-unbinding function
			// before appending the template to the DOM. BE AWARE, here, that
			// this could throw a bug in the works: we're currently looping over
			// bindings outside of the call to bind, and inside we call unbind,
			// which modifies bindings... see? It won't bug just now, becuase
			// reverse loops, but if you change anything...
			setup(function domify() {
				dom.empty(node);
				dom.append(node, template);
			});
		}
		else {
			// childNodes is a live list, and we don't want that because we may
			// be about to modify the DOM.
			nodes = slice(node.childNodes);
		}

		var n = -1;
		var l = nodes.length;
		var child;

		// Loop forwards through the children
		while (++n < l) {
			child = nodes[n];

			// Don't bind child nodes that have their own Sparky controllers.
			if (child.getAttribute && (
				isDefined(child.getAttribute('data-fn')) ||
				isDefined(child.getAttribute('data-scope'))
			)) {
				create(child);
				//unobservers.push(sparky.destroy.bind(sparky));
			}
			else if (parsers[child.nodeType]) {
				unobservers.push.apply(unobservers, parsers[child.nodeType](child, bind, unbind, get, set, setup, create));
			}
		}
	}

	function bindClasses(node, bind, unbind, get, unobservers) {
		var classes = dom.attribute('class', node);

		// If there are no classes, go no further
		if (!classes) { return; }

		// Remove tags and store them
		rclasstags.lastIndex = 0;
		var tags = [];
		var text = classes.replace(rclasstags, function($0) {
			tags.push($0);
			return '';
		});

		// Where no tags have been found, go no further
		if (!tags.length) { return; }

		// Now that we extracted the tags, overwrite the class with remaining text
		node.setAttribute('class', text);

		// Create an update function for keeping sparky's classes up-to-date
		var classList = dom.classes(node);
		var update = function update(newText, oldText) {
			if (oldText && rtext.test(oldText)) { removeClasses(classList, oldText); }
			if (newText && rtext.test(newText)) { addClasses(classList, newText); }
		};

		if (Sparky.debug === 'verbose') { console.log('Sparky: bind class="' + classes + ' ' + tags.join(' ') + '"'); }

		observeProperties(tags.join(' '), bind, unbind, get, update, unobservers);
	}

	function bindAttributes(node, bind, unbind, get, unobservers, attributes) {
		var a = attributes.length;

		while (a--) {
			bindAttribute(node, attributes[a], bind, unbind, get, unobservers);
		}
	}

	function bindAttribute(node, attribute, bind, unbind, get, unobservers) {
		// Look for data- aliased attributes before attributes. This is
		// particularly important for the style attribute in IE, as it does not
		// return invalid CSS text content, so Sparky can't read tags in it.
		var alias = node.getAttribute('data-' + attribute) ;

		// SVG has case sensitive attributes.
		var attr = aliases[attribute] || attribute ;
		var value = alias ? alias :
		//    	isSVG ? node.getAttributeNS(Sparky.xlinkNamespace, attr) || node.getAttribute(attr) :
			node.getAttribute(attr) ;

		if (!value) { return; }
		if (alias) { node.removeAttribute('data-' + attribute); }
		if (Sparky.debug === 'verbose') { console.log('Sparky: checking ' + attr + '="' + value + '"'); }

		var update = setAttributeHTML.bind(null, node, attr) ;

		observeProperties(value, bind, unbind, get, update, unobservers);
	}

	function bindBooleanAttribute(node, attribute, bind, unbind, get, unobservers) {
		// Look for data- aliased attributes before attributes. This is
		// particularly important for the style attribute in IE, as it does not
		// return invalid CSS text content, so Sparky can't read tags in it.
		var alias = node.getAttribute('data-' + attribute) ;

		// SVG has case sensitive attributes.
		var attr = attribute ;
		var value = alias ? alias : node.getAttribute(attr) ;

		if (!value) { return; }
		if (alias) { node.removeAttribute('data-' + attribute); }
		if (Sparky.debug === 'verbose') { console.log('Sparky: checking ' + attr + '="' + value + '"'); }

		var update = toggleAttributeHTML.bind(null, node, attr) ;
		observeBoolean(value.trim(), bind, unbind, get, update, unobservers);
	}

	function observeBoolean(text, bind, unbind, get, fn, unobservers) {
		Sparky.rtags.lastIndex = 0;
		var tokens = Sparky.rtags.exec(text);

		if (!tokens) { return; }
		var replace = makeReplaceText(get);

		function update() {
			Sparky.rtags.lastIndex = 0;
			var value = replace.apply(null, tokens);
			fn(value);
		}

		// Live tag
		if (tokens[1].length === 2) {
			unobservers.push(observeProperties2(bind, unbind, update, [tokens[2]]));
		}
		// Dead tag
		else {
			// Scope is not available yet. We need to wait for it. Todo: This
			// should be done inside the Sparky constructor.
			window.requestAnimationFrame(update);
		}
	}

	function toFilter(filter) {
		var parts = rfilter.exec(filter);

		return {
			name: parts[1],
			fn: Sparky.filter[parts[1]],

			// Leave the first arg empty. It will be populated with the value to
			// be filtered when the filter fn is called.
			args: parts[2] && JSON.parse('["",' + parts[2].replace(/'/g, '"') + ']') || []
		};
	}

	function applyFilters(word, filterString) {
		var filters = filterCache[filterString] || (
			filterCache[filterString] = filterString.split('|').map(toFilter)
		);
		var l = filters.length;
		var n = -1;
		var args;

		// Todo: replace this mechanism with a functor.

		while (++n < l) {
			if (!isDefined(word)) { break; }

			if (!filters[n].fn) {
				throw new Error('Sparky: filter \'' + filters[n].name + '\' does not exist in Sparky.filter');
			}

			if (Sparky.debug === 'verbose') {
				console.log('Sparky: filter:', filters[n].name, 'value:', word, 'args:', filters[n].args);
			}

			args = filters[n].args;
			args[0] = word;
			word = filters[n].fn.apply(null, args);
		}

		return word;
	}

	function extractProperties(str, live, dead) {
		Sparky.rtags.lastIndex = 0;
		str.replace(Sparky.rtags, function($0, $1, $2){
			// Sort the live properties from the dead properties.
			var i;

			// If it's already in live, our work here is done
			if (live.indexOf($2) !== -1) { return; }

			// It's a live tag, so put it in live, and if it's already
			// in dead remove it from there.
			if ($1.length === 2) {
				live.push($2);
				i = dead.indexOf($2);
				if (i !== -1) { dead.splice(i, 1); }
			}

			// It's a dead tag, check if it's in dead and if not stick
			// it in there.
			else if (dead.indexOf($2) === -1) {
				dead.push($2);
			}
		});
	}

	function makeReplaceText(get) {
		return function replaceText($0, $1, $2, $3) {
			var value = $3 ? applyFilters(get($2), $3) : get($2) ;
			var type = typeof value;

			return !isDefined(value) ? '' :
				type === 'string' ? value :
				type === 'number' ? value :
				type === 'boolean' ? value :
				// Beautify the .toString() result of functions
				type === 'function' ? (value.name || 'function') + (rarguments.exec(value.toString()) || [])[1] :
				// Use just the Class string in '[object Class]'
				toClass(value) ;
		}
	}

	function makeUpdateText(text, get, fn) {
		var replaceText = makeReplaceText(get);
		var oldText;

		return function updateText() {
			Sparky.rtags.lastIndex = 0;
			var newText = text.replace(Sparky.rtags, replaceText);
			fn(newText, oldText);
			oldText = newText;
		}
	}

	function observeProperties(text, bind, unbind, get, fn, unobservers) {
		var live = [];
		var dead = [];

		// Populate live and dead property lists
		extractProperties(text, live, dead);

		if (live.length === 0 && dead.length === 0) { return; }

		var update = makeUpdateText(text, get, fn);

		if (live.length) {
			unobservers.push(observeProperties2(bind, unbind, update, live));
		}
		else {
			// Scope is not available yet. We need to wait for it. Todo: This
			// should be done inside the Sparky constructor.
			window.requestAnimationFrame(update);
		}
	}

	function observeProperties2(bind, unbind, update, properties) {
		// Observe properties that are to be live updated
		properties.forEach(function(property) {
			bind(property, update);
		});

		// Return a function that destroys live bindings
		return function destroyBinding() {
			properties.forEach(function(property) {
				// Unobserve properties
				unbind(property, update);
			});
		};
	}


	// Forms elements
	//
	// 2-way binding for form elements. HTML form elements are hard. They do
	// all sorts of strange things such as having a default value of string
	// 'on' where a value attribute is not given. This set of functions handles
	// 2-way binding between a node and an object. They are deliberately strict.

	function stringToFloat(value) {
		// coerse to number
		var n = parseFloat(value);
		return Number.isNaN(n) ? undefined :
			n ;
	}

	function stringToInt(value) {
		// coerse to number
		var n = parseFloat(value);
		return Number.isNaN(n) ? undefined :
			Math.round(n) ;
	}

	function stringToBool(value) {
		return value === 'false' ? false :
			value === '0' ? false :
			value === '' ? false :
			!!value ;
	}

	function stringOnToBool(value) {
		return value === 'on' ;
	}

	function definedToString(value) {
		return isDefined(value) ? value + '' :
			undefined ;
	}

	function floatToString(value) {
		return typeof value === 'number' ? value + '' :
			undefined ;
	}

	function intToString(value) {
		return typeof value === 'number' && value % 1 === 0 ? value + '' :
			undefined ;
	}

	function boolToString(value) {
		return typeof value === 'boolean' ? value + '' :
			typeof value === 'number' ? !!value + '' :
			undefined ;
	}

	function boolToStringOn(value) {
		return typeof value === 'boolean' || typeof value === 'number' ?
			value ? 'on' : '' :
			undefined ;
	}

	function dispatchInputChangeEvent(node) {
		// FireFox won't dispatch any events on disabled inputs so we need to do
		// a little dance, enabling it quickly, sending the event and disabling
		// it again.
		if (!dom.features.inputEventsOnDisabled && node.disabled) {
			node.disabled = false;

			// We have to wait, though. It's not clear why. This makes it async,
			// but let's not worry too much about that.
			Fn.requestTick(function() {
				dom.trigger('valuechange', node);
				node.disabled = true;
			});
		}
		else {
			dom.trigger('valuechange', node);
		}
	}

	function makeUpdateInput(node, get, set, path, fn) {
		var type = node.type;
		var init = true;

		return type === 'radio' || type === 'checkbox' ?
			function updateChecked() {
				var value = fn(get(path));
				var checked;

				if (init) {
					init = false;
					if (!isDefined(value) && node.checked) {
						// Avoid setting the value from the scope on initial run
						// where there is no scope value. The change event will
						// be called and the scope updated from the default value.
						dispatchInputChangeEvent(node);
						return;
					}
				}

				checked = node.value === value;

				// Don't set checked state if it already has that state, and
				// certainly don't simulate a change event.
				if (node.checked === checked) { return; }

				node.checked = checked;
				dispatchInputChangeEvent(node);
			} :
			function updateValue() {
				var value = fn(get(path));

				if (init) {
					init = false;
					if (!isDefined(value)) {
						// Avoid setting the value from the scope on initial run
						// where there is no scope value. The change event will be
						// called and the scope updated from the default value.
						
						// Avoid sending to selects, as we do not rely on Bolt
						// for setting state on select labels anymore...
						if (dom.tag(node) !== "select") { dispatchInputChangeEvent(node); }
						return;
					}
				}

				if (typeof value === 'string') {
					// Check against the current value - resetting the same
					// string causes the cursor to jump in inputs, and we dont
					// want to send a change event where nothing changed.
					if (node.value === value) { return; }
					node.value = value;
				}
				else {
					// Be strict about setting strings on inputs
					node.value = '';
				}

				// Avoid sending to selects, as we do not rely on Bolt
				// for setting state on select labels anymore...
				if (dom.tag(node) !== "select") { dispatchInputChangeEvent(node); }
			} ;
	}

	function makeChangeListener(node, set, path, fn) {
		var type = node.type;

		return type === 'radio' ? function radioChange(e) {
				if (node.checked) {
					set(path, fn(node.value));
				}
			} :
			type === 'checkbox' ? function checkboxChange(e) {
				set(path, fn(node.checked ? node.value : undefined));
			} :
			function valueChange(e) {
				set(path, fn(node.value));
			} ;
	}

	function bindValue(node, get, set, bind, unbind, path, to, from) {
		var update = makeUpdateInput(node, get, set, path, to);
		var change = makeChangeListener(node, set, path, from);

		node.addEventListener('change', change);
		node.addEventListener('input', change);

		// Wait for animation frame to let Sparky fill in tags in value, min
		// and max before controlling.
		var request = window.requestAnimationFrame(function() {
			request = false;

			// Where the model does not have value, set it from the node value.
			if (!isDefined(get(path))) {
				change();
			}
		});

		bind(path, update);

		return function() {
			node.removeEventListener('change', change);
			node.removeEventListener('input', change);

			if (request) {
				window.cancelAnimationFrame(request);
			}

			unbind(path, update);
		};
	}

	function parse(nodes, get, set) {
		var results = {
			setups: [],
			bindings: [],
			nodes: []
		};

		// Todo: This is convoluted legacy crap. Sort it out.

		results.teardowns = Array.prototype.concat.apply([], nodes.map(function(node) {
			return parsers[node.nodeType](
				node,
				function bind(path, fn) {
					results.bindings.push([path, fn, Fn.Throttle(fn)]);
				},
				function unbind(fn) {
					var bindings = results.bindings;
					var n = bindings.length;
					while (n--) {
						if (bindings[n][1] === fn) {
							bindings.splice(n, 1);
							return;
						}
					}
				},
				get,
				set,
				function setup(fn) {
					results.setups.push(fn);
				},
				function create(node) {
					results.nodes.push(node);
				}
			);
		}));

		return results;
	}

	function parseName(node, get, set, bind, unbind, to, from) {
		if (Sparky.debug === "verbose" && !node.name) {
			console.warn('Sparky: Cannot bind value of node with empty name.', node);
			return;
		}

		// Search name for tags. Data bind the first live tag and remove the tag
		// parentheses to prevent this node from being name-value bound by other
		// controllers.
		// Todo: This is weird semantics: {{prop}} changes value, {{{prop}}}
		// changes name. Think about this. Hard.
		var tag, fn;

		Sparky.rtags.lastIndex = 0;
		while ((tag = Sparky.rtags.exec(node.name))) {
			if (tag[1].length === 2) {
				fn = bindValue(node, get, set, bind, unbind, tag[2], to, from);
				node.name = node.name.replace(tag[0], tag[2]);
				break;
			}
		}

		return fn;
	}


	// Set up Sparky.tags(), Sparky.rtags, Sparky.rsimpletags

	function changeTags(ropen, rclose) {
		rtags = Sparky.render(rtagstemplate, arguments);
		rsimpletags = Sparky.render(rsimpletagstemplate, arguments);
		rclasstags = Sparky.render(rclasstagstemplate, arguments);
	}

	Object.defineProperties(Sparky, {
		rtags: {
			get: function() { return rtags; },
			enumerable: true
		},

		rsimpletags: {
			get: function() { return rsimpletags; },
			enumerable: true
		}
	});

	changeTags(/\{\[{1,2}/, /\]{1,2}\}/);


	// Export

	assign(Sparky, {
		parse: parse,
		parseName: parseName,
		bindValue: bindValue,
		attributes: attributes,

		stringToInt:     stringToInt,
		stringToFloat:   stringToFloat,
		stringToBool:    stringToBool,
		stringOnToBool:  stringOnToBool,
		definedToString: definedToString,
		intToString:     intToString,
		floatToString:   floatToString,
		boolToString:    boolToString,
		boolToStringOn:  boolToStringOn,

		tags:            changeTags,
		rspaces:         rspaces
	});
})(this);


// Sparky.fn

(function(window) {
	var Sparky = window.Sparky;

	// Stops Sparky from parsing the node.
	Sparky.fn.ignore = function ignore() {
		this.interrupt();
	};
})(this);

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
			console[isIE ? 'log' : 'group']('Sparky: scope ' + Sparky.nodeToString(node));
			console.log('data ', sparky.data);
			console.log('scope', scope);
			console.log('fn   ', sparky.fn);
			console[isIE ? 'log' : 'groupEnd']('---');
		}

		console[isIE ? 'log' : 'group']('Sparky: run   ' + Sparky.nodeToString(node));
		console.log('data ', sparky.data);
		console[isIE ? 'log' : 'groupEnd']('---');

		return scopes.tap(log);
	};
})(this);

(function(window) {
	"use strict";

	var assign = Object.assign;
	var dom    = window.dom;
	var Sparky = window.Sparky;

	assign(Sparky.fn, {
		"remove-hidden": function(node, scopes) {
			scopes.tap(function() {
				window.requestAnimationFrame(function() {
					dom.classes(node).remove('hidden');
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
		"prevent-click": function(node) {
			node.addEventListener('click', preventDefault);
			this.on('destroy', function() {
				node.removeEventListener('click', preventDefault);
			});
		},

		"prevent-submit": function(node) {
			node.addEventListener('submit', preventDefault);
			this.on('destroy', function() {
				node.removeEventListener('submit', preventDefault);
			});
		},

		"ajax-on-submit": function(node, scopes) {
			var method = node.getAttribute('method') || 'POST';
			var url = node.getAttribute('action');

			if (!Fn.isDefined(url)) {
				throw new Error('Sparky: fn ajax-on-submit requires an action="url" attribute.');
			}

			var submit;

			node.addEventListener('submit', preventDefault);

			scopes.tap(function(scope) {
				if (submit) { node.removeEventListener(submit); }
				submit = function(e) {
					jQuery.ajax({
						type: method.toLowerCase(),
						url:  url,
						data: JSON.stringify(scope),
						dataType: 'json'
					})
					.then(function(value) {
						console.log(value);
					});
				};
				node.addEventListener('submit', submit);
			})

			this
			.on('destroy', function() {
				node.removeEventListener('submit', submit);
			});
		},

		"scope": function(node, scopes) {
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

	var Fn     = window.Fn;
	var dom    = window.dom;
	var Sparky = window.Sparky;

	// We maintain a list of sparkies that are scheduled for destruction. This
	// time determines how long we wait during periods of inactivity before
	// destroying those sparkies.
	var destroyDelay = 8000;

	function createPlaceholder(node) {
		if (!Sparky.debug) { return dom.create('text', ''); }

		var attrScope = node.getAttribute('data-scope');
		var attrCtrl = node.getAttribute('data-fn');

		return dom.create('comment',
			(attrScope ? ' data-scope="' + attrScope + '"' : '') +
			(attrCtrl ? ' data-fn="' + attrCtrl + '" ' : ''));
	}

	Sparky.fn.each = function setupCollection(node, scopes) {
		var sparky   = this;
		var data     = this.data;
		var sparkies = [];
		var cache    = [];

		// We cannot use a WeakMap here: WeakMaps do not accept primitives as
		// keys, and a Sparky scope may be a number or a string - although that
		// is unusual and perhaps we should ban it.
		var rejects  = new Map();
		var scheduled = [];

		var clone    = node.cloneNode(true);
		var fns      = this.interrupt();
		var placeholder = createPlaceholder(node);
		var collection;

		fns.unshift(function() {
			this.data = Object.create(data);
		});

		var throttle = Fn.Throttle(function update() {
			var n = -1;
			var l = cache.length;
			var map = {};
			var i, object, t;

			if (Sparky.debug) { t = window.performance.now(); }

			// Compare the cached version of the collection against the
			// collection and construct a map of found object positions.
			while (l--) {
				object = cache[l];
				i = collection.indexOf(object);

				if (i === -1) {
					rejects.set(object, sparkies[l]);
					dom.remove(sparkies[l][0]);
					scheduled.push(object);
				}
				else {
					map[i] = sparkies[l];
				}
			}

			l = sparkies.length = cache.length = collection.length;

			// Ignore any objects at the start of the collection that have
			// not changed position. Optimises for the common case where we're
			// pushing things on the end.
			while(cache[++n] && cache[n] === collection[n]);
			--n;

			var changed = false;

			// Loop through the collection, recaching objects and creating
			// sparkies where needed.
			while(++n < l) {
				// While nothing has changed, do nothing
				if (!changed && cache[n] === collection[n]) {
					continue;
				}
				else {
					changed = true;
				}

				object = cache[n] = collection[n];
				removeScheduled(object);

				sparkies[n] = rejects.get(object);

				Sparky.log('sparky for object');
				if (sparkies[n]) {
					Sparky.log('    ...found in rejects')
					rejects.delete(object);
				}
				else {
					sparkies[n] = map[n] || sparky.create(clone.cloneNode(true), object, fns);
				}

				// If node before placeholder is a leftover reject
				if (placeholder.previousSibling === sparkies[n][0]) {
					Sparky.log('    ...already in dom position', sparkies[n][0]);
					continue;
				}

				// We are in an animation frame. Go ahead and manipulate the dom.
				dom.before(placeholder, sparkies[n][0]);
			}

			Sparky.log(
				'collection rendered (length: ' + collection.length +
				', time: ' + (window.performance.now() - t) + 'ms)'
			);

			reschedule();
		});

		var timer;

		function reschedule() {
			clearTimeout(timer);
			timer = setTimeout(function() {
				scheduled.forEach(function(object) {
					var sparky = rejects.get(object);
					// Todo: This should not occur. Object must be in rejects
					// at this point. but it is occurring. Find out what is
					// wrong.
					if (!sparky) { return; }
					sparky.destroy();
					rejects.delete(object);
				});
				scheduled.length = 0;
			}, destroyDelay);
		}

		function removeScheduled(object) {
			var i = scheduled.indexOf(object);
			if (i === -1) { return; }
			scheduled.splice(i, 1);
		}

		function observeCollection() {
			if (collection.on) {
				collection.on('add remove sort', throttle);
				throttle();
			}
			else {
				Sparky.observe(collection, 'length', throttle);
			}
		}

		function unobserveCollection() {
			if (collection.on) {
				collection.off('add remove sort', throttle);
			}
			else {
				Sparky.unobserve(collection, 'length', throttle);
			}
		}

		// Stop Sparky trying to bind the same scope and ctrls again.
		clone.removeAttribute('data-scope');
		clone.removeAttribute('data-fn');

		// Put the placeholder in place and remove the node
		dom.before(node, placeholder);
		dom.remove(node);

		scopes
		.dedup()
		.each(function(scope) {
			if (collection) { unobserveCollection(); }
			collection = scope;
			if (collection) { observeCollection(); }
		});

		this
		.on('destroy', function destroy() {
			throttle.cancel();
			unobserveCollection();
		});
	};
})(this);

(function(window) {
	"use strict";

	var assign     = Object.assign;

	var Fn         = window.Fn;
	var Collection = window.Collection;
	var Sparky     = window.Sparky;

	var noop       = Fn.noop;
	var stringToInt = Sparky.stringToInt;
	var stringToFloat = Sparky.stringToFloat;
	var stringToBool = Sparky.stringToBool ;
	var stringOnToBool = Sparky.stringOnToBool;
	var definedToString = Sparky.definedToString;
	var floatToString = Sparky.floatToString;
	var boolToString = Sparky.boolToString;
	var boolToStringOn = Sparky.boolToStringOn;

	// Controllers

	function setup(sparky, node, scopes, to, from) {
		var scope, path, fn;
		var unbind = Sparky.parseName(node, function get(name) {
			return Fn.getPath(name, scope);
		}, function set(name, value) {
			return scope && Fn.setPath(name, value, scope);
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

			var i;

			if (value === undefined) {
				i = array.indexOf(node.value);
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

			var i;

			if (value === undefined) {
				i = array.indexOf(stringToInt(node.value));
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
	}

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
	}

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
	}

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
	}

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


// Sparky.filter

(function(window) {
	"use strict";

	var Fn        = window.Fn;
	var Sparky    = window.Sparky;
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

	Sparky.filter = {
		add: function(value, n) {
			var result = parseFloat(value) + n ;
			if (Number.isNaN(result)) { return; }
			return result;
		},

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

			return function formatDate(value, format, lang) {
				if (!value) { return; }

				var date = value instanceof Date ? value : createDate(value) ;

				lang = lang || settings.lang;

				return format.replace(rletter, function($0, $1) {
					return formatters[$1] ? formatters[$1](date, lang) : $1 ;
				});
			};
		})(settings),

		decibels: function(value) {
			if (typeof value !== 'number') { return; }
			return 20 * Math.log10(value);
		},

		decimals: function(value, n) {
			if (typeof value !== 'number') { return; }
			return Number.prototype.toFixed.call(value, n);
		},

		divide: function(value, n) {
			if (typeof value !== 'number') { return; }
			return value / n;
		},

		escape: (function() {
			var pre = document.createElement('pre');
			var text = document.createTextNode('');

			pre.appendChild(text);

			return function(value) {
				text.textContent = value;
				return pre.innerHTML;
			};
		})(),

		'find-in': function(id, path) {
			if (!isDefined(id)) { return; }
			var collection = Fn.getPath(path, Sparky.data);
			return collection && collection.find(id);
		},

		first: function(value) {
			return value[0];
		},

		floatformat: function(value, n) {
			return typeof value === 'number' ? Number.prototype.toFixed.call(value, n) :
				!isDefined(value) ? '' :
				(Sparky.debug && console.warn('Sparky: filter floatformat: ' + n + ' called on non-number ' + value)) ;
		},

		floor: function(value) {
			return Math.floor(value);
		},

		get: function(value, name) {
			return isDefined(value) ? Fn.get(name, value) : undefined ;
		},

		"greater-than": function(value1, value2) {
			return value1 > value2;
		},

		contains: function(array, value) {
			return (array && array.indexOf(value) > -1);
		},

		invert: function(value) {
			return typeof value === 'number' ? 1 / value : !value ;
		},

		is: Fn.is,
		equals: Fn.equals,

		join: function(value, string) {
			return Array.prototype.join.call(value, string);
		},

		json: function(value) {
			return JSON.stringify(value);
		},

		last: function(value) {
			return value[value.length - 1];
		},

		length: function(value) {
			return value.length;
		},

		"less-than": function(value1, value2, str1, str2) {
			return value1 < value2 ? str1 : str2 ;
		},

		//length_is
		//linebreaks

		//linebreaksbr: (function() {
		//	var rbreaks = /\n/;
		//
		//	return function(value) {
		//		return value.replace(rbreaks, '<br/>')
		//	};
		//})(),

		localise: function(value, digits) {
			var locale = document.documentElement.lang;
			var options = {};

			if (isDefined(digits)) {
				options.minimumFractionDigits = digits;
				options.maximumFractionDigits = digits;
			}

			// Todo: localise value where toLocaleString not supported
			return value.toLocaleString ? value.toLocaleString(locale, options) : value ;
		},

		lowercase: function(value) {
			if (typeof value !== 'string') { return; }
			return String.prototype.toLowerCase.apply(value);
		},

		map: function(array, method, path) {
			return array && array.map(Fn[method](path));
		},

		mod: function(value, n) {
			if (typeof value !== 'number') { return; }
			return value % n;
		},

		multiply: function(value, n) {
			return value * n;
		},

		not: Fn.not,

		parseint: function(value) {
			return parseInt(value, 10);
		},

		percent: function(value) {
			return value * 100;
		},

		pluralise: function(value, str1, str2, lang) {
			if (typeof value !== 'number') { return; }

			str1 = str1 || '';
			str2 = str2 || 's';

			// In French, numbers less than 2 are considered singular, where in
			// English, Italian and elsewhere only 1 is singular.
			return lang === 'fr' ?
				(value < 2 && value >= 0) ? str1 : str2 :
				value === 1 ? str1 : str2 ;
		},

		postpad: function(value, n) {
			var string = isDefined(value) ? value.toString() : '' ;
			var l = string.length;
			var m = parseInt(n, 10);

			return m === l ? value :
				m > l ? string + spaces(m - l) :
				string.substring(0, m) ;
		},

		prepad: function(value, n, char) {
			var string = isDefined(value) ? value.toString() : '' ;
			var l = string.length;
			var array = [];

			// String is longer then padding: let it through unprocessed
			if (n - l < 1) { return value; }

			array.length = 0;
			array.length = n - l;
			array.push(string);
			return array.join(char || ' ');
		},

		random: function(value) {
			return value[Math.floor(Math.random() * value.length)];
		},

		reduce: function(array, name, initialValue) {
			return array && array.reduce(Fn[name], initialValue || 0);
		},

		replace: function(value, str1, str2) {
			if (typeof value !== 'string') { return; }
			return value.replace(RegExp(str1, 'g'), str2);
		},

		round: function(value) {
			if (typeof value !== 'number') { return; }
			return Math.round(value);
		},

		//reverse

		//safe: function(string) {
		//	if (typeof string !== string) { return; }
		//	// Actually, we can't do this here, because we cant return DOM nodes
		//	return;
		//},

		//safeseq

		slice: function(value, i0, i1) {
			return typeof value === 'string' ?
				value.slice(i0, i1) :
				Array.prototype.slice.call(value, i0, i1) ;
		},

		slugify: function(value) {
			if (typeof value !== 'string') { return; }
			return value.trim().toLowerCase().replace(/\W/g, '-').replace(/[_]/g, '-');
		},

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

		trans: function(value) {
			var translations = Sparky.data.translations;

			if (!translations) {
				console.warn('Sparky: You need to provide Sparky.data.translations');
				return value;
			}

			var text = translations[value] ;

			if (!text) {
				console.warn('procsea: You need to provide a translation for "' + value + '"');
				return value;
			}

			return text ;
		},

		truncatechars: function(value, n) {
			return value.length > n ?
				value.slice(0, n) + '…' :
				value ;
		},

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

		yesno: function(value, truthy, falsy) {
			return value ? truthy : falsy ;
		}
	};
})(this);


// Make the minifier remove debug code paths
Sparky.debug = false;