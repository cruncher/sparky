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

(function(ns) {
	"use strict";

	var mixin = ns.mixin || (ns.mixin = {});
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
			// If types is an object with a trigger method, set it up so that
			// events propagate from this object.
			if (arguments.length === 1 && types.trigger) {
				setupPropagation(this, types);
				return this;
			}

			if (!fn) { throw new Error('Sparky: calling .on("' + types + '", fn) but fn is ' + typeof fn); }

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
				// If the event has no listener queue, create one using a copy
				// of the all events listener array.
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

	var observe   = window.observe;
	var unobserve = window.unobserve;
	var mixin     = window.mixin;
	var assign    = Object.assign;

	var debug = false;

	var defaults = { index: 'id' };


	// Utils

	function returnUndefined() { return; }

	function returnThis() { return this; }

	function returnArgument(arg) { return arg; }

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	// Each functions

	function setValue(value, i) {
		this[i] = value;
	}

	// Sort functions

	function byGreater(a, b) {
		return a > b ? 1 : -1 ;
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
		if (!isDefined(object[index])) {
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
		while (collection[--l] && (collection[l][index] > object[index] || !isDefined(collection[l][index])));
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
		else if (!isDefined(array.length)) {
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
					return Array.prototype.sort.call(this, fn || options.sort || byIndex);
				}
			}
		});

		// Populate the collection
		assign(collection, array);
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
			0: returnUndefined,

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

		subset.destroy = function() {
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
			this.forEach(update);
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
	console.log('http://github.com/cruncher/sparky');
	//console.log('Live data binding templates for the DOM');
})(this);

// Sparky
//
// Reads data attributes in the DOM to bind dynamic data to
// controllers.
//
// Views
//
// <div data-ctrl="name" data-scope="path.to.data">
//     <h1>Hello world</h1>
// </div>
//
// Where 'name' is the key of a view function in
// Sparky.ctrl and path.to.data points to an object
// in Sparky.data.


