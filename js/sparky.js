
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
			var currTime = new Date().getTime();
			var lastTime = frameDuration * (currTime % frameDuration);
			var id = window.setTimeout(function() { callback(lastTime + frameDuration); }, lastTime + frameDuration - currTime);
			return id;
		};
	}

	if (!window.cancelAnimationFrame) {
		window.cancelAnimationFrame = function(id) {
			clearTimeout(id);
		};
	}
})(window);


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


// mixin.array

(function(ns, undefined) {
	"use strict";

	var mixin = ns.mixin || (ns.mixin = {});

	mixin.array = {
		filter:  Array.prototype.filter,
		map:     Array.prototype.map,
		reduce:  Array.prototype.reduce,
		pop:     Array.prototype.pop,
		push:    Array.prototype.push,
		concat:  Array.prototype.concat,
		sort:    Array.prototype.sort,
		slice:   Array.prototype.slice,
		splice:  Array.prototype.splice,
		some:    Array.prototype.some,
		indexOf: Array.prototype.indexOf,
		forEach: Array.prototype.forEach,
		each: function each() {
			Array.prototype.forEach.apply(this, arguments);
			return this;
		}
	};
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

	function getDependents(object) {
		if (!object.dependents) {
			Object.defineProperty(object, 'dependents', {
				value: []
			});
		}

		return object.dependents;
	}

	function setupPropagation(object1, object2) {
		var dependents = getDependents(object1);

		// Make sure dependents stays unique
		if (dependents.indexOf(object2) === -1) {
			dependents.push(object2);
		}
	}

	function teardownPropagation(object1, object2) {
		var dependents = getDependents(object1);

		if (object2 === undefined) {
			dependents.length = 0;
			return;
		}

		var i = dependents.indexOf(object2);

		if (i === -1) { return; }

		dependents.splice(i, 1);
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

			if (!fn) { throw new Error('Sparky: calling .on(' + types + ', fn) but fn is ' + typeof fn); }

			var events = getListeners(this);
			var type, item;

			if (typeof types === 'string') {
				types = types.split(/\s+/);
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
			var type, calls, list, i, listeners;

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
				types = types.split(/\s+/);
			}
			else {
				// .off(fn)
				fn = types;
				types = Object.keys(this.listeners);
			}

			while (type = types.shift()) {
				listeners = this.listeners[type];

				if (!listeners) {
					continue;
				}

				if (!fn) {
					this.listeners[type].length = 0;
					delete this.listeners[type];
					continue;
				}

				listeners.forEach(function(v, i) {
					if (v[0] === fn) {
						listeners.splice(i, i+1);
					}
				});
			}

			return this;
		},

		trigger: function(e) {
			var type, target, listeners, i, l, args, params;

			if (typeof e === 'string') {
				type = e;
				target = this;
			}
			else {
				type = e.type;
				target = e.target;
			}

			var events = getListeners(this);

			args = slice(arguments);

			// Copy dependents if they exist. We may be about to
			// mutate the dependents list.
			var dependents = this.dependents && this.dependents.slice();

			if (events[type]) {
				// Use a copy of the event list in case it gets mutated while
				// we're triggering the callbacks.
				listeners = events[type].slice();
				i = -1;
				l = listeners.length;
				args[0] = target;

				while (++i < l) {
					params = args.concat(listeners[i][1]);
					listeners[i][0].apply(this, params);
				}
			}

			if (!dependents) { return this; }

			i = -1;
			l = dependents.length;

			if (typeof e === 'string') {
				// Prepare the event object. It's ok to reuse a single object,
				// as trigger calls are synchronous, and the object is internal,
				// so it does not get exposed.
				args[0] = eventObject;
				eventObject.type = type;
				eventObject.target = target;
			}

			while (++i < l) {
				dependents[i].trigger.apply(dependents[i], args);
			}

			// Return this for chaining
			return this;
		}
	};
})(this);


// observe(obj, [prop], fn)
// unobserve(obj, [prop], [fn])
// 
// Observes object properties for changes by redefining
// properties of the observable object with setters that
// fire a callback function whenever the property changes.

