// Polyfill the CustomEvent API for brosers that don't have
// it (IE9 and IE10).

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
// Polyfill for requestAnimationFrame
//
// Stephen Band
// 
// The frameDuration is set to 33ms by default for a framerate of 30fps, the
// thinking being that browsers without requestAnimationFrame are generally a
// little slower and less optimised for higher rates.

(function() {
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
}());
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

// mixin.events

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

	function getEvents(object) {
		if (!object.events) {
			Object.defineProperty(object, 'events', {
				value: {}
			});
		}

		return object.events;
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

			var events = getEvents(this);
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

				if (this.events) {
					for (type in this.events) {
						this.events[type].length = 0;
						delete this.events[type];
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
			if (!this.events) { return this; }

			if (typeof types === 'string') {
				// .off(types, fn)
				types = types.split(/\s+/);
			}
			else {
				// .off(fn)
				fn = types;
				types = Object.keys(this.events);
			}

			while (type = types.shift()) {
				listeners = this.events[type];

				if (!listeners) {
					continue;
				}

				if (!fn) {
					this.events[type].length = 0;
					delete this.events[type];
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

			var events = getEvents(this);

			args = slice(arguments);

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

			// Propagate to dependents
			var dependents = this.dependents;
			
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
// Observe and unobserve
// 
// observe(obj, [prop], fn)
// unobserve(obj, [prop], [fn])
// 
// Crudely observes object properties for changes by redefining
// properties of the observable object with setters that fire
// a callback function whenever the property changes.

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

			return typeof obj === 'string' || typeof obj === 'number' ?
					findByIndex(this, obj) :
				isDefined(obj[index]) ?
					findByIndex(this, obj[index]) :
					findByObject(this, obj) ;
		},

		contains: function(object) {
			return this.indexOf(object) !== -1;
		},

		get: function(property) {
			// Returns a value if all the objects in the selection
			// have the same value for this property, otherwise
			// returns undefined.
			var n = this.length;

			if (n === 0) { return; }

			while (--n) {
				if (this[n][property] !== this[n - 1][property]) {
					return;
				}
			}

			return this[n][property];
		},
		
		set: function(property, value) {
			if (arguments.length !== 2) {
				if (debug) { console.warn('[tb-app] Can\'t set selection with [property, value]', arguments, '. Don\'t be absurd.'); }
				return;
			}

			// For every object in the selection set property = value.
			var n = this.length;

			while (n--) {
				this[n][property] = value;
			}

			return this;
		},

		toJSON: function() {
			return this.map(returnArg);
		},

		toObject: function(key) {
			var object = {};
			var prop, type;

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

	var templates   = {};
	var features    = {
	    	template: 'content' in document.createElement('template')
	    };

	var rtag = /\{\{\s*([\w\-\.\[\]]+)\s*\}\}/g,
	    rbracket = /\]$/,
	    rpathtrimmer = /^\[|]$/g,
	    rpathsplitter = /\]?\.|\[/g,
	    // Check whether a path begins with '.' or '['
	    rrelativepath = /^\.|^\[/;

	var empty = [];

	var reduce = Array.prototype.reduce,
	    slice = Array.prototype.slice;

	var prototype = extend({
		get: function() {
			
		},

		set: function() {
			
		},

		create: function() {
			
		},

		destroy: function() {
			
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
	
	var changeEvent = new window.CustomEvent('change');

	// Pure functions

	function noop() {}
	function call(fn) { fn(); }
	function isDefined(val) { return val !== undefined && val !== null; }
	function isObject(obj) { return obj instanceof Object; }
	function getProperty(obj, property) { return obj[property]; }

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

	function isConfigurable(obj, prop) {
		return Object.getOwnPropertyDescriptor(obj, prop).configurable;
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
		var children = slice.apply(template.childNodes);
		var fragment = document.createDocumentFragment();
		return reduce.call(children, append, fragment);
	}
	
	function getTemplate(id) {
		var node = document.getElementById(id);
		
		if (!node) { return; }
		
		// A template tag has a content property that gives us a document
		// fragment. If that doesn't exist we must make a document fragment.
		return node.content || fragmentFromChildren(node);
	}
	
	function fetchTemplate(id) {
		var template = templates[id] || (templates[id] = getTemplate(id));
		
		if (Sparky.debug && !template) {
			console.warn('[Sparky] template #' + id + ' not found.');
		}

		return template && template.cloneNode(true);
	}


	// Sparky
	
	function removeNode(node) {
		node.parentNode && node.parentNode.removeChild(node);
	}
	
	function insertNode(node1, node2) {
		node1.parentNode && node1.parentNode.insertBefore(node2, node1);
	}

	function defaultCtrl(node, model) {
		this.on('destroy', function(sparky, node) { removeNode(node) }, node);
		return model;
	}

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function objFrom(obj, array) {
		var key = array.shift();
		var val = obj[key];

		return array.length && isDefined(val) ?
			objFrom(val, array) :
			val ;
	}

	function objFromPath(obj, path) {
		var array = splitPath(path);
		
		return array.length === 1 ?
			obj[path] :
			objFrom(obj, array) ;
	}

	function objTo(root, array, obj) {
		var key = array[0];
		
		return array.length > 1 ?
			objTo(isObject(root[key]) ? root[key] : (root[key] = {}), array.slice(1), obj) :
			(root[key] = obj) ;
	}

	function objToPath(root, path, obj) {
		var array = splitPath(path);

		return array.length === 1 ?
			(root[path] = obj) :
			objTo(root, array, obj);
	}

	function findByPath(obj, path) {
		if (!isDefined(obj) || !isDefined(path) || path === '') { return; }
		
		return path === '.' ?
			obj :
			objFromPath(obj, path) ;
	}

	function setupCollection(node, model, ctrl) {
		var modelName = node.getAttribute('data-model');
		var endNode = document.createComment(' [Sparky] data-model="' + modelName + '" ');
		var nodes = [];
		var sparkies = [];
		var cache = [];

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
			}

			if (Sparky.debug) {
				console.log('[Sparky] collection rendered (length: ' + model.length + ' time: ' + (+new Date() - t) + 'ms)');
			}
		}

		// Put the marker node in place
		insertNode(node, endNode);

		// Remove the node
		removeNode(node);

		// Remove anything that would make Sparky to bind the node
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

			trigger: function() {
				var l = sparkies.length;
				var n = -1;
				while (++n < l) {
					sparkies[n].trigger.apply(sparkies[n], arguments);
				}
			}
		};
	}

	function nodeToText(node) {
		return [
			'<',
			node.tagName.toLowerCase(),
			(node.className ? ' class="' + node.className + '"' : ''),
			(node.getAttribute('href') ? ' href="' + node.getAttribute('href') + '"' : ''),
			(node.getAttribute('data-ctrl') ? ' data-ctrl="' + node.getAttribute('data-ctrl') + '"' : ''),
			(node.getAttribute('data-model') ? ' data-model="' + node.getAttribute('data-model') + '"' : ''),
			(node.id ? ' id="' + node.id + '"' : ''),
			'>'
		].join('');
	}

	function slaveSparky(sparky1, sparky2) {
		// When sparky is ready, overwrite the trigger method
		// to trigger all events on the slave sparky immediately
		// following the trigger on the master.
		sparky1.on('ready', function() {
			sparky1.on(sparky2);
		});

		return sparky2;
	}

	function isAudioParam(object) {
		return window.AudioParam && window.AudioParam.prototype.isPrototypeOf(object);
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
			return objFromPath(scope, property);
		}

		function set(property, value) {
			objToPath(scope, property, value);
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
					throw new Error('[Sparky] No object at relative path \'' + path + '\' of model#' + model.id);
				}

				return slaveSparky(sparky, Sparky(node, data));
			}

			rtag.lastIndex = 0;
			if (rtag.test(path)) {
				
				rtag.lastIndex = 0;
				data = findByPath(scope, rtag.exec(path)[1]);

				if (!data) {
					rtag.lastIndex = 0;
					throw new Error('[Sparky] Property \'' + rtag.exec(path)[1] + '\' not in parent scope. ' + nodeToText(node));
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
			console.log('[Sparky] template:', templateId);
		}

		function observe(property, fn) {
			var path = splitPath(property);
			var obj = scope;
			var prop = property;

			if (path.length > 1) {
				prop = path.pop();
				obj = objFrom(scope, path);
			}

			Sparky.observe(obj, prop, fn);

			if (templateFragment) {
				Sparky.observe(obj, prop, insert);
			}
		}

		function unobserve(property, fn) {
			var path = splitPath(property);
			var obj = scope;
			var prop = property;

			if (path.length > 1) {
				prop = path.pop();
				obj = objFrom(scope, path);
			}

			Sparky.unobserve(obj, prop, fn);
		}

		// The bind function returns an array of unbind functions.
		sparky.detach = unbind = Sparky.bind(templateFragment || node, observe, unobserve, get, set, create);

		sparky.trigger('ready');
	}

	// The Sparky function

	function Sparky(node, model, ctrl, loop) {
		if (Sparky.debug === 'verbose') {
			console.log('Sparky', '\n', 'node', node, '\n', 'model', model, '\n', 'ctrl', ctrl && ctrl.name, '\n', 'loop', loop);
		}

		var sparky, modelPath, ctrlPath, tag, id;

		if (loop !== false) {
			loop = true;
		}

		// If node is a string, assume it is the id of a template,
		// and if it is not a template, assume it is the id of a
		// node in the DOM. 
		if (typeof node === 'string') {
			id = node;
			node = Sparky.template(id);

			if (!node) {
				node = document.getElementById(id);
			}
		}

		// Where model is not defined look for the data-model
		// attribute. Docuent fragments do not have a getAttribute
		// method.
		if (!isDefined(model) && node.getAttribute) {
			modelPath = node.getAttribute('data-model');
			
			if (isDefined(modelPath)) {
				model = findByPath(Sparky.data, modelPath);
				
				if (model === undefined) {
					throw new Error('[Sparky] ' + nodeToText(node) + ' model not found in Sparky.data');
				}
			}
		}

		// If ctrl is a string, assume it is the name of a controller
		if (typeof ctrl === 'string') {
			ctrl = Sparky.ctrl[ctrl];
		}

		// Where ctrl is not defined look for the data-ctrl
		// attribute. Docuent fragments do not have a getAttribute
		// method.
		if (!ctrl && node.getAttribute) {
			ctrlPath = node.getAttribute('data-ctrl');
			tag = node.tagName.toLowerCase();
			
			ctrl = isDefined(ctrlPath) ? findByPath(Sparky.ctrl, ctrlPath) :
				defaultCtrl ;
		}

		// Where model is an array or array-like object with a length property,
		// but not a function, set up Sparky to clone node for every object in
		// the array.
		if (loop && model && model.length !== undefined && typeof model !== 'function') {
			return setupCollection(node, model, ctrl);
		}

		if (Sparky.debug === 'verbose') {
			console.groupCollapsed('[Sparky] Sparky(', node, ',',
				(model && model.id && ('model#' + model.id) || 'model'), ',',
				(ctrl && 'ctrl'), ')'
			);
		}

		sparky = Object.create(prototype);
		setupSparky(sparky, node, model, ctrl);

		if (Sparky.debug === 'verbose') { console.groupEnd(); }

		return sparky;
	}

	Sparky.debug        = false;
	Sparky.config       = {};
	Sparky.settings     = {};
	Sparky.data         = {};
	Sparky.ctrl         = {};
	Sparky.mixin        = ns.mixin || (ns.mixin = {});
	Sparky.Collection   = ns.Collection;
	Sparky.templates    = templates;
	Sparky.features     = features;
	Sparky.template     = fetchTemplate;
	Sparky.extend       = extend;
	Sparky.svgNamespace = "http://www.w3.org/2000/svg";
	Sparky.prototype    = prototype;
 
	ns.Sparky = Sparky;
})(window);



// Sparky onload
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

		if (Sparky.debug) { console.log('[Sparky] DOM nodes to initialise:', array); }

		array.forEach(function(node) {
			Sparky(node);
		});
		
		window.requestAnimationFrame(function sparkyready() {
			doc.trigger('sparkyready');
		});
		
		if (window.console) { console.log('[Sparky] DOM initialised in ' + (Date.now() - start) + 'ms'); }
	});
})(jQuery, Sparky);

