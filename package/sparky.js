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
	Math.log10 = function log10(n) {
		return Math.log(n) / Math.LN10;
	};
}


// window.CustomEvent polyfill

(function(window, undefined) {
	if (window.CustomEvent && typeof window.CustomEvent === 'function') { return; }

	window.CustomEvent = function CustomEvent(event, params) {
		params = params || { bubbles: false, cancelable: false, detail: undefined };
		
		var e = document.createEvent('CustomEvent');
		e.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
		
		return e;
	};
	
	window.CustomEvent.prototype = window.Event.prototype;
})(window);

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

	console.log('Fn');
	console.log('https://github.com/cruncher/fn');
	console.log('______________________________');
})(this);

(function(window) {
	"use strict";

	var debug = true;


	// Import

	var A = Array.prototype;
	var F = Function.prototype;
	var N = Number.prototype;
	var O = Object.prototype;
	var S = String.prototype;


	// Polyfill

	if (!Math.log10) {
		Math.log10 = function log10(n) {
			return Math.log(n) / Math.LN10;
		};
	}


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


	// Functional functions

	function noop() {}

	function id(object) { return object; }

	function call(fn, value) {
		return fn(value);
	}

	function compose(fn1, fn2) {
		return function composed(n) { return fn1(fn2(n)); }
	}

	function pipe() {
		var a = arguments;
		return function pipe(n) { return A.reduce.call(a, call, n); }
	}

	function curry(fn, parity) {
		parity = parity || fn.length;

		function curried() {
			var a = arguments;
			return a.length >= parity ?
				// If there are enough arguments, call fn.
				fn.apply(this, a) :
				// Otherwise create a new function with parity of the remaining
				// number of required arguments. And curry that.
				curry(function partial() {
					var params = A.slice.apply(a);
					A.push.apply(params, arguments);
					return fn.apply(this, params);
				}, parity - a.length) ;
		}

		// Make the string representation of this function equivalent to fn
		// for sane debugging
		if (debug) {
			curried.toString = function() { return fn.toString(); };
		}

		// Where possible, define length so that curried functions show how
		// many arguments they are yet expecting
		return isFunctionLengthDefineable ?
			Object.defineProperty(curried, 'length', { value: parity }) :
			curried ;
	}


	// Get and set paths

	var rpathtrimmer = /^\[|\]$/g;
	var rpathsplitter = /\]?\.|\[/g;

	function isObject(obj) { return obj instanceof Object; }

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function objFrom(object, array) {
		var key   = array.shift();
		var value = object[key];

		return array.length === 0 ? value :
			value !== undefined ? objFrom(value, array) :
			undefined ;
	}

	function objTo(root, array, object) {
		var key = array.shift();

		return array.length === 0 ?
			(root[key] = object) :
			objTo(isObject(root[key]) ? root[key] : (root[key] = {}), array, object) ;
	}


	// Fn

	function Fn(object) {
		    // Object is a function
		return typeof object === "function" ? new Stream(object) :
			// Object is an iterator
			object && object.next ? new ReadStream(object) :
			// Object could be anything
			new BufferStream(object) ;
	}

	Object.assign(Fn, {
		noop:     noop,
		id:       id,
		curry:    curry,
		compose:  compose,
		pipe:     pipe,

		is: curry(function is(object1, object2) {
			return object1 === object2;
		}),

		equals: curry(function equals(a, b) {
			// Fast out if references are for the same object
			if (a === b) { return true; }

			var keys = Object.keys(a);
			var n = keys.length;

			while (n--) {
				if (a[keys[n]] !== b[keys[n]]) {
					return false;
				}
			}

			return true;
		}),

		by: curry(function by(property, a, b) {
			return Fn.byGreater(a[property], b[property]);
		}),

		byGreater: function byGreater(a, b) {
			return a === b ? 0 : a > b ? 1 : -1 ;
		},

		byAlphabet: function byAlphabet(a, b) {
			return S.localeCompare.call(a, b);
		},

		assign: curry(function assign(obj2, obj1) {
			return Object.assign(obj1, obj2);
		}),

		get: curry(function get(path, object) {
			return typeof path === 'number' ? object[path] :
				path === '' ? object :
				objFrom(object, splitPath(path));
		}),

		set: curry(function set(path, value, object) {
			if (typeof path === 'number') { return object[path] = value; }
			var array = splitPath(path);
			return array.length === 1 ?
				(object[path] = value) :
				objTo(object, array, value);
		}),

		invoke: curry(function invoke(name, object) {
			return object[name]();
		}),

		run: function run(fn) {
			return fn();
		},

		concat:      curry(function concat(array2, array1) { return A.concat.call(array1, array2); }),
		each:        curry(function each(fn, object) { return A.forEach.call(object, fn); }),
		filter:      curry(function filter(fn, object) { return A.filter.call(object, fn); }),
		map:         curry(function map(fn, object) { return A.map.call(object, fn); }),
		reduce:      curry(function reduce(fn, n, object) { return A.reduce.call(object, fn, n); }),
		slice:       curry(function slice(n, m, object) { return A.slice.call(object, n, m); }),
		sort:        curry(function sort(fn, object) { return A.sort.call(object, fn); }),

		push: curry(function push(stream, object) {
			(stream.push || A.push).apply(stream, object);
			return stream;
		}),

		add:         curry(function add(a, b) { return b + a; }),
		multiply:    curry(function multiply(a, b) { return b * a; }),
		mod:         curry(function mod(a, b) { return b % a; }),
		pow:         curry(function pow(a, b) { return Math.pow(b, a); }),
		normalise:   curry(function normalise(min, max, value) { return (value - min) / (max - min); }),
		denormalise: curry(function denormalise(min, max, value) { return value * (max - min) + min; }),
		toFixed:     curry(function toFixed(n, value) { return N.toFixed.call(value, n); }),

		rangeLog: curry(function rangeLog(min, max, n) {
			return Fn.denormalise(min, max, Math.log(value / min) / Math.log(max / min))
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
		match: curry(function match(regex, string) { return regex.test(string); }),
		exec: curry(function parse(regex, string) { return regex.exec(string) || undefined; }),

		slugify: function slugify(string) {
			if (typeof string !== 'string') { return; }
			return string.trim().toLowerCase().replace(/[\W_]/g, '-');
		},

		// Booleans
		not: function not(object) { return !object; },

		// Types

		isDefined: function isDefined(value) {
			return value !== undefined && value !== null;
		},

		typeOf: function typeOf(object) {
			return typeof object;
		},

		classOf: function classOf(object) {
			return O.toString.apply(object).slice(8, -1);
		},

		typeOfString: function typeOfString(string) {
			// Determine the type of string from its text content. Not to be used
			// as a definitive typing, but useful nonetheless.
			return /^(?:\/|https?\:\/\/)(?:[!#$&-;=?-~\[\]\w]|%[0-9a-fA-F]{2})+$/.test(string) ? 'url' :
				/^(?:null|true|false)|^\{|^\[/.test(string) ? 'json' :
				'string' ;
		}
	});


	// Stream

	function arrayNext(array) {
		var value;

		// Shift values out ignoring undefined
		while (array.length && value === undefined) {
			value = array.shift();
		}

		return value;
	}

	var notifyObservers = curry(function(observers, type) {
		if (!observers[type]) { return; }
		//(new ReadStream(observers[type])).pull(Fn.run);
		var array = A.slice.apply(observers[type]);
		array.forEach(Fn.run);
	});

	function notifyObserversExceptPush(observers, type) {
		if (type === 'push') { return; }
		return notifyObservers(observers, type);
	}

	function Stream(setup) {
		// Enable calling Stream without the new keyword.
		if (!this || !Stream.prototype.isPrototypeOf(this)) {
			return new Stream(setup);
		}

		var observers = {};
		var notify = notifyObservers(observers);

		function trigger(type) {
			// Prevent 'push' event calls from within 'next' event calls. This
			// is a bit of a clunky workaround to stop greedy processes
			// consuming the stream while the next values are being requested.
			var _notify = notify;
			notify = notifyObserversExceptPush;
			_notify(observers, type);
			notify = _notify;
		}

		Object.assign(this, setup(trigger));

		this.on = function on(type, fn) {
			// Lazily create observers list
			observers[type] = observers[type] || [] ;

			// Add observer
			observers[type].push(fn);

			return this;
		};
	}

	function BufferStream(object) {
		if (!this || !BufferStream.prototype.isPrototypeOf(this)) {
			return new BufferStream(object);
		}

		// Todo: Is this needed?
		this.status = 'ready';

		Stream.call(this, function setup(notify) {
			var buffer = typeof object === 'string' ? A.slice.apply(object) : object || [] ;

			return {
				next: function next() {
					var value = buffer.shift();

					if (buffer.status === 'done') {
						this.status = 'done';
					}

					return value;
				},

				push: function push() {
					buffer.push.apply(buffer, arguments);
					notify('push');
				}
			};
		});
	}

	function ReadStream(object) {
		if (!this || !ReadStream.prototype.isPrototypeOf(this)) {
			return new ReadStream(object);
		}

		Stream.call(this, function setup(notify) {
			var buffer = typeof object === 'string' ? A.slice.apply(object) : object || [] ;

			return {
				next: function() {
					var value = buffer.shift();

					if (buffer.status === 'done' || buffer.length === 0) {
						this.status = 'done';
					}

					return value;
				}
			};
		});
	}

	Object.assign(Stream.prototype, {
		create: function(next) {
			var stream = Object.create(this);
			stream.next = next;
			return stream;
		},

		push: function(input) {
			throw new Error('Fn: ' + this.constructor.name + ' is not pushable.');
		},

		shift: function() {
			return this.next();
		},

		pull: function pull1(fn) {
			fn = fn || Fn.noop;

			var next = this.next;

			function flush() {
				var value;

				while ((value = next()) !== undefined) {
					fn(value);
				}
			}

			this.pull = function pull2(fn2) {
				var fn1 = fn;

				fn = function distribute() {
					fn1.apply(null, arguments);
					fn2.apply(null, arguments);
				};

				// Return source
				return this;
			};

			// Flush the source then listen for values
			flush();
			return this.on('push', flush);
		},

		pipe: function(object) {
			// object is either:
			// array -
			// stream -
			// undefined -

			var source = this;
			var stream = object || new BufferStream();

			this.tap(function(value) {
				stream.push(value);
			});

			if (stream.on) {
				// There's something stinky yet elegant about these two.
				stream
				.on('next', function() {
					// Call .next(), which fills all streams with the new value.
					var v = source.next();
				});

				source
				.on('push', function() {
					// Notify a push event without actually pushing any values,
					// because .next() will do that if it's asked for.
					stream.push();
				});
			}

			return stream;
		},

		tap: function(fn) {
			// Overwrite next to copy values to tap fn
			this.next = Fn.compose(function(value) {
				if (value !== undefined) { fn(value); }
				return value;
			}, this.next);

			return this;
		},

		map: function(fn) {
			return this.create(Fn.compose(function next(value) {
				return value !== undefined ? fn(value) : undefined ;
			}, this.next));
		},

		head: function() {
			var source = this;
			var i = 0;

			return this.create(function next() {
				if (i++ === 0) {
					this.status = 'done';
					return source.next();
				}
			});
		},

		tail: function() {
			var source = this;
			var i = 0;

			return this.create(function next() {
				if (i++ === 0) { source.next(); }
				return source.next();
			});
		},

		slice: function(n, m) {
			var source = this;
			var i = -1;

			return this.create(function next() {
				while (++i < n) {
					source.next();
				}

				if (i < m) {
					if (i === m - 1) { this.status = 'done'; }
					return source.next();
				}
			});
		},

		split: function(match) {
			var source = this;
			var buffer = [];

			return this.create(function next() {
				var value = source.next();
				var b;

				if (value === undefined) { return; }

				if (value === match) {
					b = buffer;
					buffer = [];
					return b;
				}

				buffer.push(value);

				if (source.status === 'done') {
					b = buffer;
					buffer = [];
					return b;
				}

				return next();
			});
		},

		group: function(fn, order) {
			var source = this;
			var channels = [];
			var store = {};

			fn = fn || Fn.id;

			function nextUntilMatchChannel(channelKey) {
				var value = source.next();
				if (value === undefined) { return; }

				var key = fn(value);

				if (store[key]) {
					store[key].push(value);
					if (store[key] === channelKey) { return; }
				}
				else {
					store[key] = create(key);
					channels.push(store[key]);
					store[key].push(value);
				}

				return nextUntilMatchChannel(channelKey);
			}

			function create(key) {
				var channel = new BufferStream();

				channel.on('next', function() {
					nextUntilMatchChannel(key);
				});

				// source.on('push', channel.push);
				if (debug) { channel.key = key; }
				return channel;
			}

			return this.create(function nextUntilNewChannel() {
				var channel = channels.shift();
				if (channel) { return channel; }

				var value = source.next();
				if (value === undefined) { return; }

				var key = fn(value);

				if (store[key]) {
					store[key].push(value);
				}
				else {
					store[key] = create(key);
					store[key].push(value);
					return store[key];
				}

				return nextUntilNewChannel();
			});
		},

		concatParallel: function() {
			var source = this;
			var object;
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
				var value = stream.next();
				return value === undefined ?
					shiftNext() :
					value ;
			}

			return this.create(function next() {
				var object = source.next();
				if (object !== undefined) { bind(object); }
				var value = shiftNext();
				return value;
			});
		},

		concatSerial: function() {
			var source = this;
			var object;

			return this.create(function next() {
				object = object || source.next();
				if (object === undefined) { return; }

				var value = object.next ? object.next() : object.shift() ;

				if (value === undefined) {
					object = undefined;
					return next();
				}

				return value;
			});
		},

		find: function(fn) {
			var source = this;

			// Allow filter to be used without fn, where it filters out undefined
			fn = typeof fn === 'object' ? compare(fn) :
				fn.apply ? fn :
				Fn.is(fn) ;

			function process() {
				var value;

				while ((value = source.next()) !== undefined && !fn(value));

				if (value !== undefined) {
					// Process is a call once kind of thing
					process = noop;
				}

				return value;
			}

			return new this.constructor(function next() {
				return process();
			}, source.push);
		},

		filter: function(fn) {
			var source = this;

			fn = typeof fn === 'object' ? Fn.compare(fn) : fn ;

			return this.create(function next() {
				var value;
				while ((value = source.next()) !== undefined && !fn(value));
				return value;
			}, source.push);
		},

		scan: function(fn) {
			var i = 0, t = 0;
			return this.map(function scan(value) {
				return fn(value, t, i++);
			});
		},

		sort: function(fn) {
			var source = this;
			var array = [];

			fn = fn || Fn.byGreater ;

			return new this.constructor(function next() {
				if (array.length === 0) {
					array = source.toArray();
					array.sort(fn);
				}

				return array.shift();
			}, source.push);
		},

		unique: function() {
			var source = this;
			var buffer = [];

			return new this.constructor(function unique() {
				var value = source.next();

				if (value === undefined) { return; }

				if (buffer.indexOf(value) === -1) {
					buffer.push(value);
					return value;
				}

				// If we have not already returned carry on looking
				// for a unique value.
				return unique();
			}, source.push);
		},

		batch: function(n) {
			var source = this;
			var buffer = [];

			return new this.create(n ?
				// If n is defined batch into arrays of length n.
				function nextBatchN() {
					var value;

					while (buffer.length < n) {
						value = source.next();
						if (value === undefined) { return; }
						buffer.push(value);
					}

					if (buffer.length >= n) {
						var _buffer = buffer;
						buffer = [];
						return _buffer;
					}
				} :

				// If n is undefined or 0, batch all values into an array.
				function nextBatch() {
					buffer = source.toArray();
					// An empty array is equivalent to undefined
					return buffer.length ? buffer : undefined ;
				});
		},

		concatAll: function() {
			var source = this;
			var object;

			return this.create(function next() {
				var value = object.next ? object.next() : object.shift() ;
				if (value !== undefined) { return value; }
				object = source.next();
				if (object === undefined) { return; }
				return next();
			});
		},

		concatMap: function(fn) {
			return this.map(fn).concatAll();
		},

		chain: function(n) {
			var source = this;
			var buffer = [];
			var stream = this.create(function next() {
				var value = buffer.shift() ;

				if (value !== undefined) {
					return value;
				}

				if (source.status === 'done') {
					this.status = 'done';
					return;
				}

				var b = source.next();

				if (b === undefined) {
					return;
				}

				buffer = ReadStream(b);
				return next();
			});

			stream.status = 'active';
			return stream;
		},

		add:         function(n) { return this.map(Fn.add(n)); },
		subtract:    function(n) { return this.map(Fn.subtract(n)); },
		multiply:    function(n) { return this.map(Fn.multiply(n)); },
		divide:      function(n) { return this.map(Fn.divide(n)); },
		mod:         function(n) { return this.map(Fn.mod(n)); },
		pow:         function(n) { return this.map(Fn.pow(n)); },
		normalise:   function(min, max) { return this.map(Fn.normalise(min, max)); },
		denormalise: function(min, max) { return this.map(Fn.denormalise(min, max)); },

		boolify:     function() { return this.map(Boolean); },
		stringify:   function() { return this.map(String); },
		jsonify:     function() { return this.map(JSON.stringify); },
		slugify:     function() { return this.map(Fn.slugify); },
		match:       function(regex) { return this.map(Fn.match(regex)); },
		exec:        function(regex) { return this.map(Fn.exec(regex)); },

		get:         function(name) { return this.map(Fn.get(path)); },
		set:         function(name, value) { return this.map(Fn.set(path, value)); },
		assign:      function(object) { return this.map(Fn.assign(object)); },

		typeOf: function() { return this.map(Fn.typeOf); },
		classOf: function() { return this.map(Fn.classOf); },

		done: function(fn) {
			var source = this;
			var next = this.next;

			this.next = function next() {
				var value = _next.apply(source);
				if (value === undefined) { fn(); }
				return value;
			};

			return this;
		},

		apply: function(ignored, values) {
			this.push.apply(this, values);
			return this.next();
		},

		call: function() {
			var values = A.slice.call(arguments, 1);
			return this.apply(this, values);
		},

		toArray: function() {
			var result = [];
			var value;

			while ((value = this.next()) !== undefined) {
				result.push(value);
			}

			return result;
		},

		toReadStream: function() {
			return new ReadStream(this);
		},

		toString: function() {
			return this.toArray().join('');
		},

		toFunction: function() {
			var source = this;
			return function fn() {
				return source.apply(source, arguments);
			};
		},

		toPromise: function() {
			var source = this;
			var value = this.next();

			return new Promise(function setup(next, reject) {
				if (value !== undefined) {
					next(value);
					return;
				}

				source
				.on('push', function() {
					var value = source.next();
					if (value !== undefined) { next(value); }
				})
				.on('end', reject);
			});
		}
	});

	Stream.prototype.toJSON = Stream.prototype.toArray;

	Object.setPrototypeOf(ReadStream.prototype, Stream.prototype);
	Object.setPrototypeOf(BufferStream.prototype, Stream.prototype);

	Object.assign(Fn, {
		Stream:       Stream,
		ReadStream:   ReadStream,
		BufferStream: BufferStream
	});


	// Export

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

			while (type = types.shift()) {
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
			var type, calls, list, listeners, n;

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

			while (type = types.shift()) {
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
			var type, target, i, l, params, result;

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

	assign(Collection.prototype, mixin.events, {
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

		get: function(property) {
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

		set: function(property, value) {
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

	Collection.add = add;
	Collection.remove = remove;
	Collection.isCollection = isCollection;

	window.Collection = Collection;
})(this);

(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('Sparky');
	console.log('https://labs.cruncher.ch/sparky');
	console.log('_______________________________');
})(this);


(function(window) {
	"use strict";

	var assign = Object.assign;

	var rurljson = /\/\S*\.json$/;

	// Utility functions

	var noop      = Fn.noop;
	var isDefined = Fn.isDefined;
	var id        = Fn.id;
	var call      = Fn.call;

	function returnThis() { return this; }

	// Debug

	function nodeToText(node) {
		return [
			'<',
			Sparky.dom.tag(node),
			//(node.className ? ' class="' + node.className + '"' : ''),
			//(node.getAttribute('href') ? ' href="' + node.getAttribute('href') + '"' : ''),
			(node.getAttribute('data-fn') ? ' data-fn="' + node.getAttribute('data-fn') + '"' : ''),
			(node.getAttribute('data-scope') ? ' data-scope="' + node.getAttribute('data-scope') + '"' : ''),
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
			throw new Error('Sparky: node cannot be found on Sparky(node) setup: ' + selector);
		}

		// If node is a template use a copy of it's content.
		if (Sparky.dom.tag(node) === 'template') {
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

	function resolveFn(node, fn, ctrl) {
		// The ctrl list can be a space-separated string of ctrl paths,
		return typeof fn === 'string' ? makeFn(fn, ctrl) :
			// a function,
			typeof fn === 'function' ? makeDistributeFn([fn]) :
			// an array of functions,
			typeof fn === 'object' ? makeDistributeFn(fn) :
			// or defined in the data-fn attribute
			node.getAttribute && makeFn(node.getAttribute('data-fn'), ctrl) ;
	}

	function makeDistributeFn(list) {
		return function distributeFn(node, model) {
			// Distributor controller
			var l = list.length;
			var n = -1;
			var scope = model;
			var result;

			// TODO: This is exposes solely so that ctrl
			// 'observe-selected' can function in sound.io.
			// Really naff. Find a better way.
			this.ctrls = list;

			var flag = false;

			this.interrupt = function interrupt() {
				flag = true;
				return list.slice(n + 1);
			};

			while (++n < l) {
				// Call the list of ctrls, in order.
				result = list[n].call(this, node, scope);

				// Returning false interrupts the fn calls.
				if (flag) { return false; }

				// Returning an object sets that object to
				// be used as scope.
				if (result !== undefined) { scope = result; }
			}

			return scope;
		};
	}

	function makeDistributeFnFromPaths(paths, ctrls) {
		var list = [];
		var l = paths.length;
		var n = -1;
		var ctrl;

		while (++n < l) {
			ctrl = Sparky.get(ctrls, paths[n]);

			if (!ctrl) {
				throw new Error('Sparky: data-fn "' + paths[n] + '" not found in sparky.ctrl');
			}

			list.push(ctrl);
		}

		return makeDistributeFn(list);
	}

	function makeFn(string, ctrls) {
		if (!isDefined(string)) { return; }
		var paths = string.trim().split(Sparky.rspaces);
		return makeDistributeFnFromPaths(paths, ctrls);
	}

	function replaceWithComment(node, i, sparky) {
		// If debug use comments as placeholders, otherwise use text nodes.
		var placeholder = Sparky.debug ?
			Sparky.dom.create('comment', Sparky.dom.tag(node)) :
			Sparky.dom.create('text', '') ;
		Sparky.dom.before(node, placeholder);
		Sparky.dom.remove(node);
		return placeholder;
	}

	function replaceWithNode(node, i, sparky) {
		var placeholder = sparky.placeholders[i];
		Sparky.dom.before(placeholder, node);
		Sparky.dom.remove(placeholder);
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
			if (init) { fn(Sparky.get(scope, path)); }
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
			if (path) { throttle(Sparky.get(scope, path)); }
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

	function Sparky(node, scope, fn, parent) {
		// Allow calling the constructor with or without 'new'.
		if (!(this instanceof Sparky)) {
			return new Sparky(node, scope, fn, parent);
		}

		var sparky = this;
		var init = true;
		var initscope = scope;
		var ctrlscope;
		var parsed;

		// Use scope variable as current scope.
		scope = undefined;

		var data = parent ? parent.data : Sparky.data;
		var ctrl = parent ? parent.fn : Sparky.fn;
		var unobserveScope = noop;
		var addThrottle = Sparky.Throttle(addNodes);
		var removeThrottle = Sparky.Throttle(removeNodes);

		function updateScope(object) {
			// If scope is unchanged, do nothing.
			if (scope === (ctrlscope || object)) { return; }

			// If old scope exists, tear it down
			if (scope && parsed) { teardown(scope, parsed.bindings); }

			// ctrlscope trumps new objects
			scope = ctrlscope || object;

			if (scope && parsed) {
				// Run initialiser fns, if any
				if (parsed.setups.length) { initialise(parsed.setups, init); }

				// Assign and set up scope
				setup(scope, parsed.bindings, init);
			}

			// Trigger scope first, children assemble themselves
			sparky.trigger('scope', scope);

			// Then update this node
			updateNodes(sparky, scope, addNodes, addThrottle, removeNodes, removeThrottle, init);
			init = false;
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
			throw new Error("Sparky: Sparky(node) – node not found: " + node);
		}

		Sparky.logVerbose('Sparky(', node, initscope, fn && (fn.call ? fn.name : fn), ')');

		fn = resolveFn(node, fn, ctrl);

		// Define data and ctrl inheritance
		Object.defineProperties(this, {
			data: { value: Object.create(data), writable: true },
			fn:   { value: Object.create(ctrl) },
			placeholders: { writable: true }
		});

		this.scope = function(object) {
			resolveScope(node, object, parent ? parent.data : Sparky.data, observeScope, updateScope);
			return this;
		};

		// Setup this as a Collection of nodes. Where node is a document
		// fragment, assign all it's children to sparky collection.
		Collection.call(this, node.nodeType === 11 ? node.childNodes : [node]);

		// Todo: SHOULD be able to get rid of this, if ctrl fns not required to
		// accept scope as second parameter. Actually, no no no - the potential
		// scope must be passed to the fn, as the fn may return a different
		// scope and has no access to this one otherwise.
		resolveScope(node, initscope, parent ? parent.data : Sparky.data, function(basescope, path) {
			ctrlscope = Sparky.get(basescope, path);
		}, function(object) {
			ctrlscope = object;
		});

		// If fn is to be called and a scope is returned, we use that.
		if (fn) {
			ctrlscope = fn.call(sparky, node, ctrlscope) ;
		}

		// A controller returning false is telling us not to do data
		// binding. We can skip the heavy work.
		if (ctrlscope === false) {
			this.on('destroy', function() {
				Sparky.dom.remove(this);
			});

			// Todo: We don't ALWAYS want to call .scope() here.
			// if (initscope) { this.scope(initscope); }
			this.scope(initscope);
			init = false;
			return;
		}

		// If ctrlscope is unchanged from scope, ctrlscope should not override
		// scope changes. There's probably a better way of expressing this.
		if (ctrlscope === initscope) { ctrlscope = undefined; }

		// Define .render() for forcing tags to update.
		this.render = function() {
			render(scope, parsed.bindings, arguments);
			this.trigger.apply(this, ['render'].concat(arguments));
		};

		// Register destroy on this sparky before creating child nodes, so that
		// this gets destroyed before child sparkies do.
		this.on('destroy', function() {
			Sparky.dom.remove(this);
			this.placeholders && Sparky.dom.remove(this.placeholders);
			unobserveScope();
			teardown(scope, parsed.bindings);
			destroy(parsed);
		});

		// Parse the DOM nodes for Sparky tags.
		parsed = Sparky.parse(sparky, function get(path) {
				return scope && Sparky.get(scope, path);
			}, function set(property, value) {
				scope && Sparky.set(scope, property, value);
			}
		);

		// Instantiate children AFTER this sparky has been fully wired up. Not
		// sure why. Don't think it's important.
		parsed.nodes.forEach(function(node) {
			return sparky.create(node, scope);
		});

		// Don't keep nodes hanging around in memory
		parsed.nodes.length = 0;

		// If there is scope, set it up now
		if (initscope || ctrlscope) { this.scope(initscope || ctrlscope); }

		init = false;
	}

	Sparky.prototype = Object.create(Collection.prototype);

	assign(Sparky.prototype, {
		// Create a child Sparky dependent upon this one.
		create: function(node, scope, fn) {
			var boss = this;
			var sparky = Sparky(node, scope, fn, this);

			function delegateDestroy() { sparky.destroy(); }
			function delegateScope(self, scope) { sparky.scope(scope); }
			function delegateRender(self) { sparky.render(); }

			// Bind events...
			this
			.on('destroy', delegateDestroy)
			.on('scope', delegateScope)
			.on('render', delegateRender);

			return sparky.on('destroy', function() {
				boss
				.off('destroy', delegateDestroy)
				.off('scope', delegateScope)
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
			return jQuery(this.filter(Sparky.dom.isElementNode));
		}
	});

	// Export

	assign(Sparky, {
		debug: false,
		log: log,
		logVerbose: logVerbose,

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
			return Sparky.dom.template.apply(this, arguments);
		}
	});

	window.Sparky = Sparky;
})(this);

(function(Sparky) {
	"use strict";

	var assign = Object.assign;
	var slice  = Function.prototype.call.bind(Array.prototype.slice);
	var reduce = Function.prototype.call.bind(Array.prototype.reduce);
	var dom = {};

	// Utility functions

	function noop() {}

	function isDefined(val) { return val !== undefined && val !== null; }

	function all(fn) {
		return function(node, collection) {
			var n = -1;
			var length = collection.length;
			while (++n < length) { fn(node, collection[n]); }
			return node;
		};
	}

	// Selection, traversal and mutation

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
			var array = tokens ? tokens.trim().split(Sparky.rspaces) : [] ;

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
			var array = tokens ? tokens.trim().split(Sparky.rspaces) : [] ;
			var i;

			while (n--) {
				i = array.indexOf(arguments[n]);
				if (i !== -1) { array.splice(i, 1); }
			}

			this.set(this.node, array.join(' '));
		}
	};

	function getClass(node) {
		// node.className is an object in SVG. getAttribute
		// is more consistent, if a tad slower.
		return node.getAttribute('class');
	}

	function setClass(node, classes) {
		if (node instanceof SVGElement) {
			node.setAttribute('class', classes);
		}
		else {
			node.className = classes;
		}
	}

	function getClassList(node) {
		return node.classList || new TokenList(node, getClass, setClass);
	}

	function getStyle(node, name) {
		return window.getComputedStyle ?
			window
			.getComputedStyle(node, null)
			.getPropertyValue(name) :
			0 ;
	}

	function matches(node, selector) {
		return node.matches ? node.matches(selector) :
			node.matchesSelector ? node.matchesSelector(selector) :
			node.webkitMatchesSelector ? node.webkitMatchesSelector(selector) :
			node.mozMatchesSelector ? node.mozMatchesSelector(selector) :
			node.msMatchesSelector ? node.msMatchesSelector(selector) :
			node.oMatchesSelector ? node.oMatchesSelector(selector) :
			node.tagName.toLowerCase() === selector ;
	}

	function closest(node, selector, root) {
		if (!node || node === root || node === document || node.nodeType === 11) { return; }

		if (node.correspondingUseElement) {
			// SVG <use> elements store their DOM reference in
			// .correspondingUseElement.
			node = node.correspondingUseElement;
		}

		return matches(node, selector) ?
			 node :
			 closest(node.parentNode, selector, root) ;
	}

	function tagName(node) {
		return node.tagName.toLowerCase();
	}

	function createNode(name) {
		// create('comment', 'Text');
		if (name === 'comment' || name === '!') {
			return document.createComment(arguments[1]);
		}

		// create('text', 'Text')
		if (name === 'text') {
			return document.createTextNode(arguments[1]);
		}

		// create('fragment')
		if (name === 'fragment') {
			return document.createDocumentFragment();
		}

		// create('div', 'HTML')
		var node = document.createElement(name);
		node.innerHTML = arguments[1];
		return node;
	}

	function append(node1, node2) {
		node1.appendChild(node2);
		return node1;
	}

	function empty(node) {
		while (node.lastChild) { node.removeChild(node.lastChild); }
	}

	function remove(node) {
		node.parentNode && node.parentNode.removeChild(node);
	}

	function insertBefore(target, node) {
		target.parentNode && target.parentNode.insertBefore(node, target);
	}

	function insertAfter(target, node) {
		target.parentNode && target.parentNode.insertBefore(node, target.nextSibling);
	}

	function query(node, selector) {
		if (arguments.length === 1 && typeof node === 'string') {
			selector = node;
			node = document;
		}

		return slice(node.querySelectorAll(selector));
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

	assign(dom, {
		query:     query,
		tag:       tagName,
		create:    createNode,

		append: function(node1, node2) {
			if (Node.prototype.isPrototypeOf(node2)) {
				append(node1, node2);
			}
			else {
				Array.prototype.forEach.call(node2, function(node) {
					append(node1, node);
				});
			}
		},

		after:     insertAfter,
		before:    insertBefore,
		empty:     empty,
		remove:    function(node) {
			if (Node.prototype.isPrototypeOf(node)) {
				remove(node);
				return;
			}

			Array.prototype.forEach.call(node, remove);
		},
		closest:   closest,
		matches:   matches,
		classes:   getClassList,
		style:     getStyle,
		getClass:  getClass,
		setClass:  setClass,
		isElementNode:  isElementNode,
		isTextNode:     isTextNode,
		isCommentNode:  isCommentNode,
		isFragmentNode: isFragmentNode
	});


	// Templates

	var templates = {};
	var rcomment = /\{\s*\/\*\s*([\s\S]*)\s*\*\/\s*\}$/;

	function fragmentFromChildren(node) {
		var children = slice(node.childNodes);
		var fragment = document.createDocumentFragment();
		return reduce(children, append, fragment);
	}

	function fragmentFromContent(node) {
		// A template tag has a content property that gives us a document
		// fragment. If that doesn't exist we must make a document fragment.
		return node.content || fragmentFromChildren(node);
	}

	function getTemplate(id) {
		var node = document.getElementById(id);
		if (!node) { throw new Error('dom: element id="' + id + '" is not in the DOM.') }

		var tag = dom.tag(node);

		if (tag !== 'template' && tag !== 'script') { return; }

		if (node.content) {
			return fragmentFromContent(node);
		}
		else {
			// In browsers where templates are not inert, ids used inside them
			// conflict with ids in any rendered result. To go some way to
			// tackling this, remove the node from the DOM.
			remove(node);
			return fragmentFromChildren(node);
		}
	}

	function cloneTemplate(id) {
		var template = templates[id] || (templates[id] = getTemplate(id));
		return template && template.cloneNode(true);
	}

	function multiline(fn) {
		if (typeof fn !== 'function') { throw new TypeError('multiline(fn) expects a function.'); }
		var match = rcomment.exec(fn.toString());
		if (!match) { throw new TypeError('Multiline comment missing.'); }
		return match[1];
	}

	function registerTemplate(id, node) {
		if (typeof node === 'function') {
			var template = dom.create('template');
			template.innerHTML = multiline(node);
			node = fragmentFromContent(template);
		}

		templates[id] = node;
	}

	assign(dom, {
		template: function(id, node) {
			if (node) { registerTemplate(id, node); }
			else { return cloneTemplate(id); }
		},

		fragmentFromTemplate: cloneTemplate,
		fragmentFromContent: fragmentFromContent
	});


	// Events

	var eventOptions = { bubbles: true };

	function createEvent(type) {
		return new CustomEvent(type, eventOptions);
	}

	function delegate(selector, fn) {
		// Create an event handler that looks up the ancestor tree
		// to find selector.
		return function handler(e) {
			var node = closest(e.target, selector, e.currentTarget);

			if (!node) { return; }

			e.delegateTarget = node;
			return fn(e);
		};
	}

	function isPrimaryButton(e) {
		// Ignore mousedowns on any button other than the left (or primary)
		// mouse button, or when a modifier key is pressed.
		return (e.which === 1 && !e.ctrlKey && !e.altKey);
	}

	function trigger(node, type) {
		// Don't cache events. It prevents you from triggering an an event of a
		// type given type from inside the handler of another event of that type.
		node.dispatchEvent(createEvent(type));
	}

	function on(node, type, fn) {
		node.addEventListener(type, fn);
	}

	function off(node, type, fn) {
		node.removeEventListener(type, fn);
	}

	assign(dom, {
		on:       on,
		off:      off,
		trigger:  trigger,
		delegate: delegate,
		isPrimaryButton: isPrimaryButton
	});


	// Feature tests

	var testEvent = new CustomEvent('featuretest', { bubbles: true });

	function testTemplate() {
		// Older browsers don't know about the content property of templates.
		return 'content' in document.createElement('template');
	}

	function testEventDispatchOnDisabled() {
		// FireFox won't dispatch any events on disabled inputs:
		// https://bugzilla.mozilla.org/show_bug.cgi?id=329509

		var input = document.createElement('input');
		var result = false;

		append(document.body, input);
		input.disabled = true;
		input.addEventListener('featuretest', function(e) { result = true; });
		input.dispatchEvent(testEvent);
		dom.remove(input);

		return result;
	}

	dom.features = {
		template: testTemplate(),
		inputEventsOnDisabled: testEventDispatchOnDisabled()
	};


	// Export
	Sparky.dom = dom;
})(window.Sparky);


// Sparky.observe()
// Sparky.unobserve()

(function(window) {
	"use strict";

	// Import

	var Fn     = window.Fn;
	var Sparky = window.Sparky;

	// Utility functions

	var noop = Fn.noop;
	var isDefined = Fn.isDefined;

	// Handle paths

	var rpathtrimmer = /^\[|\]$/g;
	var rpathsplitter = /\]?(?:\.|\[)/g;
	var rpropselector = /(\w+)\=(\w+)/;
	var map = [];

	function isObject(obj) { return obj instanceof Object; }

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function select(object, key) {
		var selection = rpropselector.exec(key);

		return selection ?
			findByProperty(object, selection[1], JSON.parse(selection[2])) :
			object[key] ;
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
			isDefined(value) ? objFrom(value, array) :
			value ;
	}

	function objTo(root, array, obj) {
		var key = array[0];

		return array.length > 1 ?
			objTo(isObject(root[key]) ? root[key] : (root[key] = {}), array.slice(1), obj) :
			(root[key] = obj) ;
	}

	function observePath3(root, prop, array, fn, notify) {
		function update() {
			Sparky.logVerbose('path resolved to value:', root[prop]);
			fn(root[prop]);
		}

		Sparky.observe(root, prop, update, notify);

		return function unobserve() {
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
			object = o;
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
			return function unobserve() {
				destroy();
				root.off('add remove sort', updateSelection);
			};
		}
		else {
			Sparky.observe(root, prop, updateProperty, true);
			notify = true;
			return function unobserve() {
				destroy();
				Sparky.unobserve(root, prop, updateProperty);
			};
		}
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
		var array = splitPath(path);
		var value = objFrom(root, array.slice());

		if (isDefined(value)) {
			fn(value);
			return;
		}

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

	function getPath(obj, path) {
		return obj && (path === '.' ?
			obj :
			objFrom(obj, splitPath(path)));
	}

	function setPath(root, path, obj) {
		var array = splitPath(path);

		return array.length === 1 ?
			(root[path] = obj) :
			objTo(root, array, obj);
	}

	Sparky.get = getPath;
	Sparky.set = setPath;

	Sparky.observePath = Sparky.try(observePath, function message(root, path) {
		return 'Sparky: failed to observe path "' + path + '" in object ' + JSON.stringify(root);
	});

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
		};

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

		if (property === 'length') {
			// Observe length and update the DOM on next
			// animation frame if it changes.
			var descriptor = Object.getOwnPropertyDescriptor(object, property);

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

		if (property === 'length') {
			var descriptor = Object.getOwnPropertyDescriptor(object, property);
			if (!descriptor.get && !descriptor.configurable) {
				return unpoll(object, property, fn);
			}
		}

		return unobserve(object, property, fn);
	};
})(this);


// Sparky.Throttle(fn)

(function(window) {
	"use strict";

	// Import

	var Fn     = window.Fn;
	var Sparky = window.Sparky;

	// Utility functions

	var noop = Fn.noop;

	function Throttle(fn) {
		var queued, context, args;

		function update() {
			queued = false;
			fn.apply(context, args);
		}

		function cancel() {
			// Don't permit further changes to be queued
			queue = noop;

			// If there is an update queued apply it now
			if (queued) { update(); }

			// Make the queued update do nothing
			fn = noop;
		}

		function queue() {
			// Don't queue update if it's already queued
			if (queued) { return; }

			// Queue update
			window.requestAnimationFrame(update);
			queued = true;
		}

		function throttle() {
			// Store the latest context and arguments
			context = this;
			args = arguments;

			// Queue the update
			queue();
		}

		throttle.cancel = cancel;
		//update();

		return throttle;
	}

	Sparky.Throttle = Throttle;
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
	var Sparky = window.Sparky;
	var dom    = Sparky.dom;

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
	var rfilter = /\s*([a-zA-Z0-9_\-]+)\s*(?:\:(.+))?/;

	// Matches anything with a space
	var rspaces = /\s+/;

	// Matches anything that contains a non-space character
	var rtext = /\S/;

	// Matches the arguments list in the result of a fn.toString()
	var rarguments = /function(?:\s+\w+)?\s*(\([\w\,\s]*\))/;

	var filterCache = {};

	var empty = [];

	// Utility functions

	var noop      = Fn.noop;
	var identity  = Fn.id;
	var call      = Fn.call;
	var isDefined = Fn.isDefined;
	var classOf   = Fn.classOf;

	var slice = Function.prototype.call.bind(Array.prototype.slice);

	// DOM

	function setAttributeSVG(node, attribute, value) {
		if (attribute === 'd' || attribute === "transform" || attribute === "viewBox") {
			node.setAttribute(attribute, value);
		}
		else if (attribute === "href") {
			node.setAttributeNS(Sparky.xlinkNamespace, attribute, value);
		}
		else {
			node.setAttributeNS(Sparky.svgNamespace, attribute, value);
		}
	}

	function setAttributeHTML(node, attribute, value) {
		node.setAttribute(attribute, value);
	}

	function toggleAttributeSVG(node, attribute, value) {
		if (value) { setAttributeSVG(node, attribute, value); }
		else { node.removeAttribute(attribute); }
	}

	function toggleAttributeHTML(node, attribute, value) {
		if (value) { setAttributeHTML(node, attribute, attribute); }
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
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);

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

			// Set up special binding for certain elements like form inputs
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
			template = Sparky.template(id);

			// If the template does not exist, do nothing.
			if (!template) {
				Sparky.log('template "' + id + '" not found in DOM.');
				return;
			}

			// childNodes is a live list, and we don't want that because we may
			// be about to modify the DOM.
			nodes = slice(template.childNodes);

			// Wait for scope to become available with a self-unbinding function
			// before appending the template to the DOM. BE AWARE, here, that
			// this could throw a bug in the works: we're currently looping over
			// bindings outside of the call to bind, and inside we call unbind,
			// which modifies bindings... see? It won't bug just now, becuase
			// reverse loops, but if you change anything...
			setup(function domify() {
				Sparky.dom.empty(node);
				Sparky.dom.append(node, template);
			});
		}
		else {
			// childNodes is a live list, and we don't want that because we may
			// be about to modify the DOM.
			nodes = slice(node.childNodes);
		}

		var n = -1;
		var l = nodes.length;
		var child, sparky, unbind;

		// Loop forwards through the children
		while (++n < l) {
			child = nodes[n];

			// Don't bind child nodes that have their own Sparky controllers.
			if (child.getAttribute && (
				isDefined(child.getAttribute('data-fn')) ||
				isDefined(child.getAttribute('data-scope'))
			)) {
				//create(child);
				create(child);
				//unobservers.push(sparky.destroy.bind(sparky));
			}
			else if (parsers[child.nodeType]) {
				unobservers.push.apply(unobservers, parsers[child.nodeType](child, bind, unbind, get, set, setup, create));
			}
		}
	}

	function bindClasses(node, bind, unbind, get, unobservers) {
		var classes = dom.getClass(node);

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
		dom.setClass(node, text);

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
		var isSVG = node instanceof SVGElement;

		// Look for data- aliased attributes before attributes. This is
		// particularly important for the style attribute in IE, as it does not
		// return invalid CSS text content, so Sparky can't read tags in it.
		var alias = node.getAttribute('data-' + attribute) ;

		// SVG has case sensitive attributes.
		var attr = aliases[attribute] || attribute ;
		var value = alias ? alias :
		    	isSVG ? node.getAttributeNS(Sparky.xlinkNamespace, attr) || node.getAttribute(attr) :
		    	node.getAttribute(attr) ;

		if (!value) { return; }
		if (alias) { node.removeAttribute('data-' + attribute); }
		if (Sparky.debug === 'verbose') { console.log('Sparky: checking ' + attr + '="' + value + '"'); }

		var update = isSVG ?
		    	setAttributeSVG.bind(this, node, attr) :
		    	setAttributeHTML.bind(this, node, attr) ;

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

		var update = toggleAttributeHTML.bind(this, node, attr) ;

		observeProperties(value, bind, unbind, get, update, unobservers);
	}

	function toFilter(filter) {
		var parts = rfilter.exec(filter);

		return {
			name: parts[1],
			fn: Sparky.filters[parts[1]],

			// Leave the first arg empty. It will be populated with the value to
			// be filtered when the filter fn is called.
			args: parts[2] && JSON.parse('["",' + parts[2].replace(/\'/g, '\"') + ']') || []
		};
	}

	function applyFilters(word, filterString) {
		var filters = filterCache[filterString] || (
		    	filterCache[filterString] = filterString.split('|').map(toFilter)
		    );
		var l = filters.length;
		var n = -1;
		var args;

		while (++n < l) {
			if (!filters[n].fn) {
				throw new Error('Sparky: filter \'' + filters[n].name + '\' does not exist in Sparky.filters');
			}

			if (Sparky.debug === 'filter') {
				console.log('Sparky: filter:', filters[n].name, 'value:', word, 'args:', filters[n].args);
			}

			args = filters[n].args;
			args[0] = word;
			word = filters[n].fn.apply(Sparky, args);
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
			var value1 = get($2);
			var value2 = $3 ? applyFilters(value1, $3) : value1 ;
			return !isDefined(value2) ? '' :
				typeof value2 === 'string' ? value2 :
				typeof value2 === 'number' ? value2 :
				typeof value2 === 'boolean' ? value2 :
				// Beautify the .toString() result of functions
				typeof value2 === 'function' ? (value2.name || 'function') + (rarguments.exec(value2.toString()) || [])[1] :
				// Use just the Class string in '[object Class]'
				classOf(value2) ;
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
			window.requestAnimationFrame(function() {
				update();
			});
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
			setTimeout(function() {
				Sparky.dom.trigger(node, 'valuechange');
				node.disabled = true;
			}, 0);
		}
		else {
			Sparky.dom.trigger(node, 'valuechange');
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
						dispatchInputChangeEvent(node);
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
					node.value = '';
				}

				dispatchInputChangeEvent(node);
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
		var nodeValue = node.getAttribute('value');
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
					results.bindings.push([path, fn, Sparky.Throttle(fn)]);
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
		var name = node.name;

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
		while (tag = Sparky.rtags.exec(node.name)) {
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
	};

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

	changeTags(/\{{2,3}/, /\}{2,3}/);


	// Export

	assign(Sparky, {
		parse: parse,
		parseName: parseName,
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

	// Logs nodes, scopes and data.
	Sparky.fn.log = function(node) {
		var sparky = this;

		function log(node, scope) {
			console.group('scope change');
			console.log('node ', node);
			console.log('scope', scope);
			console.log('data', sparky.data);
			console.log('fn', sparky.fn);
			console.groupEnd();
		}

		this.on('scope', log);

		console.group('initialisation');
		console.log('node ', node);
		console.groupEnd();
	};
})(this);

(function(window) {
	"use strict";

	var assign = Object.assign;
	var Sparky = window.Sparky;
	var dom    = Sparky.dom;

	assign(Sparky.fn, {
		"remove-hidden": function onReadyUnhide(node) {
			this.on('scope', function() {
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
		html: function html(node) {
			this.on('scope', function(sparky, html) {
				node.innerHTML = html;
			});
		}
	});
})(this);

(function() {
	"use strict";

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

		"scope": function(node) {
			this.on('scope', function(sparky, scope) {
				Sparky.setScope(node, scope);
			});
		}
	});
})();


(function() {
	"use strict";

	var dom = Sparky.dom;

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

	var assign = Object.assign;
	var Fn     = window.Fn;
	var Sparky = window.Sparky;
	var DOM    = Sparky.dom;

	// We maintain a list of sparkies that are scheduled for destruction. This
	// time determines how long we wait during periods of inactivity before
	// destroying those sparkies.
	var destroyDelay = 12000;

	var call = Fn.call;

	function create(boss, node, scope, fn) {
		// Create a dependent sparky without delegating scope
		var sparky = Sparky(node, scope, fn, this);

		function delegateDestroy() { sparky.destroy(); }
		function delegateRender(self) { sparky.render(); }

		// Bind events
		boss
		.on('destroy', delegateDestroy)
		.on('render', delegateRender);

		return sparky.on('destroy', function() {
			boss
			.off('destroy', delegateDestroy)
			.off('render', delegateRender);
		});
	}

	function createPlaceholder(node) {
		if (!Sparky.debug) { return DOM.create('text', ''); }

		var attrScope = node.getAttribute('data-scope');
		var attrCtrl = node.getAttribute('data-fn');

		return DOM.create('comment',
			(attrScope ? ' data-scope="' + attrScope + '"' : '') +
			(attrCtrl ? ' data-fn="' + attrCtrl + '" ' : ''));
	}

	Sparky.fn.each = function setupCollection(node) {
		var sparky   = this;
		var sparkies = [];
		var cache    = [];

		// We cannot use a WeakMap here: WeakMaps do not accept primitives as
		// keys, and a Sparky scope may be a number or a string.
		var rejects  = new Map();
		var scheduled = [];
		var clone    = node.cloneNode(true);
		var fns      = this.interrupt();
		var placeholder = createPlaceholder(node);
		var collection;

		var throttle = Sparky.Throttle(function update() {
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
					DOM.remove(sparkies[l][0]);
					rejects.set(object, sparkies[l]);
					scheduled.push(object);
				}
				else {
					map[i] = sparkies[l];
				}
			}

			l = sparkies.length = cache.length = collection.length;

			// Ignore any objects at the start of the collection that have
			// not changed position. Optimises for case where we're pushing
			// things on the end.
			while(cache[++n] && cache[n] === collection[n]);
			--n;

			// Loop through the collection, recaching objects and creating
			// sparkies where needed.
			while(++n < l) {
				object = cache[n] = collection[n];
				removeScheduled(object);
				sparkies[n] = map[n] || rejects.get(object) || create(sparky, clone.cloneNode(true), object, fns);

				// We are in an animation frame. Go ahead and manipulate the DOM.
				DOM.before(placeholder, sparkies[n][0]);
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
					rejects.get(object).destroy();
					rejects.delete(object);
				});
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
		DOM.before(node, placeholder);
		DOM.remove(node);

		this
		.on('scope', function(source, scope) {
			if (this !== source) { return; }
			if (scope === collection) { return; }
			if (collection) { unobserveCollection(); }
			collection = scope;
			if (scope === undefined) { return; }
			observeCollection();
		})
		.on('destroy', function destroy() {
			throttle.cancel();
			unobserveCollection();
		});
	};
})(this);

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


// Sparky.filters

(function(window) {
	"use strict";

	var Fn        = window.Fn;
	var Sparky    = window.Sparky;
	var isDefined = Fn.isDefined;
	var settings  = (Sparky.settings = Sparky.settings || {});

	// A reuseable array.
	var array = [];

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

	Sparky.filters = {
		add: function(value, n) {
			var result = parseFloat(value) + n ;
			if (Number.isNaN(result)) { return; }
			return result;
		},

		capfirst: function(value) {
			return value.charAt(0).toUpperCase() + value.substring(1);
		},

		cut: function(value, string) {
			return Sparky.filters.replace(value, string, '');
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

			var rletter = /([a-zA-Z])/g;
			var rtimezone = /(?:Z|[+-]\d{2}:\d{2})$/;
			var rnonzeronumbers = /[1-9]/;

			function createDate(value) {
				// Test the Date constructor to see if it is parsing date
				// strings as local dates, as per the ES6 spec, or as GMT, as
				// per pre ES6 engines.
				// developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse#ECMAScript_5_ISO-8601_format_support
				var date = new Date(value);
				var json = date.toJSON();
				var gmt =
					// It's GMT if the string matches the same length of
					// characters from it's JSONified version...
					json.slice(0, value.length) === value &&

					// ...and if all remaining numbers are 0.
					!json.slice(value.length).match(rnonzeronumbers) ;

				return typeof value !== 'string' ? new Date(value) :
					// If the Date constructor parses to gmt offset the date by
					// adding the date's offset in milliseconds to get a local
					// date. getTimezoneOffset returns the offset in minutes.
					gmt ? new Date(+date + date.getTimezoneOffset() * 60000) :

					// Otherwise use the local date.
					date ;
			}

			return function formatDate(value, format, lang) {
				if (!value) { return; }

				var date = value instanceof Date ? value : createDate(value) ;

				lang = lang || settings.lang;

				return format.replace(rletter, function($0, $1) {
					return formatters[$1](date, lang);
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

		// .default() can't work, because Sparky does not send undefined or null
		// values to be filtered.
		//'default': function(value) {
		//	return (this === '' || this === undefined || this === null) ? value : this ;
		//},

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
			var collection = Sparky.get(Sparky.data, path);
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
			return value ? value[name] : undefined ;
		},

		"greater-than": function(value1, value2, str1, str2) {
			return value1 > value2 ? str1 : str2 ;
		},

		contains: function(array, value) {
			return (array && array.indexOf(value) > -1);
		},

		invert: function(value) {
			return typeof value === 'boolean' ? !value :
				typeof value === 'number' ? 1 / value :
				!value ;
		},

		is: function(value, val, string1, string2) {
			return (value === val ? string1 : string2) || '';
		},

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

		lower: function(value) {
			String.prototype.toLowerCase.apply(value);
		},

		lowercase: function(value) {
			if (typeof value !== 'string') { return; }
			return String.prototype.toLowerCase.apply(value);
		},

		map: function(array, path) {
			return array && array.map(Fn.get(path));
		},

		mod: function(value, n) {
			if (typeof value !== 'number') { return; }
			return value % n;
		},

		multiply: function(value, n) {
			return value * n;
		},

		parseint: function(value) {
			return parseInt(value, 10);
		},

		percent: function(value) {
			return value * 100;
		},

		pluralize: function(value, str1, str2, lang) {
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

		reduce: (function(processes) {
			return function(array, name, initialValue) {
				return array && array.reduce(processes[name], initialValue || 0);
			};
		})({
			sum: function(a, b) { return a + b; }
		}),

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

			if (string === infinity) {
				return '∞';
			}

			if (string === ('-' + infinity)) {
				return '-∞';
			}

			return value;
		},

		time: function() {

		},

		//timesince
		//timeuntil
		//title

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