(function(ns){
	var slice = Array.prototype.slice,
	    toString = Object.prototype.toString;
	
	function isFunction(obj) {
		toString.call(obj) === '[object Function]';
	}
	
	function call(array) {
		// Call observer with stored arguments
		array[0].apply(null, array[1]);
	}
	
	function replaceProperty(obj, prop, desc, observer, call) {
		var v = obj[prop],
		    observers = [observer],
		    descriptor = {
		    	enumerable: desc ? desc.enumerable : true,
		    	configurable: false,

		    	get: desc && desc.get ? desc.get : function() {
		    		return v;
		    	},

		    	set: desc && desc.set ? function(u) {
		    		desc.set.call(this, u);
		    		observers.forEach(call);
		    	} : function(u) {
		    		if (u === v) { return; }
		    		v = u;
		    		observers.forEach(call);
		    	}
		    };

		// Store the observers so that future observers can be added.
		descriptor.set.observers = observers;

		Object.defineProperty(obj, prop, descriptor);
	}
	
	function observeProperty(obj, prop, fn) {
		var desc = Object.getOwnPropertyDescriptor(obj, prop),
		    args = slice.call(arguments, 0),
		    observer = [fn, args];
		
		// Cut both prop and fn out of the args list
		args.splice(1,2);
		
		// If an observers list is already defined, this property is
		// already being observed, and all we have to do is add our
		// fn to the queue.
		if (desc) {
			if (desc.set && desc.set.observers) {
				desc.set.observers.push(observer);
				return;
			}
			
			if (desc.configurable === false) {
				console.warn('Property \"' + prop + '\" is not observable: configurable === false. Ignoring.');
				return;
			}
		}

		replaceProperty(obj, prop, desc, observer, call);
	}
	
	function observe(obj, prop, fn) {
		var args, key;
		
		// Overload observe to handle observing all properties with
		// the function signature observe(obj, fn).
		if (toString.call(prop) === '[object Function]') {
			fn = prop;
			args = slice.call(arguments, 0);
			args.splice(1, 0, null);
			
			for (prop in obj) {
				args[1] = prop;
				observeProperty.apply(null, args);
			};
			
			return;
		}

		observeProperty.apply(null, arguments);
	}
	
	function unobserve(obj, prop, fn) {
		var desc, observers, index;

		if (prop instanceof Function) {
			fn = prop;
			
			for (prop in obj) {
				unobserve(data, key, fn);
			};
			
			return;
		}
		
		desc = Object.getOwnPropertyDescriptor(obj, prop);
		observers = desc.set && desc.set.observers;

		if (!observers) { return; }
		
		if (fn) {
			// Remove all references to fn
			observers.forEach(function(observer, i, observers) {
				if (observer[0] === fn) {
					observers.splice(i, 1);
				}
			});
		}
		else {
			desc.set.observers.length = 0;
		}
	}

	ns.observe = observe;
	ns.unobserve = unobserve;
})(window);


// Collection()

(function(ns, mixin, undefined) {
	"use strict";

	var debug = false;

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	// Map functions

	function returnArg(arg) {
		return arg;
	}

	// Each functions

	function setValue(value, i) {
		this[i] = value;
	}

	function setListeners(data, i) {
		if (!sub.on) { return; }

		//sub
		//.on('change', this.trigger)
		//.on('destroy', this.remove);
	}

	// Sort functions

	function byGreater(a, b) {
		return a > b ? 1 : -1 ;
	}

	function byId(a, b) {
		return a.id > b.id ? 1 : -1 ;
	}

	// Object functions

	function extend(obj) {
		var i = 0,
		    length = arguments.length,
		    obj2, key;

		while (++i < length) {
			obj2 = arguments[i];

			for (key in obj2) {
				if (obj2.hasOwnProperty(key)) {
					obj[key] = obj2[key];
				}
			}
		}

		return obj;
	}

	// Collection functions

	function findByIndex(collection, id) {
		var index = collection.index;
		var l = collection.length;

		while (l--) {
			if (collection[l][index] === id) {
				return collection[l];
			}
		}
	}

	function findByObject(collection, object) {
		var i = collection.indexOf(object);
		
		if (i === -1) { return; }
		
		return collection[i];
	}

	function add(collection, object) {
		// Add an item, keeping the collection sorted by id.
		var index = collection.index;

		// If the object does not have an index key, push it
		// to the end of the collection.
		if (!isDefined(object[index])) {
			collection.push(object);
			return;
		}

		var l = collection.length;

		while (collection[--l] && (collection[l][index] > object[index] || !isDefined(collection[l][index])));
		collection.splice(l + 1, 0, object);
	}

	function remove(array, obj, i) {
		var found = false;

		if (i === undefined) { i = -1; }

		while (++i < array.length) {
			if (obj === array[i]) {
				array.splice(i, 1);
				--i;
				found = true;
			}
		}
		
		return found;
	}

	function invalidateCaches(collection) {

	}

	function toJSON(collection) {
		return collection.map(toArray);
	}

	function multiarg(fn) {
		return function(data) {
			var n = -1;
			var l = arguments.length;

			invalidateCaches(this);

			while (++n < l) {
				fn.call(this, arguments[n]);
			}

			return this;
		}
	}


	mixin.collection = {
		add: multiarg(function(item) {
			add(this, item);
			this.trigger('add', item);
		}),

		remove: multiarg(function(item) {
			var obj = this.find(item);

			if (!obj) { return; }

			remove(this, obj);
			this.trigger('remove', obj);
		}),

		update: multiarg(function(obj) {
			var item = this.find(obj);

			if (item) {
				extend(item, obj);
				this.trigger('update', item);
			}
			else {
				this.add(obj);
				this.trigger('add', obj);
			}

			return this;
		}),

		find: function(obj) {
			var index = this.index;

			return !isDefined(obj) ?
					undefined :
				typeof obj === 'string' || typeof obj === 'number' ?
					findByIndex(this, obj) :
				isDefined(obj[index]) ?
					findByIndex(this, obj[index]) :
					findByObject(this, obj) ;
		},

		contains: function(object) {
			return this.indexOf(object) !== -1;
		},

		// Get the value of a property of all the objects in
		// the collection if they all have the same value.
		// Otherwise return undefined.

		get: function(property) {
			var n = this.length;

			if (n === 0) { return; }

			while (--n) {
				if (this[n][property] !== this[n - 1][property]) { return; }
			}

			return this[n][property];
		},

		// Set a property on every object in the collection.

		set: function(property, value) {
			if (arguments.length !== 2) {
				throw new Error('Collection.set(property, value) requires 2 arguments. ' + arguments.length + ' given.');
			}

			var n = this.length;
			while (n--) { this[n][property] = value; }
			return this;
		},

		toJSON: function() {
			return this.map(returnArg);
		},

		toObject: function(key) {
			var object = {};
			var prop, type;

			if (!key) { key = this.index; }

			while (n--) {
				prop = this[n][key];
				type = typeof prop;

				if (type === 'string' || type === 'number' && prop > -Infinity && prop < Infinity) {
					object[prop] = this[n];
				}
				else {
					console.warn('Collection.toObject() ' + prop + ' cannot be used as a key.');
				}
			}

			return object;
		}
	};

	// Object constructor

	var prototype = extend({}, mixin.events, mixin.set, mixin.array, mixin.collection);
	
	var properties = {
		length: {
			value: 0,
			enumerable: false,
			writable: true,
			configurable: true
		}
	};

	function Collection(data, index) {
		var collection = Object.create(prototype, properties);

		index = index || 'id';

		function byIndex(a, b) {
			return a[index] > b[index] ? 1 : -1 ;
		}

		Object.defineProperties(collection, {
			// Define the name of the property that will be used to sort and
			// index this collection.
			index: { value: index }
		});

		if (data === undefined) {
			data = [];
		}
		else if (!(data instanceof Array)) {
			if (debug) console.log('Scribe: data not an array. Scribe cant do that yet.');
			data = [];
		}

		// Populate the collection
		data.forEach(setValue, collection);

		var length = collection.length = data.length;

		// Sort the collection
		collection.sort(byIndex);

		// Watch the length and delete indexes when the length becomes shorter
		// like a nice array does.
		observe(collection, 'length', function(collection) {
			while (length-- > collection.length) {
				// JIT compiler notes suggest that setting undefined is
				// quicker than deleting a property.
				collection[length] = undefined;
			}

			length = collection.length;
		});

		// Delegate events
		//collection
		//.each(setListeners);

		// Define caches
		//Object.defineProperties(collection, {
		//
		//});

		return collection;
	};

	Collection.prototype = prototype;
	Collection.add = add;
	Collection.remove = remove;

	ns.Collection = Collection;
})(this, this.mixin);