(function(Sparky) {
	"use strict";

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
		if (Sparky.debug) { console.log('[Sparky] Ooo. Lucky you, using Object.observe and WeakMap.'); }

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
					console.warn('[Sparky] Are you trying to observe an array?. Sparky is going to observe it by polling. You may want to use a Sparky.Collection() to avoid this.');
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
// DOM Binder
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

	// For debugging
	var attributes = [
		'href',
		'title',
		'id',
		'for',
		'style',
		'src',
		'alt',
		'min',
		'max'
	];
	
	var xlink = 'http://www.w3.org/1999/xlink';
	var xsvg  = 'http://www.w3.org/2000/svg';

	window.xlink = xlink;
	window.xsvg = xsvg;

	// Matches a sparky template tag, capturing (tag name, filter string)
	var rname   = /(\{\{\{?)\s*([\w\-\.\[\]]+)\s*(?:\|([^\}]+))?\s*\}\}\}?/g;

	// Matches filter string, capturing (filter name, filter parameter string)
	var rfilter = /\s*([a-zA-Z0-9_\-]+)\s*(?:\:(.+))?/;

	var filterCache = {};

	var nodeTypes = {
	    	1: domNode,
	    	3: textNode,
	    	11: fragmentNode
	    };

	var empty = [];

	var changeEvent = new CustomEvent('valuechange', { bubbles: true });

	var tags = {
	    	input: function(node, name, bind, unbind, get, set, create, unobservers) {
	    		var prop = (rname.exec(node.name) || empty)[2];

	    		// Only bind to fields that have a sparky {{tag}} in their
	    		// name attribute.
	    		if (!prop) { return; }

	    		var value1 = get(prop);
	    		var value2 = normalise(node.getAttribute('value'));
	    		var flag = false;
	    		var throttle, change;

	    		if (node.type === 'checkbox') {
	    			// If the model property does not yet exist and this input
	    			// is checked, set model property from node's value.
	    			if (node.checked && !isDefined(value1)) {
	    				set(prop, value2);
	    			}
	    			
	    			throttle = Sparky.Throttle(function setChecked() {
	    				node.checked = node.value === (get(prop) + '');
	    				node.dispatchEvent(changeEvent);
	    			});
	    			
	    			bind(prop, throttle);
	    			
	    			change = function change(e) {
	    				set(prop, node.checked ? normalise(node.value) : undefined);
	    			};
	    			
	    			node.addEventListener('change', change);
	    		}
	    		else if (node.type === 'radio') {
	    			// If the model property does not yet exist and this input
	    			// is checked, set model property from node's value.
	    			if (!isDefined(value1) && node.checked) {
	    				set(prop, value2);
	    			}
	    			
	    			throttle = Sparky.Throttle(function setChecked() {
	    				node.checked = node.value === (get(prop) + '');
	    				node.dispatchEvent(changeEvent);
	    			});
	    			
	    			bind(prop, throttle);
	    			
	    			change = function change(e) {
	    				if (node.checked) { set(prop, normalise(node.value)); }
	    			};
	    			
	    			node.addEventListener('change', change);
	    		}
	    		else {
	    			change = function change() {
	    				set(prop, normalise(node.value));
	    			}

	    			// Where the node has a value attribute and the model does
	    			// not have value for the named property, give the model the
	    			// node's value
	    			if (value2 && !isDefined(value1)) {
	    				change();
	    			}

	    			throttle = Sparky.Throttle(function setValue() {
	    				var val = get(prop);
	    				var value = isDefined(val) ? val : '' ;

	    				// Avoid setting where the node already has this value, that
	    				// causes the cursor to jump in text fields
	    				if (node.value !== (value + '')) {
	    					node.value = value;
	    					node.dispatchEvent(changeEvent);
	    				}
	    			});

	    			bind(prop, throttle);

	    			node.addEventListener('change', change);
	    			node.addEventListener('input', change);
	    		}
	    		
	    		unobservers.push(function() {
	    			unbind(prop, throttle);
	    			throttle.cancel();
	    			node.removeEventListener('change', change);
	    			node.removeEventListener('input', change);
	    		});
	    	},
	    	
	    	select: function(node, name, bind, unbind, get, set, create, unobservers) {
	    		bindNodes(node, bind, unbind, get, set, create, unobservers);

	    		var prop = (rname.exec(node.name) || empty)[2];

	    		// Only bind to fields that have a sparky {{tag}} in their
	    		// name attribute.
	    		if (!prop) { return; }

	    		var value = get(prop);

	    		var change = function change(e) {
	    		    	set(prop, normalise(node.value));
	    		    };

	    		// If the model property does not yet exist, set it from the
	    		// node's value.
	    		if (!isDefined(value)) {
	    			change();
	    		}

	    		var throttle = Sparky.Throttle(function setValue() {
	    			var value = get(prop);
	    			node.value = isDefined(value) ? value : '' ;
	    			node.dispatchEvent(changeEvent);
	    		});

	    		bind(prop, throttle);

	    		node.addEventListener('change', change);

	    		unobservers.push(function() {
	    			unbind(prop, throttle);
	    			throttle.cancel();
	    			node.removeEventListener('change', change);
	    		});
	    	},

	    	option: function(node, name, bind, unbind, get, set, create, unobservers) {
	    		bindAttributes(node, bind, unbind, get, unobservers, ['value']);
	    		bindNodes(node, bind, unbind, get, set, create, unobservers);
	    	},

	    	textarea: function(node, prop, bind, unbind, get, set, create, unobservers) {
	    		var prop = (rname.exec(node.name) || empty)[2];
	    		
	    		// Only bind to fields that have a sparky {{tag}} in their
	    		// name attribute.
	    		if (!prop) { return; }

	    		var value1 = get(prop);
	    		var value2 = node.value;
	    		var change = function change(e) {
	    			set(prop, node.value);
	    		};

	    		// If the model property does not yet exist and this input
	    		// has value, set model property from node's value.
	    		if (!isDefined(value1) && value2) {
	    			change();
	    		}

	    		var throttle = Sparky.Throttle(function setValue() {
	    			var value = get(prop);

	    			// Avoid setting where the node already has this value, that
	    			// causes the cursor to jump in text fields
	    			if (node.value !== (value + '')) {
	    				node.value = isDefined(value) ? value : '' ;
	    				node.dispatchEvent(changeEvent);
	    			}
	    		});

	    		bind(prop, throttle);

	    		node.addEventListener('change', change);

	    		unobservers.push(function() {
	    			unbind(prop, throttle);
	    			throttle.cancel();
	    			node.removeEventListener('change', change);
	    		});
	    	}
	    };

	function noop() {}

	function call(fn) {
		fn();
	}

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function normalise(value) {
		// window.isNaN() coerces non-empty strings to numbers before asking if
		// they are NaN. Number.isNaN() (ES6) does not, so beware.
		return value === '' || isNaN(value) ? value : parseFloat(value) ;
	}

	function domNode(node, bind, unbind, get, set, create) {
		var unobservers = [];
		var tag = node.tagName.toLowerCase();
		//var isSVG = node instanceof SVGElement;

		if (Sparky.debug === 'verbose') {
			console.log('[Sparky] <' + tag + '>, children:', node.childNodes.length, Array.prototype.slice.apply(node.childNodes));
		}
		
		bindClass(node, bind, unbind, get, unobservers);
		bindAttributes(node, bind, unbind, get, unobservers, attributes);

		// Set up special binding for certain elements like form inputs
		if (tags[tag]) {
			tags[tag](node, node.name, bind, unbind, get, set, create, unobservers);
		}

		// Or sparkify the child nodes
		else {
			bindNodes(node, bind, unbind, get, set, create, unobservers);
		}

		return unobservers;
	}

	function textNode(node, bind, unbind, get, set, create) {
		var detachFn = observeProperties(node.nodeValue, bind, unbind, get, function(text) {
			node.nodeValue = text;
		});

		return [detachFn];
	}

	function fragmentNode(node, bind, unbind, get, set, create) {
		var unobservers = [];
		
		bindNodes(node, bind, unbind, get, set, create, unobservers);
		
		return unobservers;
	}

	function bindNodes(node, bind, unbind, get, set, create, unobservers) {
		var nodes = [];
		var n = -1;
		var l, child, sparky;

		// childNodes is a live list, and we don't want it to be because we may
		// be about to modify the DOM. Copy it.
		nodes.push.apply(nodes, node.childNodes);
		l = nodes.length;
		
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
			else if (nodeTypes[child.nodeType]) {
				unobservers.push.apply(unobservers, nodeTypes[child.nodeType](child, bind, unbind, get, set, create));
			}
		}
	}

	function getClassList(node) {
		return node.classList || node.className.trim().split(/\s+/);
	}

	function updateClassSVG(node, text) {
		// Trying to use className sets a bunch of other
		// attributes on the node, bizarrely.
		node.setAttribute('class', text);
	}

	function updateClassHTML(node, text) {
		node.className = text;
	}

	function updateAttributeSVG(node, attribute, value) {
		node.setAttributeNS(xlink, attribute, value);
	}

	function updateAttributeHTML(node, attribute, value) {
		node.setAttribute(attribute, value);
	}

	function bindClass(node, bind, unbind, get, unobservers) {
		var value = node.getAttribute('class');

		if (!value) { return; }

		var update = node instanceof SVGElement ?
				updateClassSVG.bind(this, node) :
				updateClassHTML.bind(this, node) ;

		// TODO: only replace classes we've previously set here
		unobservers.push(observeProperties(value, bind, unbind, get, update));
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
		    	node.getAttributeNS(xlink, attribute) :
		    	node.getAttribute(attribute) ;
		var update;

		if (!isDefined(value) || value === '') { return; }

		update = isSVG ?
			updateAttributeSVG.bind(this, node, attribute) :
			updateAttributeHTML.bind(this, node, attribute) ;

		unobservers.push(observeProperties(value, bind, unbind, get, update));
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
				throw new Error('[Sparky] filter \'' + filters[n].name + '\' is not a Sparky filter');
			}

			if (Sparky.debug === 'filter') {
				console.log('[Sparky] filter:', filters[n].name, 'value:', word, 'args:', filters[n].args);
			}

			args = filters[n].args;
			args[0] = word;
			word = filters[n].fn.apply(Sparky, args);
		}

		return word;
	}

	function extractProperties(str) {
		var properties = [];

		str.replace(rname, function($0, $1, $2){
			// And properties that are to be live updated,
			// and make sure properties are only added once.
			if ($1.length === 2 && properties.indexOf($2) === -1) {
				properties.push($2);
			}
		});

		return properties;
	}

	function observeProperties(text, bind, unbind, get, fn) {
		var properties = extractProperties(text);

		function replaceText($0, $1, $2, $3) {
			var word = get($2);
			var output = !isDefined(word) ? '' :
				$3 ? applyFilters(word, $3) :
				word ;

			return output;
		}

		function update() {
			
			fn(text.replace(rname, replaceText));
		}

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

	function traverse(node, observe, unobserve, get, set, create) {
		// Assume this is a DOM node, and set the binder off. The
		// binder returns an array of unobserve functions that
		// should be kept around in case the DOM element is removed
		// and the bindings should be thrown away.
		var unobservers = nodeTypes[node.nodeType](node, observe, unobserve, get, set, create);

		return function unbind() {
			unobservers.forEach(call);
		};
	}

	Sparky.bind = traverse;
	Sparky.attributes = attributes;
})(window.Sparky || require('sparky'));