(function(window){
	"use strict";

	var empty = [];

	//var rtag = /\{\{\s*([\w\-\.\[\]]+)\s*\}\}/g;

	// Check whether a path begins with '.' or '[', but not '..' or '[[', now
	// that we are able to redefine tag delimiters. Todo: when you sort out tag
	// delimiters clean this crap up.
	var rrelativepath = /^\.[^\.]|^\[[^\[]/;

	var prototype = Object.assign({
		create: function() {},

		reset: function() {},

		unbind: noop,

		destroy: function destroy() {
			return this
				.unbind()
				.remove()
				.trigger('destroy')
				.off();
		},

		remove: function() {
			while (this.length-- > 0) {
				Sparky.dom.remove(this[this.length]);
			}

			return this;
		},

		appendTo: function(node) {
			Sparky.dom.appendAll(node, this);
			return this;
		},

		slave: function(node, scope, ctrl) {
			return Sparky(node, scope, ctrl, undefined, this);
		}
	}, window.mixin.events, window.mixin.array);


	// Pure functions

	var slice  = Function.prototype.call.bind(Array.prototype.slice);
	var reduce = Function.prototype.call.bind(Array.prototype.reduce);

	function noop() {}
	function isDefined(val) { return val !== undefined && val !== null; }


	// Object helpers

	function copy(array1, array2) {
		Array.prototype.push.apply(array2, array1);
	}


	// Debug helpers

	function nodeToText(node) {
		return [
			'<',
			Sparky.dom.tag(node),
			//(node.className ? ' class="' + node.className + '"' : ''),
			//(node.getAttribute('href') ? ' href="' + node.getAttribute('href') + '"' : ''),
			(node.getAttribute('data-ctrl') ? ' data-ctrl="' + node.getAttribute('data-ctrl') + '"' : ''),
			(node.getAttribute('data-scope') ? ' data-scope="' + node.getAttribute('data-scope') + '"' : ''),
			(node.id ? ' id="' + node.id + '"' : ''),
			'>'
		].join('');
	}


	// Getting and setting

	function findByPath(obj, path) {
		if (!isDefined(obj) || !isDefined(path)) { return; }

		return path === '.' ?
			obj :
			Sparky.get(obj, path) ;
	}

	// Sparky - the meat and potatoes

	function slaveSparky(sparky1, sparky2) {
		function destroy() { sparky2.destroy(); }

		function ready() {
			sparky1.off('destroy', destroy);
			sparky1.on(sparky2);
		}

		// Delegate the new sparky to the old.
		sparky1
		.on('destroy', destroy)
		.on('ready', ready);

		return sparky2;
	}

	function setupCollection(node, model, ctrl, parent) {
		var modelName = node.getAttribute('data-scope');
		var endNode = document.createComment(' [Sparky] data-scope="' + modelName + '" ');
		var nodes = [];
		var sparkies = [];
		var cache = [];
		var inserted;
		// A pseudo-sparky that delegates events to all
		// sparkies in the collection.
		var sparky = Object.create(prototype);

		function updateNodes() {
			var n = -1;
			var l = cache.length;
			var map = {};
			var i, obj;

			if (Sparky.debug) { var t = +new Date(); }

			while (l--) {
				obj = cache[l];
				i = model.indexOf(obj);

				if (i === -1) {
					Sparky.dom.remove(nodes[l]);
					sparkies[l].destroy();
					sparky.off(sparkies[l]);
				}
				else if (nodes[l] && sparkies[l]) {
					map[i] = [nodes[l], sparkies[l]];
				}
			}

			l = model.length;

			nodes.length = l;
			sparkies.length = l;
			cache.length = l;

			while(++n < l) {
				cache[n] = model[n];

				if (map[n]) {
					nodes[n] = map[n][0];
					sparkies[n] = map[n][1];
				}
				else {
					nodes[n] = node.cloneNode(true);
					sparkies[n] = Sparky(nodes[n], model[n], ctrl, false, parent);
					sparky.on(sparkies[n]);
				}

				Sparky.dom.before(endNode, nodes[n]);

				if (document.body.contains(sparkies[n][0])) {
					sparkies[n].trigger('insert');
				}
			}

			if (Sparky.debug) {
				console.log('Sparky: collection rendered (length: ' + model.length + ' time: ' + (+new Date() - t) + 'ms)');
			}
		}

		// Put the marker node in place
		Sparky.dom.before(node, endNode);

		// Remove the node
		Sparky.dom.remove(node);

		// Remove anything that would make Sparky bind the node
		// again. This can happen when a collection is appended
		// by a controller without waiting for it's 'ready' event.
		node.removeAttribute('data-scope');
		node.removeAttribute('data-ctrl');

		var throttle = Sparky.Throttle(updateNodes);

		Sparky.observe(model, 'length', throttle);

		sparky.on('destroy', function destroy() {
			throttle.cancel();
			Sparky.unobserve(model, 'length', throttle);
		});

		return sparky;
	}

	function createChild(sparky, node, scope, model, path) {
		var data;

		// no data-scope
		if (!isDefined(path)) {
			// We know that model is not defined, and we don't want child
			// sparkies to loop unless explicitly told to do so, so stop
			// it from looping. TODO: clean up Sparky's looping behaviour.
			slaveSparky(sparky, Sparky(node, scope, undefined, false, sparky));
			return;
		}

		// data-scope="."
		if (path === '.') {
			slaveSparky(sparky, Sparky(node, model, undefined, undefined, sparky));
			return;
		}

		// data-scope=".path.to.data"
		if (rrelativepath.test(path)) {
			data = findByPath(model, path.replace(rrelativepath, ''));

			if (!data) {
				throw new Error('Sparky: No object at relative path \'' + path + '\' of model#' + model.id);
			}

			slaveSparky(sparky, Sparky(node, data, undefined, undefined, sparky));
			return;
		}

		// data-scope="{{path.to.data}}"
		Sparky.rtags.lastIndex = 0;
		if (Sparky.rtags.test(path)) {
			Sparky.rtags.lastIndex = 0;
			var path1 = Sparky.rtags.exec(path)[2];

			data = findByPath(scope, path1);

			var comment = document.createComment(' [Sparky] data-scope="' + path + '" ');
			var master = node.cloneNode(true);
			var childSparky;

			var setup = function(data) {
				if (childSparky) {
					childSparky.destroy();
				}

				if (!node) {
					node = master.cloneNode(true);
				}

				childSparky = Sparky(node, data, undefined, undefined, sparky);
				Sparky.dom.after(comment, node);
				Sparky.dom.remove(comment);
				slaveSparky(sparky, childSparky);
			};

			var teardown = function() {
				Sparky.dom.before(node, comment);
				Sparky.dom.remove(node);

				if (childSparky) {
					childSparky.destroy();
					childSparky = undefined;
					node = undefined;
				}
			};

			var update = function(data) {
				return data ? setup(data) : teardown() ;
			};

			Sparky.observePath(scope, path1, update);
			update(data);

			sparky.on('destroy', function destroy() {
				Sparky.unobservePath(scope, path1, update);
				teardown();
			});

			return;
		}

		slaveSparky(sparky, Sparky(node, findByPath(sparky.data, path), undefined, undefined, sparky));
	}

	function setupSparky(sparky, node, model, ctrl) {
		var templateId = node.getAttribute && node.getAttribute('data-template');
		var templateFragment = templateId && Sparky.template(templateId);
		var scope, timer;

		function insertTemplate(sparky, node, templateFragment) {
			// Wait until the scope is rendered on the next animation frame
			requestAnimationFrame(function() {
				Sparky.dom.empty(node);
				Sparky.dom.append(node, templateFragment);
				sparky.trigger('template', node);
			});
		}

		function insert() {
			insertTemplate(sparky, node, templateFragment);
			insertTemplate = noop;
		}

		function get(path) {
			return path === '.' ?
				scope :
				Sparky.get(scope, path) ;
		}

		function set(property, value) {
			Sparky.set(scope, property, value);
		}

		function create(node) {
			var path = node.getAttribute('data-scope');

			return createChild(sparky, node, scope, model, path);
		}

		function cancelTimer() {
			window.cancelAnimationFrame(timer);
		}

		if (node.nodeType === 11) {
			// node is a document fragment. Copy all it's children
			// onto sparky.
			copy(node.childNodes, sparky);
		}
		else {
			sparky[0] = node;
			sparky.length = 1;
		}

		// If a scope object is returned by the ctrl, we use that, otherwise
		// we use the model object as scope.
		scope = ctrl && ctrl.call(sparky, node, model);

		// A controller returning false is telling us not to do data binding.
		// TODO: this is in the wrong place. We still need to handle the
		// insert event.
		if (scope === false) { return; }

		scope = scope || model || {};

		if (Sparky.debug && templateId) { console.log('Sparky: template:', templateId); }

		function observe(property, fn) {
			Sparky.observePath(scope, property, fn);

			if (templateFragment) {
				Sparky.observePath(scope, property, insert);
			}
		}

		function unobserve(property, fn) {
			Sparky.unobservePath(scope, property, fn);
		}

		var inserted = document.body.contains(sparky[0]);

		// Gaurantee that insert handlers are only fired once.
		sparky.on('insert', offInsert);

		function poll() {
			// Is this node in the DOM ?
			if (document.body.contains(sparky[0])) {
				//console.log('ASYNC  DOM', sparky.length, sparky[0].nodeType, sparky[0]);
				sparky.trigger('insert');
			}
			else {
				//console.log('NOPE', sparky[0]);
				timer = window.requestAnimationFrame(poll);
			}
		}

		// If this template is not already in the DOM, poll it until it is. We
		// schedule the poll before binding in order that child sparkies that
		// result from binding will hear this 'insert' before their own.
		if (!inserted) {
			sparky.on('insert', cancelTimer);
			timer = window.requestAnimationFrame(poll);
		}

		sparky.bind(templateFragment || node, observe, unobserve, get, set, create, scope);
		sparky.trigger('ready');

		// If this sparky is in the DOM, send the insert event right away.
		if (inserted) { sparky.trigger('insert'); }
	}

	function offInsert() { this.off('insert'); }

	function makeDistributeCtrl(list) {
		return function distributeCtrl(node, model) {
			// Distributor controller
			var l = list.length;
			var n = -1;
			var scope = model;
			var result;

			// TODO: This is exposes solely so that ctrl
			// 'observe-selected' can function in sound.io.
			// Really naff. Find a better way.
			this.ctrls = list;

			while (++n < l) {
				// Call the list of ctrls, in order.
				result = list[n].call(this, node, scope);

				// Returning false interrupts the ctrl calls.
				if (result === false) { return; }

				// Returning an object sets that object to
				// be used as scope.
				if (result !== undefined) { scope = result; }
			}

			return scope;
		};
	}

	function makeDistributeCtrlFromPaths(paths, ctrls) {
		var list = [];
		var l = paths.length;
		var n = -1;
		var ctrl;

		while (++n < l) {
			ctrl = findByPath(ctrls, paths[n]);

			if (!ctrl) {
				throw new Error('Sparky: data-ctrl "' + paths[n] + '" not found in sparky.ctrl');
			}

			list.push(ctrl);
		}

		return makeDistributeCtrl(list);
	}

	function makeCtrl(string, ctrls) {
		if (!isDefined(string)) { return; }
		var paths = string.trim().split(Sparky.rspaces);
		return makeDistributeCtrlFromPaths(paths, ctrls);
	}

	function Sparky(node, model, ctrl) {
		if (Sparky.debug === 'verbose') {
			console.log('Sparky: Sparky(', typeof node === 'string' ? node : nodeToText(node), ',',
				(model && '{}'), ',',
				(ctrl && (ctrl.name || 'anonymous function')), ')'
			);
		}

		// Loop adn data are 'hidden' parameter, used internally.
		// Everything needs a clean-up. You should consider using
		// prototypal inheritance to make child sparkies children
		// of ther parents, instead of doing that for the separate
		// data object. But to do that, they can no longer be
		// collections. So the DOM collection bit of it would
		// need to be a property of sparky.
		var loop = arguments[3] !== false;
		var parent = arguments[4];
		var modelPath, ctrlPath, tag, id;

		// If node is a string, assume it is the id of a template,
		// and if it is not a template, assume it is the id of a
		// node in the DOM.
		if (typeof node === 'string') {
			id = node;
			node = Sparky.template(id);

			if (!node) {
				node = document.getElementById(id);
			}

			if (!node) {
				throw new Error('Sparky: Sparky() called but id of node not found: #' + id);
			}
		}

		if (!node) {
			throw new Error('Sparky: Sparky() called without node: ' + node);
		}

		// Where model is not defined look for the data-scope
		// attribute. Document fragments do not have a getAttribute
		// method.
		if (!isDefined(model) && node.getAttribute) {
			modelPath = node.getAttribute('data-scope');

			if (isDefined(modelPath)) {
				model = findByPath(Sparky.data, modelPath);

				if (Sparky.debug && !model) {
					console.log('Sparky: data-scope="' + modelPath + '" model not found in sparky.data. Path will be observed.' );
				}
			}
		}

		// The ctrl list can be...
		ctrl =
			// a space-separated string of ctrl paths
			typeof ctrl === 'string' ? makeCtrl(ctrl, parent.ctrl) :
			// a function
			typeof ctrl === 'function' ? makeDistributeCtrl([ctrl]) :
			// an array of functions
			typeof ctrl === 'object' ? makeDistributeCtrl(ctrl) :
			// defined in the data-ctrl attribute
			node.getAttribute && makeCtrl(node.getAttribute('data-ctrl'), parent ? parent.ctrl : Sparky.ctrl) ;

		// Where model is an array or array-like object with a length property,
		// but not a function, set up Sparky to clone node for every object in
		// the array.
		if (loop && model && typeof model.length === 'number' && typeof model !== 'function') {
			return setupCollection(node, model, ctrl, parent);
		}

		var sparky = Object.create(prototype);

		Object.defineProperties(sparky, {
			data: { value: Object.create(parent ? parent.data : Sparky.data), writable: true },
			ctrl: { value: Object.create(parent ? parent.ctrl : Sparky.ctrl) }
		});

		// Check if there should be a model, but it isn't available yet. If so,
		// observe the path to the model until it appears.
		if (modelPath && !model) {
			Sparky.observePathOnce(Sparky.data, modelPath, function(model) {
				setupSparky(sparky, node, model, ctrl);
			});
		}
		else {
			setupSparky(sparky, node, model, ctrl);
		}

		return sparky;
	}


	// Expose

	Sparky.debug    = false;
	Sparky.settings = {};
	Sparky.data     = {};
	Sparky.ctrl     = {};

	Sparky.template = function() {
		return Sparky.dom.fragmentFromTemplate.apply(this, arguments);
	};

	Sparky.extend = function() {
		console.warn('Sparky.extend() is deprecated. Use Object.assign().');
		console.warn('Object.assign polyfill: https://github.com/cruncher/object.assign');
		console.trace();
		return Object.assign.apply(this, arguments);
	};

	Sparky.svgNamespace = "http://www.w3.org/2000/svg";
	Sparky.xlink        = "http://www.w3.org/1999/xlink";
	Sparky.prototype    = prototype;

	window.Sparky = Sparky;
})(window);

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

	function append(parent, node) {
		parent.appendChild(node);
		return parent;
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

	assign(dom, {
		query:     query,
		tag:       tagName,
		append:    append,
		appendAll: all(append),
		after:     insertAfter,
		before:    insertBefore,
		empty:     empty,
		remove:    remove,
		closest:   closest,
		matches:   matches,  
		classes:   getClassList,
		style:     getStyle,
		getClass:  getClass,
		setClass:  setClass
	});


	// Templates

	var templates = {};

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

		if (node.content) {
			return fragmentFromContent(node);
		}
		else {
			// In browsers where templates are not inert, ids used inside them 
			// conflict with ids in any rendered result. To go some way to
			// tackling this, remove the node from the DOM.
			remove(node);
			return fragmentFromContent(node);
		}
	}

	function cloneTemplate(id) {
		var template = templates[id] || (templates[id] = getTemplate(id));
		return template && template.cloneNode(true);
	}

	assign(dom, {
		fragmentFromTemplate: cloneTemplate,
		fragmentFromContent: fragmentFromContent
	});


	// Events

	var events = {};
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
		var event = events[type] || (events[type] = createEvent(type));
		node.dispatchEvent(event);
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

(function(Sparky) {
	"use strict";

	// Handle paths

	var rpathtrimmer = /^\[|]$/g;
	var rpathsplitter = /\]?\.|\[/g;
	var map = [];

	function noop() {}
	function isDefined(val) { return val !== undefined && val !== null; }
	function isObject(obj) { return obj instanceof Object; }

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function objFrom(obj, array) {
		var key = array.shift();
		var val = obj[key];

		return array.length === 0 ? val :
			isDefined(val) ? objFrom(val, array) :
			val ;
	}

	function objTo(root, array, obj) {
		var key = array[0];
		
		return array.length > 1 ?
			objTo(isObject(root[key]) ? root[key] : (root[key] = {}), array.slice(1), obj) :
			(root[key] = obj) ;
	}

	function observePath3(root, prop, array, fn, notify) {
		function update() {
			if (Sparky.debug === 'verbose') {
				console.log('Sparky: path resolved. Value:', root[prop]);
			}

			fn(root[prop]);
		}

		if (notify) { update(); }

		Sparky.observe(root, prop, update);

		return function unobserve() {
			Sparky.unobserve(root, prop, update);
		};
	}

	function observePath2(root, prop, array, fn, notify) {
		var destroy = noop;

		function update() {
			var object = root[prop];

			destroy();

			if (typeof object !== 'object' && typeof object !== 'function') {
				destroy = noop;
				if (notify) { fn(); }
			}
			else {
				destroy = observePath1(object, array.slice(), fn, notify) ;
			}
		};

		Sparky.observe(root, prop, update);
		update();
		notify = true;

		return function unobserve() {
			destroy();
			Sparky.unobserve(root, prop, update);
		};
	}

	function observePath1(root, array, fn, notify) {
		if (array.length === 0) { return noop; }

		var prop = array.shift();

		return array.length === 0 ?
			observePath3(root, prop, array, fn, notify) :
			observePath2(root, prop, array, fn, notify) ;
	}

	function observePath(root, path, fn) {
		var array = splitPath(path);

		// Observe path without logs.
		var destroy = observePath1(root, array, fn, false) ;

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
		// not been returned yet. TODO: we should make direct returns
		// async to get around this - they would be async if they were
		// using Object.observe after all...
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
		var array = splitPath(path);
		
		return array.length === 1 ?
			obj[path] :
			objFrom(obj, array) ;
	}

	function setPath(root, path, obj) {
		var array = splitPath(path);

		return array.length === 1 ?
			(root[path] = obj) :
			objTo(root, array, obj);
	}

	Sparky.get = getPath;
	Sparky.set = setPath;
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

	(false && Object.observe && window.WeakMap ? function(Sparky) {
		if (Sparky.debug) { console.log('Sparky: Ooo. Lucky you, using Object.observe and WeakMap.'); }

		var map = new WeakMap();
		var names = [];
		var types = ["add", "update", "delete"];

		function call(fn) {
			fn(this);
		}

		function trigger(change) {
			var properties = this;
			var name = change.name;
			var object = change.object;

			// If this property is in the properties being watched, and we
			// have not already called changes on it, do that now.
			if (properties[name] && names.indexOf(name) === -1) {
				names.push(name);
				fns = properties[name];
				fns.forEach(call, object);
			}
		}

		function triggerAll(changes) {
			names.length = 0;
			changes.forEach(trigger, map[object]);
		}

		function setup(object) {
			var properties = map[object] = {};
			Object.observe(object, triggerAll, types);
			return properties;
		}

		function teardown(object) {
			Object.unobserve(object, triggerAll);
		}

		Sparky.observe = function(object, property, fn) {
			var properties = map[object] || setup(object);
			var fns = properties[property] || (properties[property] = []);
			fns.push(fn);
		};

		Sparky.unobserve = function(object, property, fn) {
			if (!map[object]) { return; }

			var properties = map[object];
			var fns = properties[property];

			if (!fns) { return; }

			var n = fns.length;

			while (n--) { fns.splice(n, 1); }

			if (fns.length === 0) {
				delete properties[property];

				if (Object.keys[properties].length === 0) {
					teardown(object);
				}
			}
		};
	} : function(Sparky) {
		Sparky.observe = function(object, property, fn) {
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

			return observe(object, property, fn);
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
	})(Sparky)
})(Sparky);


// Sparky.Throttle(fn)

(function() {
	"use strict";

	function noop() {}

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
		update();

		return throttle;
	}

	Sparky.Throttle = Throttle;
})(Sparky);


// Sparky.bind
//
// Binds data to the DOM. Changes in data are then immediately rendered
// in the nodes that display that data via template tags such as {{ name }}.
// Only those nodes containing the changed data are updated, other nodes are
// left alone. The actual DOM tree does not change. Template tags can also
// be used in the attributes href, title, id, class, style and value.
//
// dataBind(node, observeFn, unobserveFn, getFn)
//
// node
//
// A DOM node to use as a route. The inner DOM tree is traversed and references
// to property names written as {{ name }} cause bindFn to be called with name
// as property.
//
// bindFn(property, fn)
//
// Responsible for listening to changes to properties on a data object or model.
// When the named property changes, function fn must be called.
//
// getFn(property)
//
// Responsible for returning the value of the named property from a data object
// or model.


(function(Sparky) {
	"use strict";

	var assign = Object.assign;

	var dom = Sparky.dom;

	var attributes = [
		'href',
		'title',
		'id',
		'style',
		'src',
		'alt'
	];

	// Matches a sparky template tag, capturing (tag name, filter string)
	var rtags   = /(\{{2,3})\s*([\w\-\.\[\]]+)\s*(?:\|([^\}]+))?\s*\}{2,3}/g;

	// Matches tags plus any directly adjacent text
	var rclasstags = /[^\s]*\{{2,3}[^\}]+\}{2,3}[^\s]*/g;

	// Matches filter string, capturing (filter name, filter parameter string)
	var rfilter = /\s*([a-zA-Z0-9_\-]+)\s*(?:\:(.+))?/;

	// Matches anything with a space
	var rspaces = /\s+/;

	// Matches anything that contains a non-space character
	var rtext = /\S/;

	// Matches the arguments list in the result of a fn.toString()
	var rarguments = /function(?:\s+\w+)?\s*(\([\w\,\s]*\))/;

	var filterCache = {};

	var binders = {
	    	1: domNode,
	    	3: textNode,
	    	11: fragmentNode
	    };

	var empty = [];

	var changeEvent = new CustomEvent('valuechange', { bubbles: true });

	// Utility functions

	var slice = Function.prototype.call.bind(Array.prototype.slice);

	function noop() {}

	function returnThis() { return this; }

	function call(fn) { fn(); }

	function isDefined(n) {
		return !!n || n !== undefined && n !== null && !Number.isNaN(n);
	}

	function classOf(object) {
		return (/\[object\s(\w+)\]/.exec(Object.prototype.toString.apply(object)) || [])[1];
	}

	// Nodes that require special bindings
	var tags = {
	    	label: function(node, bind, unbind, get, set, create, unobservers, scope) {
	    		bindAttribute(node, 'for', bind, unbind, get, unobservers);
	    		bindNodes(node, bind, unbind, get, set, create, unobservers, scope);
	    	},

	    	input: function(node, bind, unbind, get, set, create, unobservers, scope) {
	    		var type = node.type;

	    		bindAttribute(node, 'value', bind, unbind, get, unobservers);
	    		bindAttribute(node, 'min', bind, unbind, get, unobservers);
	    		bindAttribute(node, 'max', bind, unbind, get, unobservers);

	    		var unbind = type === 'number' || type === 'range' ?
	    		    	// Only let numbers set the value of number and range inputs
	    		    	Sparky.bindNamedValueToObject(node, scope, numberToString, stringToNumber) :
	    		    // Checkboxes default to value "on" when the value attribute
	    		    // is not given. Make them behave as booleans.
	    		    type === 'checkbox' && !isDefined(node.getAttribute('value')) ?
	    		    	Sparky.bindNamedValueToObject(node, scope, booleanToStringOn, stringOnToBoolean) :
	    		    	// Only let strings set the value of other inputs
	    		    	Sparky.bindNamedValueToObject(node, scope, returnArg, returnArg) ;

	    		if (unbind) { unobservers.push(unbind); }
	    	},

	    	select: function(node, bind, unbind, get, set, create, unobservers, scope) {
	    		bindAttribute(node, 'value', bind, unbind, get, unobservers);
	    		bindNodes(node, bind, unbind, get, set, create, unobservers, scope);

	    		// Only let strings set the value of selects
	    		var unbind = Sparky.bindNamedValueToObject(node, scope, returnArg, returnArg);
	    		if (unbind) { unobservers.push(unbind); }
	    	},

	    	option: function(node, bind, unbind, get, set, create, unobservers, scope) {
	    		bindAttribute(node, 'value', bind, unbind, get, unobservers);
	    		bindNodes(node, bind, unbind, get, set, create, unobservers, scope);
	    	},

	    	textarea: function(node, bind, unbind, get, set, create, unobservers, scope) {
	    		// Only let strings set the value of a textarea
	    		var unbind = Sparky.bindNamedValueToObject(node, scope, returnArg, returnArg);
	    		if (unbind) { unobservers.push(unbind); }
	    	},

	    	time: function(node, bind, unbind, get, set, create, unobservers, scope)  {
	    		bindAttributes(node, bind, unbind, get, unobservers, ['datetime']);
	    		bindNodes(node, bind, unbind, get, set, create, unobservers, scope);
	    	},

	    	path: function(node, bind, unbind, get, set, create, unobservers) {
	    		bindAttributes(node, bind, unbind, get, unobservers, ['d']);
	    	}
	    };

	function domNode(node, bind, unbind, get, set, create, scope) {
		var unobservers = [];
		var tag = node.tagName.toLowerCase();

		if (Sparky.debug === 'verbose') { console.group('Sparky: dom node: ', node); }

		bindClasses(node, bind, unbind, get, unobservers);
		bindAttributes(node, bind, unbind, get, unobservers, attributes);

		// Set up special binding for certain elements like form inputs
		if (tags[tag]) {
			tags[tag](node, bind, unbind, get, set, create, unobservers, scope);
		}

		// Or sparkify the child nodes
		else {
			bindNodes(node, bind, unbind, get, set, create, unobservers, scope);
		}

		if (Sparky.debug === 'verbose') { console.groupEnd(); }

		return unobservers;
	}

	function textNode(node, bind, unbind, get, set, create) {
		var unobservers = [];

		if (Sparky.debug === 'verbose') { console.group('Sparky: text node:', node); }

		observeProperties(node.nodeValue, bind, unbind, get, function(text) {
			node.nodeValue = text;
		}, unobservers);

		if (Sparky.debug === 'verbose') { console.groupEnd(); }

		return unobservers;
	}

	function fragmentNode(node, bind, unbind, get, set, create, scope) {
		var unobservers = [];

		if (Sparky.debug === 'verbose') { console.group('Sparky: fragment: ', node); }

		bindNodes(node, bind, unbind, get, set, create, unobservers, scope);

		if (Sparky.debug === 'verbose') { console.groupEnd(); }

		return unobservers;
	}

	function bindNodes(node, bind, unbind, get, set, create, unobservers, scope) {
		if (node.childNodes.length === 0) { return; }

		// childNodes is a live list, and we don't want it to be because we may
		// be about to modify the DOM. Copy it.
		var nodes = slice(node.childNodes);
		var n = -1;
		var l = nodes.length;
		var child, sparky, unbind;

		// Loop forwards through the children
		while (++n < l) {
			child = nodes[n];

			// Don't bind child nodes that have their own Sparky controllers.
			if (child.getAttribute &&
			   (isDefined(child.getAttribute('data-ctrl')) ||
			    isDefined(child.getAttribute('data-scope')))) {
				create(child);
				//sparky = create(child);
				//unobservers.push(sparky.destroy.bind(sparky));
			}
			else if (binders[child.nodeType]) {
				unobservers.push.apply(unobservers, binders[child.nodeType](child, bind, unbind, get, set, create, scope));
			}
		}
	}

	function setAttributeSVG(node, attribute, value) {
		if (attribute = 'd') {
			node.setAttribute(attribute, value);
		}
		else {
			node.setAttributeNS(Sparky.xlink, attribute, value);
		}
	}

	function setAttributeHTML(node, attribute, value) {
		node.setAttribute(attribute, value);
	}

	function addClasses(classList, text) {
		var classes = text.trim().split(rspaces);
		classList.add.apply(classList, classes);
	}

	function removeClasses(classList, text) {
		var classes = text.trim().split(rspaces);
		classList.remove.apply(classList, classes);
	}

	function bindClasses(node, bind, unbind, get, unobservers) {
		var classes = dom.getClass(node);

		// If there are no classes, go no further
		if (!classes) { return; }

		// Remove tags and store them
		Sparky.rclasstags.lastIndex = 0;
		var tags = [];
		var text = classes.replace(Sparky.rclasstags, function($0) {
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
		var value = alias ? alias : isSVG ?
		    	node.getAttributeNS(Sparky.xlink, attribute) || node.getAttribute(attribute) :
		    	node.getAttribute(attribute) ;

		if (!value) { return; }
		if (alias) { node.removeAttribute('data-' + attribute); }
		if (Sparky.debug === 'verbose') { console.log('Sparky: checking ' + attribute + '="' + value + '"'); }

		var update = isSVG ?
		    	setAttributeSVG.bind(this, node, attribute) :
		    	setAttributeHTML.bind(this, node, attribute) ;

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
			update();
		}
	}

	function observeProperties2(bind, unbind, update, properties) {
		// Start throttling changes. The first update is immediate.
		var throttle = Sparky.Throttle(update);

		// Observe properties that are to be live updated
		properties.forEach(function attach(property) {
			bind(property, throttle);
		});

		// Return a function that destroys live bindings
		return function destroyBinding() {
			properties.forEach(function detach(property) {
				// Unobserve properties
				unbind(property, throttle);
			});

			// Cancel already bound updates. If updates are queued,
			// the throttle applies them before bowing out.
			throttle.cancel();
		};
	}

	function bind(node, observe, unobserve, get, set, create, scope) {
		// Assume this is a DOM node, and set the binder off. The
		// binder returns a function that destroys the bindings.
		var unobservers = binders[node.nodeType](node, observe, unobserve, get, set, create, scope);

		if (Sparky.debug && unobservers.length === 0) {
			console.log('Sparky: No Sparky tags found in', node);
		}

		this.unbind = function unbind() {
			unobservers.forEach(call);
			return this;
		};

		return this;
	}

	assign(Sparky, {
		attributes: attributes,

		// Todo: We expose these regexes so we can change tag delimiters. Find
		// a better way to declare just the tag delimiters without exposing
		// these regexes.
		rtags: rtags,
		rspaces: rspaces,
		rclasstags: rclasstags
	});

	assign(Sparky.prototype, {
		bind: bind,
		unbind: returnThis
	});


	// -------------------------------------------------------------------

	// 2-way binding for form elements.
	// HTML form elements are hard to handle. They do all sorts of strange
	// things such as radios and checkboxes having a default value of 'on'
	// where a value attribute is not given. This set of functions handles
	// 2-way binding between a node and an object.

	function dispatchInputChangeEvent(node) {
		// FireFox won't dispatch any events on disabled inputs so we need to do
		// a little dance, enabling it quickly, sending the event and disabling
		// it again.
		if (!dom.features.inputEventsOnDisabled && node.disabled) {
			node.disabled = false;

			// We have to wait, though. It's not clear why. This makes it async,
			// but let's not worry too much about that.
			setTimeout(function() {
				node.dispatchEvent(changeEvent);
				node.disabled = true;
			}, 0);
		}
		else {
			node.dispatchEvent(changeEvent);
		}
	}

	function makeUpdateInput(node, model, path, fn) {
		var type = node.type;

		return type === 'radio' || type === 'checkbox' ?
			function updateChecked() {
				var value = fn(Sparky.get(model, path));
				var checked = node.value === value;

				// Don't set checked state if it already has that state, and
				// certainly don't simulate a change event.
				if (node.checked === checked) { return; }

				node.checked = checked;

				dispatchInputChangeEvent(node);
			} :
			function updateValue() {
				var value = fn(Sparky.get(model, path));

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

	function makeChangeListener(node, model, path, fn) {
		var type = node.type;

		return type === 'radio' ? function radioChange(e) {
				if (node.checked) {
					Sparky.set(model, path, fn(node.value));
				}
			} :
			type === 'checkbox' ? function checkboxChange(e) {
				Sparky.set(model, path, fn(node.checked ? node.value : undefined));
			} :
			function valueChange(e) {
				Sparky.set(model, path, fn(node.value));
			} ;
	}

	function bindPathToValue(node, model, path, to, from) {
		var nodeValue = node.getAttribute('value');
		var update = makeUpdateInput(node, model, path, to);
		var change = makeChangeListener(node, model, path, from);
		var throttle;

		node.addEventListener('change', change);
		node.addEventListener('input', change);

		// Wait for animation frame to let Sparky fill in tags in value, min
		// and max before controlling. TODO: I'm not sure about this. I'd like
		// to update the model immediately if possible, and start throttle on
		// the animation frame.

		var request = window.requestAnimationFrame(function() {
			request = false;

			// Where the model does not have value, set it from the node value.
			if (!isDefined(Sparky.get(model, path))) {
				change();
			}

			throttle = Sparky.Throttle(update);
			Sparky.observePath(model, path, throttle);
		});

		return function unbind() {
			node.removeEventListener('change', change);
			node.removeEventListener('input', change);

			if (request) {
				window.cancelAnimationFrame(request);
			}
			else {
				throttle.cancel();
				Sparky.unobservePath(model, path, throttle);
			}
		};
	}

	function bindNamedValueToObject(node, model, to, from) {
		var name = node.name;

		if (!node.name) {
			console.warn('Sparky: Cannot bind value of node with empty name.', node);
			return;
		}

		Sparky.rtags.lastIndex = 0;
		var tag = (Sparky.rtags.exec(name) || empty);
		var path = tag[2];

		if (!path) { return; }

		if (tag[3]) {
			console.warn('Sparky: Sparky tags in name attributes do not accept filters. Ignoring name="' + name + '".');
			return;
		}

		// Take the tag parentheses away from the name, preventing this node
		// from being name-value bound by any other controllers.
		node.name = name.replace(Sparky.rtags, path);

		return bindPathToValue(node, model, path, to, from);
	}



	// Controllers

	function returnArg(arg) { return arg; }

	function toString(value) { return '' + value; }

	function stringToNumber(value) {
		// coerse to number
		var n = parseFloat(value);
		return Number.isNaN(n) ? undefined :
			n ;
	}

	function stringToInteger(value) {
		// coerse to number
		var n = parseFloat(value);
		return Number.isNaN(n) ? undefined :
			Math.round(n) ;
	}

	function stringToBoolean(value) {
		return value === 'false' ? false :
			value === '0' ? false :
			value === '' ? false :
			!!value ;
	}

	function stringToBooleanInverted(value) {
		return !stringToBoolean(value);
	}

	function stringOnToBoolean(value) {
		return value === 'on' ;
	}

	function stringOnToBooleanInverted(value) {
		return value !== 'on';
	}

	function definedToString(value) {
		return isDefined(value) ? value + '' :
			undefined ;
	}

	function numberToString(value) {
		return typeof value === 'number' ? value + '' :
			undefined ;
	}

	function integerToString(value) {
		return typeof value === 'number' && value % 1 === 0 ? value + '' :
			undefined ;
	}

	function booleanToString(value) {
		return typeof value === 'boolean' ? value + '' :
			typeof value === 'number' ? !!value + '' :
			undefined ;
	}

	function booleanToStringInverted(value) {
		return typeof value === 'boolean' ? !value + '' :
			typeof value === 'number' ? !value + '' :
			undefined ;
	}

	function booleanToStringOn(value) {
		return typeof value === 'boolean' || typeof value === 'number' ?
			value ? 'on' : '' :
			undefined ;
	}

	function booleanToStringOnInverted(value) {
		return typeof value === 'boolean' || typeof value === 'number' ?
			value ? '' : 'on' :
			undefined ;
	}

	function valueAnyCtrl(node, model) {
		// Coerce any defined value to string so that any values pass the type checker
		var unbind = Sparky.bindNamedValueToObject(node, model, definedToString, returnArg);
		if (unbind) { this.on('destroy', unbind); }
	}

	function valueStringCtrl(node, model) {
		// Don't coerce so that only strings pass the type checker
		var unbind = Sparky.bindNamedValueToObject(node, model, returnArg, returnArg);
		if (unbind) { this.on('destroy', unbind); }
	}

	function valueNumberCtrl(node, model) {
		var unbind = Sparky.bindNamedValueToObject(node, model, numberToString, stringToNumber);
		if (unbind) { this.on('destroy', unbind); }
	}

	function valueIntegerCtrl(node, model) {
		var unbind = Sparky.bindNamedValueToObject(node, model, numberToString, stringToInteger);
		if (unbind) { this.on('destroy', unbind); }
	}

	function valueBooleanCtrl(node, model) {
		var type = node.type;
		var unbind = type === 'checkbox' && !isDefined(node.getAttribute('value')) ?
		    	Sparky.bindNamedValueToObject(node, model, booleanToStringOn, stringOnToBoolean) :
		    	Sparky.bindNamedValueToObject(node, model, booleanToString, stringToBoolean) ;
		if (unbind) { this.on('destroy', unbind); }
	}

	function valueBooleanInvertCtrl(node, model) {
		var type = node.type;
		var unbind = type === 'checkbox' && !isDefined(node.getAttribute('value')) ?
		    	Sparky.bindNamedValueToObject(node, model, booleanToStringOnInverted, stringOnToBooleanInverted) :
		    	Sparky.bindNamedValueToObject(node, model, booleanToStringInverted, stringToBooleanInverted);
		if (unbind) { this.on('destroy', unbind); }
	}

	function valueNumberInvertCtrl(node, model) {
		var min = node.min ? parseFloat(node.min) : (node.min = 0) ;
		var max = mode.max ? parseFloat(node.max) : (node.max = 1) ;

		var unbind = Sparky.bindNamedValueToObject(node, model, function to(value) {
			return typeof value !== 'number' ? '' : ('' + ((max - value) + min));
		}, function from(value) {
			var n = parseFloat(value);
			return Number.isNaN(n) ? undefined : ((max - value) + min) ;
		});

		if (unbind) { this.on('destroy', unbind); }
	};


	assign(Sparky.ctrl, {
		'value-any':            valueAnyCtrl,
		'value-string':         valueStringCtrl,

		'value-number':         function(argument) {
			console.warn('Sparky: value-number controller is renamed to value-float (or value-int).');
			return valueNumberCtrl.apply(this, arguments);
		},

		'value-number-invert':         function(argument) {
			console.warn('Sparky: value-number-invert controller is renamed to value-float-invert (or value-int-invert).');
			return valueNumberInvertCtrl.apply(this, arguments);
		},

		'value-float':          valueNumberCtrl,
		'value-int':            valueIntegerCtrl,
		'value-number-invert':  valueNumberInvertCtrl,
		'value-boolean':        valueBooleanCtrl,
		'value-boolean-invert': valueBooleanInvertCtrl
	});

	Sparky.bindNamedValueToObject = bindNamedValueToObject;
})(Sparky);


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

	Sparky.ctrl['value-int-log'] = function(node, model) {
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

	Sparky.ctrl['log'] = function(node, scope) {
		console.group('Sparky.ctrl.log:');
		console.log('node:  ', node);
		console.log('scope: ', scope);
		console.log('data:  ', this.data);
		console.log('ctrl:  ', this.ctrl);
		console.log('sparky:', this);
		console.groupEnd();
	};

	Sparky.ctrl['log-events'] = function(node, model) {
		var ready = 0;
		var insert = 0;
		var destroy = 0;

		this
		.on('ready', function() {
			console.log('Sparky.ctrl.log-events: READY  ', ready++, node);
		})
		.on('insert', function() {
			console.log('Sparky.ctrl.log-events: INSERT ', insert++, node);
		})
		.on('destroy', function() {
			console.log('Sparky.ctrl.log-events: DESTROY', destroy++, node);
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

	var dom = Sparky.dom;

	Sparky.ctrl['x-scroll-slave'] = function(node, scope) {
		var name = node.getAttribute('data-x-scroll-master');
		var master;

		function update() {
			node.scrollLeft = master.scrollLeft;
		}

		this
		.on('insert', function() {
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

	Sparky.ctrl['y-scroll-slave'] = function(node, scope) {
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

	Sparky.ctrl["x-scroll-center"] = function(node) {
		// Center the scroll position horizontally
		this.on('insert', function() {
			var w = node.clientWidth;
			var s = node.scrollWidth;
			node.scrollLeft = (s - w) / 2;
		});
	};

	Sparky.ctrl["y-scroll-center"] = function(node) {
		// Center the scroll position vertically
		this.on('insert', function() {
			var h = node.clientHeight;
			var s = node.scrollHeight;
			node.scrollTop = (s - h) / 2;
		});
	};
})();


(function() {
	"use strict";

	var assign = Object.assign;

	function stringToNumber(value) {
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

	assign(Sparky.ctrl, {
		"value-number-decimals-0": function(node, model) {
			var unbind = Sparky.bindNamedValueToObject(node, model, numberRound0ToString, stringToNumber);
			if (unbind) { this.on('destroy', unbind); }
		},

		"value-number-decimals-1": function(node, model) {
			var unbind = Sparky.bindNamedValueToObject(node, model, numberRound1ToString, stringToNumber);
			if (unbind) { this.on('destroy', unbind); }
		},

		"value-number-decimals-2": function(node, model) {
			var unbind = Sparky.bindNamedValueToObject(node, model, numberRound2ToString, stringToNumber);
			if (unbind) { this.on('destroy', unbind); }
		},

		"value-number-decimals-3": function(node, model) {
			var unbind = Sparky.bindNamedValueToObject(node, model, numberRound3ToString, stringToNumber);
			if (unbind) { this.on('destroy', unbind); }
		}
	});
})();


(function(window) {
	"use strict";

	var assign = Object.assign;
	var Sparky = window.Sparky;
	var dom = Sparky.dom;

	assign(Sparky.ctrl, {
		"on-ready-unhide": function onReadyUnhide(node, model) {
			this.on('ready', function() {
				dom.classes(this[0]).remove('hidden');
			});
		}
	});
})(this);


// Sparky.filters

(function(Sparky) {
	"use strict";

	var settings = (Sparky.settings = Sparky.settings || {});

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

	function isDefined(val) {
		return !!val || val !== undefined && val !== null && !Number.isNaN(val);
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
			var text = document.createTextNode(this);

			pre.appendChild(text);

			return function(value) {
				text.textContent = value;
				return pre.innerHTML;
			};
		})(),

		equals: function(value, val, string1, string2) {
			return (value === val ? string1 : string2) || '';
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
			return value[name];
		},

		"greater-than": function(value1, value2, str1, str2) {
			return value1 > value2 ? str1 : str2 ;
		},

		invert: function(value) {
			return 1 / value;
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

		//pprint

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

		postpad: function(value, n) {
			var string = isDefined(value) ? value.toString() : '' ;
			var l = string.length;
			var m = parseInt(n, 10);

			return m === l ? value :
				m > l ? string + spaces(m - l) :
				string.substring(0, m) ;
		},

		random: function(value) {
			return value[Math.floor(Math.random() * value.length)];
		},

		//raw
		//removetags

		replace: function(value, str1, str2) {
			if (typeof value !== 'string') { return; }
			return value.replace(RegExp(str1, 'g'), str2);
		},

		round: function(value) {
			if (typeof value !== 'number') { return; }
			return Math.round(value);
		},

		//reverse

		safe: function(string) {
			if (typeof string !== string) { return; }
			// Actually, we can't do this here, because we cant return DOM nodes
			return;
		},

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

		striptagsexcept: (function() {
			var rtag = /<(\/)?(\w*)(?:[^>'"]|"[^"]*"|'[^']*')*>/g,
			    allowedTags, result;

			function strip($0, $1, $2) {
				// Strip any attributes, letting the allowed tag name through.
				return $2 && allowedTags.indexOf($2) !== -1 ?
					'<' + ($1 || '') + $2 + '>' :
					'' ;
			}

			return function(value, tags) {
				if (!tags) {
					return value.replace(rtag, '');
				}

				allowedTags = tags.split(' ');
				result = value.replace(rtag, strip);
				allowedTags = false;

				return result;
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
				value.length.slice(0, n) + '&hellips;' :
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
})(window.Sparky || require('sparky'));


// Sparky ready
//
// If jQuery is present and when the DOM is ready, traverse it looking for
// data-scope and data-ctrl attributes and use them to instantiate Sparky.

(function(jQuery, Sparky) {
	if (!jQuery) { return; }

	var dom = Sparky.dom;
	var doc = jQuery(document);

	function isInTemplate(node) {
		if (node.tagName.toLowerCase() === 'template') { return true; }
		if (node === document.documentElement) { return false; }
		return isInTemplate(node.parentNode);
	}

	doc.ready(function docReady(){
		var start;

		if (window.console) { start = Date.now(); }

		var nodes = document.querySelectorAll('[data-ctrl], [data-scope]');
		var n = -1;
		var l = nodes.length;
		var node;
		var array = [];
		var modelPath;

		// Remove child sparkies
		while (++n < l) {
			node = nodes[n];
			array.push(node);
			while (++n < l && node.contains(nodes[n])) {
				// But do add children that have absolute model paths.

				modelPath = nodes[n].getAttribute('data-scope');

				if (modelPath !== undefined && !/\{\{/.test(modelPath)) {
					//array.push(nodes[n]);
				}
			}
			--n;
		}

		// Normally <template>s are inert, but if they are not a supported
		// feature their content is part of the DOM so we have to remove those,
		// too.
		if (!dom.features.template) {
			n = array.length;

			while (n--) {
				if (isInTemplate(array[n])) {
					array.splice(n, 1);
				}
			}
		}

		if (Sparky.debug) { console.log('Sparky: DOM nodes to initialise:', array); }

		array.forEach(function(node) {
			Sparky(node);
		});

		window.requestAnimationFrame(function sparkyready() {
			doc.trigger('sparkyready');
		});

		if (window.console) { console.log('Sparky: DOM initialised in ' + (Date.now() - start) + 'ms'); }
	});
})(jQuery, Sparky);

(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('_________________________________');
})(this);


// Make the minifier remove debug code paths
Sparky.debug = false;