// Sparky
// 
// Reads data attributes in the DOM to bind dynamic data to
// controllers.
// 
// Views
// 
// <div data-ctrl="name" data-model="path.to.data">
//     <h1>Hello world</h1>
// </div>
// 
// Where 'name' is the key of a view function in
// Sparky.ctrl and path.to.data points to an object
// in Sparky.data.


(function(ns){
	"use strict";

	var empty = [];
	var templates   = {};
	var features    = {
	    	template: 'content' in document.createElement('template')
	    };

	var rtag = /\{\{\s*([\w\-\.\[\]]+)\s*\}\}/g,
	    // Check whether a path begins with '.' or '['
	    rrelativepath = /^\.|^\[/;

	var prototype = extend({
		create: function() {},

		reset: function() {},

		destroy: function() {},

		remove: function() {
			while (this.length--) {
				removeNode(this[this.length]);
			}
		},

		observe: function(object, property, fn) {
			Sparky.observe(object, property, fn);
			this.on('destroy', function() {
				Sparky.unobserve(object, property, fn);
			});
		},

		appendTo: function(node) {
			var n = -1;
			while (++n < this.length) {
				node.appendChild(this[n]);
			}
			return this;
		},

		removeFrom: function(node) {
			var n = -1;
			while (++n < this.length) {
				node.removeChild(this[n]);
			}
			return this;
		}
	}, ns.mixin.events);


	// Pure functions

	var slice  = Function.prototype.call.bind(Array.prototype.slice);
	var reduce = Function.prototype.call.bind(Array.prototype.reduce);

	function noop() {}
	function isDefined(val) { return val !== undefined && val !== null; }

	// Object helpers

	function extend(obj) {
		var i = 0,
		    length = arguments.length,
		    obj2, key;

		while (++i < length) {
			obj2 = arguments[i];

			for (key in obj2) {
				if (obj2.hasOwnProperty(key)) {
					obj[key] = obj2[key];
				}
			}
		}

		return obj;
	}

	function copy(array1, array2) {
		Array.prototype.push.apply(array2, array1);
	}


	// Debug helpers

	function nodeToText(node) {
		return [
			'<',
			node.tagName.toLowerCase(),
			//(node.className ? ' class="' + node.className + '"' : ''),
			//(node.getAttribute('href') ? ' href="' + node.getAttribute('href') + '"' : ''),
			(node.getAttribute('data-ctrl') ? ' data-ctrl="' + node.getAttribute('data-ctrl') + '"' : ''),
			(node.getAttribute('data-model') ? ' data-model="' + node.getAttribute('data-model') + '"' : ''),
			(node.id ? ' id="' + node.id + '"' : ''),
			'>'
		].join('');
	}


	// DOM helpers

	function append(parent, child) {
		parent.appendChild(child);
		return parent;
	}
	
	function replace(parent, child) {
		// Remove all children.
		while (parent.lastChild) {
			parent.removeChild(parent.lastChild);
		}
		
		// Append the template fragment.
		parent.appendChild(child);
		return parent;
	}

	function fragmentFromChildren(template) {
		var children = slice(template.childNodes);
		var fragment = document.createDocumentFragment();
		return reduce(children, append, fragment);
	}

	function getTemplateContent(node) {
		// A template tag has a content property that gives us a document
		// fragment. If that doesn't exist we must make a document fragment.
		return node.content || fragmentFromChildren(node);
	}

	function getTemplate(id) {
		var node = document.getElementById(id);
		return node && getTemplateContent(node);
	}

	function fetchTemplate(id) {
		var template = templates[id] || (templates[id] = getTemplate(id));
		
		if (Sparky.debug && !template) {
			console.warn('Sparky: template #' + id + ' not found.');
		}

		return template && template.cloneNode(true);
	}

	function removeNode(node) {
		node.parentNode && node.parentNode.removeChild(node);
	}

	function insertNode(node1, node2) {
		node1.parentNode && node1.parentNode.insertBefore(node2, node1);
	}

	// Getting and setting

	function findByPath(obj, path) {
		if (!isDefined(obj) || !isDefined(path)) { return; }
		
		return path === '.' ?
			obj :
			Sparky.getPath(obj, path) ;
	}

	// Sparky - the meat and potatoes

	function slaveSparky(sparky1, sparky2) {
		// When sparky is ready, overwrite the trigger method
		// to trigger all events on the slave sparky immediately
		// following the trigger on the master.
		sparky1.on('ready', function() {
			sparky1.on(sparky2);
		});

		return sparky2;
	}

	function setupCollection(node, model, ctrl) {
		var modelName = node.getAttribute('data-model');
		var endNode = document.createComment(' [Sparky] data-model="' + modelName + '" ');
		var nodes = [];
		var sparkies = [];
		var cache = [];
		var inserted;

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
					removeNode(nodes[l]);
					sparkies[l].destroy();
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
					sparkies[n] = Sparky(nodes[n], model[n], ctrl, false);
				}

				insertNode(endNode, nodes[n]);
				sparkies[n].trigger('insert');
			}

			if (Sparky.debug) {
				console.log('Sparky: collection rendered (length: ' + model.length + ' time: ' + (+new Date() - t) + 'ms)');
			}
		}

		// Put the marker node in place
		insertNode(node, endNode);

		// Remove the node
		removeNode(node);

		// Remove anything that would make Sparky bind the node
		// again. This can happen when a collection is appended
		// by a controller without waiting for it's 'ready' event.
		node.removeAttribute('data-model');
		node.removeAttribute('data-ctrl');

		var throttle = Sparky.Throttle(updateNodes);

		Sparky.observe(model, 'length', throttle);

		// Return a pseudo-sparky that delegates events to all
		// sparkies in the collection.
		return {
			destroy: function() {
				var l = sparkies.length;
				var n = -1;
				while (++n < l) {
					sparkies[n].destroy();
				}

				throttle.cancel();
				Sparky.unobserve(model, 'length', throttle);
			},

			trigger: function(string) {
				var l = sparkies.length;
				var n = -1;
				while (++n < l) {
					sparkies[n].trigger.apply(sparkies[n], arguments);
				}
			}
		};
	}

	function setupSparky(sparky, node, model, ctrl) {
		var templateId = node.getAttribute && node.getAttribute('data-template');
		var templateFragment = templateId && fetchTemplate(templateId);
		var scope, unbind;

		function insertTemplate(sparky, node, templateFragment) {
			// Wait until the scope is rendered on the next animation frame
			requestAnimationFrame(function() {
				replace(node, templateFragment);
				sparky.trigger('template', node);
			});
		};

		function insert() {
			insertTemplate(sparky, node, templateFragment);
			insert = noop;
		}

		function get(property) {
			return Sparky.getPath(scope, property);
		}

		function set(property, value) {
			Sparky.setPath(scope, property, value);
		}

		function create(node) {
			var path = node.getAttribute('data-model');
			var data;

			if (!isDefined(path)) {
				// We know that model is not defined, and we don't want child
				// sparkies to loop unless explicitly told to do so, so stop
				// it from looping. TODO: I really must clean up Sparky's
				// looping behaviour.
				return slaveSparky(sparky, Sparky(node, scope, undefined, false));
			}

			if (path === '.') {
				return slaveSparky(sparky, Sparky(node, model));
			}

			if (rrelativepath.test(path)) {
				data = findByPath(model, path.replace(rrelativepath, ''));

				if (!data) {
					throw new Error('Sparky: No object at relative path \'' + path + '\' of model#' + model.id);
				}

				return slaveSparky(sparky, Sparky(node, data));
			}

			rtag.lastIndex = 0;
			if (rtag.test(path)) {
				
				rtag.lastIndex = 0;
				data = findByPath(scope, rtag.exec(path)[1]);

				if (!data) {
					rtag.lastIndex = 0;
					throw new Error('Sparky: Property \'' + rtag.exec(path)[1] + '\' not in parent scope. ' + nodeToText(node));
				}

				return Sparky(node, data);
			}

			return slaveSparky(sparky, Sparky(node, findByPath(Sparky.data, path)));
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

		sparky.destroy = function destroy() {
			this.detach();
			this.detach = noop;
			this.remove();

			return this
				.trigger('destroy')
				.off();
		};

		// If a scope object is returned by the ctrl, we use that, otherwise
		// we use the model object as scope, and if that doesn't exist use an
		// empty object. This means we can launch sparky on a node where a
		// model is not defined and it will nonetheless pick up and spark
		// child nodes.
		scope = ctrl && ctrl.call(sparky, node, model);

		// A controller returning false is telling us not to use data binding.
		if (scope === false) { return; }

		scope = scope || model || {};

		if (Sparky.debug && templateId) {
			console.log('Sparky: template:', templateId);
		}

		function observe(property, fn) {
			Sparky.observePath(scope, property, fn);

			if (templateFragment) {
				Sparky.observePath(scope, property, insert);
			}
		}

		function unobserve(property, fn) {
			Sparky.unobservePath(scope, property, fn);
		}

		// The bind function returns an array of unbind functions.
		sparky.detach = unbind = Sparky.bind(templateFragment || node, observe, unobserve, get, set, create, scope);
		sparky.trigger('ready');
	}

	function makeDistributeCtrl(ctrls) {
		return ctrls.length === 1 ?
			ctrls[0] :
			function distributeCtrl(node, model) {
				// Distributor controller
				var l = ctrls.length;
				var n = -1;
				var scope = model;
				var temp;

				// Call the list of ctrls. Scope is the return value of
				// the last ctrl in the list that does not return undefined
				while (++n < l) {
					temp = ctrls[n].call(this, node, scope);
					if (temp) { scope = temp; }
				}

				return scope;
			} ;
	}

	function makeDistributeCtrlFromPaths(paths) {
		var ctrls = [];
		var l = paths.length;
		var n = -1;

		while (++n < l) {
			ctrls.push(findByPath(Sparky.ctrl, paths[n]));
		}

		return makeDistributeCtrl(ctrls);
	}

	function makeCtrl(node) {
		var ctrlPaths = node.getAttribute('data-ctrl');

		if (!isDefined(ctrlPaths)) { return; }

		var array = ctrlPaths.split(/\s+/);

		if (array.length === 1) {
			return findByPath(Sparky.ctrl, array[0]);
		}

		return makeDistributeCtrlFromPaths(array);
	}

	function Sparky(node, model, ctrl, loop) {
		if (Sparky.debug === 'verbose') {
			console.log('Sparky: Sparky(', typeof node === 'string' ? node : nodeToText(node), ',',
				(model && '{}'), ',',
				(ctrl && (ctrl.name || 'anonymous function')), ')'
			);
		}

		var modelPath, ctrlPath, tag, id;

		if (loop !== false) { loop = true; }

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

		// Where model is not defined look for the data-model
		// attribute. Document fragments do not have a getAttribute
		// method.
		if (!isDefined(model) && node.getAttribute) {
			modelPath = node.getAttribute('data-model');
			
			if (isDefined(modelPath)) {
				model = findByPath(Sparky.data, modelPath);

				if (Sparky.debug && !model) {
					console.log('Sparky: data-model="' + modelPath + '" model not found in Sparky.data. Path will be observed.' );
				}
			}
		}

		// If ctrl is a string, assume it is the name of a controller
		if (typeof ctrl === 'string') {
			ctrl = Sparky.ctrl[ctrl];
		}

		// Where ctrl is not defined look for the data-ctrl
		// attribute. Document fragments do not have a getAttribute
		// method.
		if (!ctrl && node.getAttribute) {
			ctrl = makeCtrl(node);
		}

		// Where model is an array or array-like object with a length property,
		// but not a function, set up Sparky to clone node for every object in
		// the array.
		if (loop && model && model.length !== undefined && typeof model !== 'function') {
			return setupCollection(node, model, ctrl);
		}

		var sparky = Object.create(prototype);

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

	Sparky.debug        = false;
	Sparky.config       = {};
	Sparky.settings     = {};
	Sparky.data         = {};
	Sparky.ctrl         = {};
	Sparky.Collection   = window.Collection;
	Sparky.templates    = templates;
	Sparky.features     = features;
	Sparky.template     = fetchTemplate;
	Sparky.content      = getTemplateContent;
	Sparky.extend       = extend;
	Sparky.svgNamespace = "http://www.w3.org/2000/svg";
	Sparky.xlink        = 'http://www.w3.org/1999/xlink';
 
	ns.Sparky = Sparky;
})(window);


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

	function call(fn) { fn(); }

	function isDefined(n) {
		return n || n !== undefined && n !== null && !Number.isNaN(n);
	}

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
		}
	};

	// Nodes that require special bindings
	var tags = {
	    	label: function(node, name, bind, unbind, get, set, create, unobservers, scope) {
	    		bindAttribute(node, 'for', bind, unbind, get, unobservers);
	    		bindNodes(node, bind, unbind, get, set, create, unobservers, scope);
	    	},

	    	input: function(node, name, bind, unbind, get, set, create, unobservers, scope) {
	    		var type = node.type;

	    		bindAttribute(node, 'value', bind, unbind, get, unobservers);
	    		bindAttribute(node, 'min', bind, unbind, get, unobservers);
	    		bindAttribute(node, 'max', bind, unbind, get, unobservers);

	    		var unbind = type === 'number' || type === 'range' ?
	    		    	// Only let numbers set the value of number and range inputs
	    		    	Sparky.bindNamedValueToObject(node, scope, numberToString, stringToNumber) :
	    		    	// Coerce any value to a string to set the others
	    		    	Sparky.bindNamedValueToObject(node, scope, returnArg, returnArg) ;
	    		if (unbind) { unobservers.push(unbind); }
	    	},

	    	select: function(node, name, bind, unbind, get, set, create, unobservers, scope) {
	    		bindAttribute(node, 'value', bind, unbind, get, unobservers);
	    		bindNodes(node, bind, unbind, get, set, create, unobservers, scope);

	    		// Coerce any value to string to set it on the select
	    		var unbind = Sparky.bindNamedValueToObject(node, scope, toString, returnArg);
	    		if (unbind) { unobservers.push(unbind); }
	    	},

	    	option: function(node, name, bind, unbind, get, set, create, unobservers, scope) {
	    		bindAttribute(node, 'value', bind, unbind, get, unobservers);
	    		bindNodes(node, bind, unbind, get, set, create, unobservers, scope);
	    	},

	    	textarea: function(node, prop, bind, unbind, get, set, create, unobservers, scope) {
	    		// Only let strings into the textarea
	    		var unbind = Sparky.bindNamedValueToObject(node, scope, returnArg, returnArg);
	    		if (unbind) { unobservers.push(unbind); }
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
			tags[tag](node, node.name, bind, unbind, get, set, create, unobservers, scope);
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
			    isDefined(child.getAttribute('data-model')))) {
				sparky = create(child);
				unobservers.push(sparky.destroy.bind(sparky));
			}
			else if (binders[child.nodeType]) {
				unobservers.push.apply(unobservers, binders[child.nodeType](child, bind, unbind, get, set, create, scope));
			}
		}
	}

	function setAttributeSVG(node, attribute, value) {
		node.setAttributeNS(Sparky.xlink, attribute, value);
	}

	function setAttributeHTML(node, attribute, value) {
		node.setAttribute(attribute, value);
	}

	function getClass(node) {
		// node.className is an object in SVG. getAttribute
		// is more consistent, if a tad slower.
		return node.getAttribute('class');
	}

	function getClassList(node) {
		return node.classList || new TokenList(node, getClass, setClass);
	}

	function setClass(node, classes) {
		if (node instanceof SVGElement) {
			node.setAttribute('class', classes);
		}
		else {
			node.className = classes;
		}
	}

	function addClasses(classList, text) {
		classList.add.apply(classList, text.trim().split(rspaces));
	}

	function removeClasses(classList, text) {
		classList.remove.apply(classList, text.trim().split(rspaces));
	}

	function bindClasses(node, bind, unbind, get, unobservers) {
		var classes = getClass(node);

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
		setClass(node, text);

		// Create an update function for keeping sparky's classes up-to-date
		var classList = getClassList(node);
		var update = function update(newText, oldText) {
		    	if (oldText) { removeClasses(classList, oldText); }
		    	if (newText) { addClasses(classList, newText); }
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
		var value = isSVG ?
		    	node.getAttributeNS(Sparky.xlink, attribute) :
		    	node.getAttribute(attribute) ;

		if (!value) { return; }
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
		rtags.lastIndex = 0;
		str.replace(rtags, function($0, $1, $2){
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
			return isDefined(value2) ? value2 : '' ;
		}
	}

	function makeUpdateText(text, get, fn) {
		var replaceText = makeReplaceText(get);
		var oldText;

		return function updateText() {
			rtags.lastIndex = 0;
			var newText = text.replace(rtags, replaceText);
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
		return function() {
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

		return function unbind() {
			unobservers.forEach(call);
		};
	}

	Sparky.bind = bind;
	Sparky.attributes = attributes;


	// -------------------------------------------------------------------

	// 2-way binding for form elements.
	// HTML form elements are hard to handle. They do all sorts of strange
	// things such as radios and checkboxes having a default value of 'on'
	// where a value attribute is not given. This set of functions handles
	// 2-way binding between a node and an object.

	function makeUpdateInput(node, model, path, fn) {
		var type = node.type;

		return type === 'radio' || type === 'checkbox' ?
			function updateChecked() {
				var value = fn(Sparky.getPath(model, path));
				node.checked = node.value === value;
				node.dispatchEvent(changeEvent);
			} :
			function updateValue() {
				var value = fn(Sparky.getPath(model, path));

				// Check against the current value - resetting the same string
				// causes the cursor to jump.
				if (!isDefined(value)) {
					node.value = '';
					node.dispatchEvent(changeEvent);
					return;
				}

				var string = value + '';

				if (value !== node.value) {
					node.value = value;
					node.dispatchEvent(changeEvent);
					return;
				}
			} ;
	}

	function makeChangeListener(node, model, path, fn) {
		var type = node.type;
		
		return type === 'radio' ? function radioChange(e) {
				if (node.checked) {
					Sparky.setPath(model, path, fn(node.value));
				}
			} :
			type === 'checkbox' ? function checkboxChange(e) {
				Sparky.setPath(model, path, node.checked ? fn(node.value) : undefined);
			} :
			function valueChange(e) {
				Sparky.setPath(model, path, fn(node.value));
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
			if (!isDefined(Sparky.getPath(model, path))) {
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
		}
	}

	function bindNamedValueToObject(node, model, to, from) {
		var name = node.name;

		if (!node.name) { return; }

		rtags.lastIndex = 0;
		var tag = (rtags.exec(name) || empty);
		var path = tag[2];

		if (!path) { return; }

		if (tag[3]) {
			console.warn('Sparky: Sparky tags in name attributes do not accept filters. Ignoring name="' + name + '".');
			return;
		}

		// Take the tag parentheses away from the name, preventing this node
		// from being name-value bound by any other controllers.
		node.name = path;

		return bindPathToValue(node, model, path, to, from);
	}



	// Controllers

	function returnArg(arg) { return arg; }

	function toString(value) { return '' + value; }

	function numberToString(value) {
		return typeof value === 'number' ? toString(value) : '' ;
	}

	function stringToNumber(value) {
		// coerse to number
		var n = parseFloat(value);
		return Number.isNaN(n) ? undefined : n ;
	}

	function stringToInteger(value) {
		// coerse to number
		var n = parseFloat(value);
		return Number.isNaN(n) ? undefined : Math.round(n) ;
	}

	function booleanToString(value) {
		return typeof value === 'boolean' ? toString(value) :
			typeof value === 'number' ? toString(!!value) :
			'' ;
	}

	function booleanToStringInverted(value) {
		return typeof value === 'boolean' ? toString(!value) :
			typeof value === 'number' ? toString(!value) :
			'' ;
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

	function valueStringCtrl(node, model) {
		// Don't coerce so that non-strings get caught by the equality checker
		var unbind = Sparky.bindNamedValueToObject(node, model, returnArg, returnArg);
		this.on('destroy', unbind);
	}

	function valueNumberCtrl(node, model) {
		var unbind = Sparky.bindNamedValueToObject(node, model, numberToString, stringToNumber);
		this.on('destroy', unbind);
	}

	function valueIntegerCtrl(node, model) {
		var unbind = Sparky.bindNamedValueToObject(node, model, numberToString, stringToInteger);
		this.on('destroy', unbind);
	}

	function valueIntCtrl(node, model) {
		var unbind = Sparky.bindNamedValueToObject(node, model, numberToString, stringToNumber);
		this.on('destroy', unbind);
	}

	function valueBooleanCtrl(node, model) {
		var unbind = Sparky.bindNamedValueToObject(node, model, booleanToString, stringToBoolean);
		this.on('destroy', unbind);
	}

	function valueBooleanInvertCtrl(node, model) {
		var unbind = Sparky.bindNamedValueToObject(node, model, booleanToStringInverted, stringToBooleanInverted);
		this.on('destroy', unbind);
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
		
		this.on('destroy', unbind);
	};


	Sparky.extend(Sparky.ctrl, {
		'value-string':         valueStringCtrl,
		'value-number':         valueNumberCtrl,
		'value-number-invert':  valueNumberInvertCtrl,
		'value-boolean':        valueBooleanCtrl,
		'value-boolean-invert': valueBooleanInvertCtrl,
		'value-int':            valueIntegerCtrl
	});

	Sparky.ctrl['value-invert'] = function(node, model) {
		console.warn('Sparky: ctrl "value-invert" is deprecated. Replace with "value-boolean-invert"');
	};

	Sparky.getClassList = getClassList;
	Sparky.bindNamedValueToObject = bindNamedValueToObject;
})(Sparky);


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

	Sparky.getPath = getPath;
	Sparky.setPath = setPath;
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
					console.warn('Sparky: Are you trying to observe an array?. Sparky is going to observe it by polling. You may want to use a Sparky.Collection() to avoid this.', object);
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
		var queued, scope, args;

		function update() {
			queued = false;
			fn.apply(scope, args);
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
			// Store the latest scope and arguments
			scope = this;
			args = arguments;

			// Don't queue update if it's already queued
			if (queued) { return; }

			// Queue update
			window.requestAnimationFrame(update);
			queued = true;
		}

		function throttle() {
			queue.apply(this, arguments);
		}

		throttle.cancel = cancel;
		update();

		return throttle;
	}

	Sparky.Throttle = Throttle;
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
			return denormalise(pow(normalise(value, min, max), 1/2), min, max);
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
			return n;
		}

		function from(value) {
			var n = parseFloat(value);
			if (Number.isNaN(n)) { return; }
			return min * Math.pow(ratio, normalise(n, min, max));
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
})();


(function() {
	"use strict";

	var n = 0;

	Sparky.ctrl['debug'] = function(node, model) {
		console.log('DEBUG', n++);
		debugger;
	};

	Sparky.ctrl['debug-events'] = function(node, model) {
		var ready = 0;
		var insert = 0;
		var destroy = 0;

		this
		.on('ready', function() {
			console.log('READY', ready++, node);
		})
		.on('insert', function() {
			console.log('INSERT', insert++, node);
		})
		.on('destroy', function() {
			console.log('DESTROY', destroy++, node);
		});
	};
})();


// Sparky.filters

(function(Sparky, undefined) {
	"use strict";

	var settings = (Sparky.settings = Sparky.settings || {});
	
	// A reuseable array.
	var array = [];
	
	settings.months      = ('January February March April May June July August September October November December').split(' ');
	settings.days        = ('Sunday Monday Tuesday Wednesday Thursday Friday Saturday').split(' ');
	settings.ordinals    = (function(ordinals) {
		var array = [], n = 0;
		
		while (n++ < 31) {
			array[n] = ordinals[n] || 'th';
		}
		
		return array;
	})({
		1: 'st',
		2: 'nd',
		3: 'rd',
		21: 'st',
		22: 'nd',
		23: 'rd',
		31: 'st'
	});

	var log10 = Math.log10 || (function log10(n) {
	    	return Math.log(n) / Math.LN10;
	    });

	function spaces(n) {
		var s = '';
		while (n--) { s += ' ' }
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
			return value.charAt(0).toUpperCase() + string.substring(1);
		},

		cut: function(value, string) {
			return value.replace(RegExp(string, 'g'), '');
		},

		date: (function(M, F, D, l, s) {
			var formatters = {
				a: function(date) { return date.getHours() < 12 ? 'a.m.' : 'p.m.'; },
				A: function(date) { return date.getHours() < 12 ? 'AM' : 'PM'; },
				b: function(date) { return settings.months[date.getMonth()].toLowerCase().slice(0,3); },
				c: function(date) { return date.toISOString(); },
				d: function(date) { return date.getDate(); },
				D: function(date) { return settings.days[date.getDay()].slice(0,3); },
				//e: function(date) { return ; },
				//E: function(date) { return ; },
				//f: function(date) { return ; },
				F: function(date) { return settings.months[date.getMonth()]; },
				g: function(date) { return date.getHours() % 12; },
				G: function(date) { return date.getHours(); },
				h: function(date) { return ('0' + date.getHours() % 12).slice(-2); },
				H: function(date) { return ('0' + date.getHours()).slice(-2); },
				i: function(date) { return ('0' + date.getMinutes()).slice(-2); },
				//I: function(date) { return ; },
				j: function(date) { return date.getDate(); },
				l: function(date) { return settings.days[date.getDay()]; },
				//L: function(date) { return ; },
				m: function(date) { return ('0' + date.getMonth()).slice(-2); },
				M: function(date) { return settings.months[date.getMonth()].slice(0,3); },
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
			
			return function formatDate(value, format) {
				if (!isDefined(value)) { return ''; }

				var date = value instanceof Date ? value : new Date(value) ;

				return format.replace(rletter, function($0, $1) {
					return formatters[$1](date);
				});
			};
		})(settings),

		decibels: function(value) {
			return typeof value === 'number' && 20 * log10(value);
		},

		decimals: function(value, n) {
			return typeof value === 'number' && Number.prototype.toFixed.call(value, n);
		},

		// .default() can't work, because Sparky does not send undefined or null
		// values to be filtered. 
		//'default': function(value) {
		//	return (this === '' || this === undefined || this === null) ? value : this ;
		//},

		//dictsort
		//dictsortreversed
		//divisibleby

		escape: (function() {
			var pre = document.createElement('pre');
			var text = document.createTextNode(this);

			pre.appendChild(text);
			
			return function(value) {
				text.textContent = value;
				return pre.innerHTML;
			};
		})(),

		equal: function(value, val, string1, string2) {
			return (value === val ? string1 : string2) || '';
		},

		//filesizeformat

		first: function(value) {
			return value[0];
		},

		floatformat: function(value, n) {
			return typeof value === 'number' ? Number.prototype.toFixed.call(value, n) :
				!isDefined(value) ? '' :
				(Sparky.debug && console.warn('Sparky: filter floatformat: ' + n + ' called on non-number ' + value)) ;
		},

		get: function(value, name) {
			return value[name];
		},

		//get_digit
		//iriencode

		join: function(value) {
			return Array.prototype.join.apply(value);
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

		//length_is
		//linebreaks

		linebreaksbr: (function() {
			var rbreaks = /\n/;
			
			return function(value) {
				return value.replace(rbreaks, '<br/>')
			};
		})(),

		//linenumbers

		lower: function(value) {
			String.prototype.toLowerCase.apply(value);
		},

		lowercase: function(value) {
			String.prototype.toLowerCase.apply(value);
		},
		
		//make_list 
		
		multiply: function(value, n) {
			return value * n;
		},
		
		parseint: function(value) {
			return parseInt(value, 10);
		},

		percent: function(value) {
			return value * 100;
		},

		//phone2numeric

		pluralize: function(value, str1, str2, lang) {
			str1 = str1 || '';
			str2 = str2 || 's';
			
			if (lang === 'fr') {
				return value < 2 ? str1 : str2;
			}
			else {
				return value === 1 ? str1 : str2;
			}
		},

		//pprint

		prepad: function(value, n, char) {
			if (!isDefined(value)) { return ''; }

			var string = value.toString();
			var l = string.length;

			// String is longer then padding: let it through unprocessed
			if (n - l < 1) { return value; }

			array.length = 0;
			array.length = n - l;
			array.push(string);
			return array.join(char || ' ');
		},

		postpad: function(value, n) {
			if (!isDefined(value)) { return ''; }

			var string = value.toString();
			var l = string.length;
			var m = parseInt(n, 10);

			return m === l ? value :
				m > l ? string + spaces(m-l) :
				string.substring(0, m) ;
		},

		random: function(value) {
			return value[Math.floor(Math.random() * value.length)];
		},
		
		//raw
		//removetags
		
		replace: function(value, str1, str2) {
			return value.replace(RegExp(str1, 'g'), str2);
		},
		
		//reverse

		safe: function(string) {
			if (typeof string !== string) { return; }
			// Actually, we can't do this here, because we cant return DOM nodes
			return;
		},

		//safeseq

		slice: function(value) {
			return Array.prototype.slice.apply(value);
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

		//truncatewords
		//truncatewords_html
		//unique
		
		unordered_list: function(value) {
			// TODO: Django supports nested lists. 
			var list = value,
			    length = list.length,
			    i = -1,
			    html = '';
			
			while (++i < length) {
				html += '<li>';
				html += list[i];
				html += '</li>';
			}
			
			return html;
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
// data-model and data-ctrl attributes and use them to instantiate Sparky.

(function(jQuery, Sparky) {
	if (!jQuery) { return; }

	var doc = jQuery(document);

	function isInTemplate(node) {
		if (node.tagName.toLowerCase() === 'template') { return true; }
		if (node === document.documentElement) { return false; }
		return isInTemplate(node.parentNode);
	}

	doc.ready(function(){
		var start;
		
		if (window.console) { start = Date.now(); }
		
		var nodes = document.querySelectorAll('[data-ctrl], [data-model]');
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

				modelPath = nodes[n].getAttribute('data-model');

				if (modelPath !== undefined && !/\{\{/.test(modelPath)) {
					//array.push(nodes[n]);
				}
			};
			--n;
		}
		
		// Normally <template>s are inert, but if they are not a supported
		// feature their content is part of the DOM so we have to remove those,
		// too. 
		if (!Sparky.features.template) {
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


// Make the minifier remove debug code paths
Sparky.debug = false;