(function() {
	"use strict";
	
	var pow = Math.pow;

	var root2 = Math.sqrt(2);
	
	var n2p1 = pow(2, 0.5);
	var n2p2 = 2;
	var n2p3 = pow(2, 1.5);
	var n2p4 = pow(2, 2);
	var n2p5 = pow(2, 2.5);
	
	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function log(n, base) {
		var divider = base ? Math.log(base) : Math.LN10;
		return Math.log(n) / divider;
	}

	function getName(node) {
		return node.name.replace('{{', '').replace('}}', '');
	}

	function normalise(value, min, max) {
		return (value - min) / (max - min);
	}

	function denormalise(value, min, max) {
		return value * (max - min) + min;
	}

	function ready(sparky, node, scope, model, to, from) {
		var name = getName(node);
		var min = node.min ? parseFloat(node.min) : 0 ;
		var max = node.max ? parseFloat(node.max) : 1 ;
		var flag = false;

		function updateScope() {
			var value;

			if (flag) { return; }

			value = denormalise(from(normalise(model[name], min, max)), min, max);

			if (value !== scope[name]) {
				flag = true;
				scope[name] = value;
				flag = false;
			}
		}

		function updateModel() {
			var value;

			if (flag) { return; }

			value = denormalise(to(normalise(scope[name], min, max)), min, max);

			if (value !== model[name]) {
				flag = true;
				model[name] = value;
				flag = false;
			}
		}

		Sparky.observe(model, name, updateScope);
		Sparky.observe(scope, name, updateModel);
		updateScope();

		sparky.on('destroy', function() {
			Sparky.unobserve(model, name, updateScope);
			Sparky.unobserve(scope, name, updateModel);
		});
	};

	function createInputCtrl(to, from) {
		return function(node, model) {
			var scope = Sparky.extend({}, model);
			this.on('ready', ready, node, scope, model, to, from);
			return scope;
		};
	};

	Sparky.ctrl['input-pow-1'] = createInputCtrl(function to(value) {
		return pow(value, n2p1);
	}, function from(value) {
		return pow(value, 1/n2p1);
	});

	Sparky.ctrl['input-pow-3'] = createInputCtrl(function to(value) {
		return pow(value, n2p3);
	}, function from(value) {
		return pow(value, 1/n2p3);
	});

	Sparky.ctrl['input-pow-4'] = createInputCtrl(function to(value) {
		return pow(value, n2p4);
	}, function from(value) {
		return pow(value, 1/n2p4);
	});

	Sparky.ctrl['value-exp-10'] = createInputCtrl(function to(value) {
		return (Math.exp(value * Math.LN10) - 1) / 9;
	}, function from(value) {
		return Math.log(value * 9 + 1) / Math.LN10;
	});

	Sparky.ctrl['value-pow-2'] = createInputCtrl(function to(value) {
		return pow(value, 2);
	}, function from(value) {
		return pow(value, 1/2);
	});

	Sparky.ctrl['value-pow-3'] = createInputCtrl(function to(value) {
		return pow(value, 3);
	}, function from(value) {
		return pow(value, 1/3);
	});


	Sparky.ctrl['value-log'] = function(node, model) {
		var scope = Sparky.extend({}, model);
		var name = getName(node);
		var min = node.min ? parseFloat(node.min) : 0 ;
		var max = node.max ? parseFloat(node.max) : 1 ;
		var ratio = max / min;
		var flag = false;

		if (min <= 0) {
			console.warn('[Sparky] Controller "value-log" cannot accept a value of 0 or lower in the min attribute.', node);
			return scope;
		}

		function updateScope() {
			var value;

			if (flag) { return; }

			value = denormalise(Math.log(model[name] / min) / Math.log(ratio), min, max);

			if (scope[name] !== value) {
				flag = true;
				scope[name] = value;
				flag = false;
			}
		}

		function updateModel() {
			var value;

			if (flag) { return; }

			value = min * Math.pow(ratio, normalise(scope[name], min, max));

			if (model[name] !== value) {
				flag = true;
				model[name] = value;
				flag = false;
			}
		}

		this
		.on('ready', function() {
			Sparky.observe(model, name, updateScope);
			Sparky.observe(scope, name, updateModel);
			updateScope();
		})
		.on('destroy', function() {
			Sparky.unobserve(model, name, updateScope);
			Sparky.unobserve(scope, name, updateModel);
		});

		return scope;
	};
})();

(function() {
	"use strict";

	var n = 0;

	Sparky.ctrl['debug'] = function(node, model) {
		console.log('Sparky DEBUG', n++);
		debugger;
	};
})();


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
		return val !== undefined && val !== null;
	}

	Sparky.filters = {
		add: function(value, n) {
			return parseFloat(value) + n ;
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
				var date = value instanceof Date ? value : new Date(value) ;
				
				return format.replace(rletter, function($0, $1) {
					return formatters[$1](date);
				});
			};
		})(settings),

		decibels: function(value) {
			return 20 * log10(value);
		},

		decimals: function(value, n) {
			return Number.prototype.toFixed.call(value, n);
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
			return Number.prototype.toFixed.call(value, n);
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

		safe: function() {
			
		},

		//safeseq

		slice: function(value) {
			return Array.prototype.slice.apply(value);
		},

		slugify: function(value) {
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
			return value ? truthy : isDefined(falsy) ? falsy : '' ;
		}
	};
})(window.Sparky || require('sparky'));