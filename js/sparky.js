// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
 
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
 
// MIT license
 
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
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
						this.events[type] = undefined;
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
					this.events[type] = undefined;
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

		    	get: function() {
		    		return v;
		    	},

		    	set: function(u) {
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
		if (desc && desc.set && desc.set.observers) {
			desc.set.observers.push(observer);
			return;
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
})(window.sparky || window);
(function(ns, mixin, undefined) {
	"use strict";

	var debug = false;

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	// Map functions

	function toArray(event) {
		return Array.prototype.slice.call(event, 0);
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
		if (i === undefined) { i = -1; }

		while (++i < array.length) {
			if (obj === array[i]) {
				array.splice(i, 1);
			}
		}
	}

	function invalidateCaches(collection) {

	}

	function toJSON(collection) {
		return collection.map(toArray);
	}

	mixin.collection = {
		add: function(item) {
			invalidateCaches(this);
			add(this, item);
			this.trigger('add', item);
			return this;
		},

		remove: function(item) {
			// A bit weird. Review.
			//if (typeof item === 'string') {
			//	return this.find(item).destroy();
			//}

			item = this.find(item);

			invalidateCaches(this);
			remove(this, item);
			this.trigger('remove', item);
			return this;
		},
		
		update: function(obj) {
			if (isDefined(obj.length)) {
				Array.prototype.forEach.call(obj, this.update, this);
				return;
			}
			
			var item = findByIndex(this, obj[this.index]);
			
			if (item) {
				extend(item, obj);
			}
			else {
				this.add(obj);
			}
			
			return this;
		},

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
			return toJSON(this);
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

	ns.Collection = function Collection(data, index) {
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

	

	function defaultCtrl(node, model, sparky) {
		sparky.on('destroy', function(sparky) { removeNode(node) }, node);
		return model;
	}
	
	function inputCtrl(node, model, sparky) {
		var prop = node.name;
		
		if (!isDefined(prop)) { return; }
		
		var type = node.type;
		
		jQuery(node).on('change', function changeInput(e) {
			var value = type === 'number' || type === 'range' ? parseFloat(e.target.value) :
					type === 'radio' || type === 'checkox' ? e.target.checked && e.target.value :
					e.target.value ;

			model[prop] = value;
		});
	}
	
	function selectCtrl(node, model, sparky) {
		
	}
	
	function textareaCtrl(node, model, sparky) {
		
	}
	
	function objFrom(obj, array) {
		var key = array.shift();
		var val = obj[key];
		
		//if (val === undefined) {
		//	val = obj[key] = {};
		//}
		
		return isDefined(val) && array.length ?
			objFrom(val, array) :
			val ;
	}
	
	function objFromPath(obj, path) {
		return objFrom(obj, path.replace(rbracket, '').split(rpathsplitter));
	}
	
	function objTo(root, array, obj) {
		var key = array[0];
		
		return array.length > 1 ?
			objTo(isObject(root[key]) ? root[key] : (root[key] = {}), array.slice(1), obj) :
			(root[key] = obj) ;
	}
	
	function objToPath(root, path, obj) {
		return objTo(root, path.replace(rbracket, '').split(rpathsplitter), obj);
	}

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

	function findByPath(obj, path) {
		if (!isDefined(obj) || !isDefined(path) || path === '') { return; }
		
		return path === '.' ?
			obj :
			objFromPath(obj, path) ;
	}
	
	function dirtyObserve(obj, prop, fn) {
		var array = obj.slice();
		
		setInterval(function() {
			if (obj.length === array.length) { return; }
			array = obj.slice();
			fn(obj);
		}, 16);
	}
	
	function setupCollection(node, model, ctrl) {
		var startNode = document.createComment(' [Sparky] collection start ');
		var endNode = document.createComment(' [Sparky] collection end ');
		var nodes = [];
		var sparkies = [];
		var modelPath = node.getAttribute('data-model');
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

			nodes.length = model.length;
			sparkies.length = model.length;
			cache.length = model.length;

			while(++n < l) {
				cache[n] = model[n];

				if (map[n]) {
					nodes[n] = map[n][0];
					sparkies[n] = map[n][1];
				}
				else {
					nodes[n] = node.cloneNode(true);
					
					sparkies[n] = Sparky(nodes[n], model[n], ctrl);
					
					if (isDefined(modelPath)) {
						nodes[n].setAttribute('data-model', modelPath + '[' + n + ']');
					}
				}

				insertNode(endNode, nodes[n]);
			}

			if (nodes.length && node.tagName.toLowerCase() === 'option') {
				// We have populated a <select>. It's value may have changed.
				// Trigger a change event to make sure we pick up the change.
				nodes[0].parentNode && nodes[0].parentNode.dispatchEvent(changeEvent);
			}

			if (Sparky.debug) {
				console.log('[Sparky] collection rendered (length: ' + model.length + ' time: ' + (+new Date() - t) + 'ms)');
			}
		}

		// Put the marker nodes in place
		insertNode(node, startNode);
		insertNode(node, endNode);

		// Remove the node
		removeNode(node);

		var throttle = Sparky.Throttle(updateNodes);

		// Observe length and update the DOM on next
		// animation frame if it changes.
		var descriptor = Object.getOwnPropertyDescriptor(model, 'length');

		if (descriptor.get || descriptor.configurable) {
			observe(model, 'length', throttle);
		}
		else {
			if (Sparky.debug) {
				console.warn('[Sparky] Are you trying to observe an array? You should set ' +
				             'Sparky.config.dirtyObserveArrays = true;\n' +
				             '         Dirty observation is not particularly performant. ' +
				             'Consider using a Sparky.Collection() in place of the array.');
			}
			
			if (Sparky.config.dirtyObserveArrays === true) {
				dirtyObserve(model, 'length', throttle);
			}
		}

		// Return a pseudo-sparky that delegates events to all
		// sparkies in the collection.
		//return Object.create(prototype);
		
		return {
			destroy: function() {
				var l = sparkies.length;
				var n = -1;
				while (++n < l) {
					sparkies[n].destroy();
				}
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
		return ['<', node.tagName.toLowerCase(),
			(node.className ?
				' class="' + node.className + '"' :
				''),
			(node.getAttribute('href') ?
				' href="' + node.getAttribute('href') + '"' :
				''),
			(node.getAttribute('data-ctrl') ?
				' data-ctrl="' + node.getAttribute('data-ctrl') + '"' :
				''),
			(node.getAttribute('data-model') ?
				' data-model="' + node.getAttribute('data-model') + '"' :
				''),
			(node.id ?
				' id="' + node.id + '"' :
				''),
			'>'
		].join('');
	}

	function slaveSparky(masterSparky, slaveSparky) {
		// When sparky is ready, overwrite the trigger method
		// to trigger all events on the slave sparky immediately
		// following the trigger on the master.
		masterSparky.on('ready', function() {
			masterSparky.on(slaveSparky);
		});

		return slaveSparky;
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

		function observe(property, fn) {
			Sparky.observe(scope, property, fn);

			if (templateFragment) {
				Sparky.observe(scope, property, insert);
			}
		}

		function unobserve(property, fn) {
			Sparky.unobserve(scope, property, fn);
		}

		function get(property) {
			return scope[property];
		}

		function set(property, value) {
			scope[property] = value;
		}

		function create(node) {
			var path = node.getAttribute('data-model');
			var data;

			if (!isDefined(path)) {
				return slaveSparky(sparky, Sparky(node, scope));
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

		sparky.node = node;

		sparky.destroy = function destroy() {
			this.detach();
			this.detach = noop;

			return this
				.trigger('destroy')
				.off();
		};

		// If a scope object is returned by the ctrl, we use that, otherwise
		// we use the model object as scope, and if that doesn't exist use an
		// empty object.
		scope = ctrl && ctrl(node, model, sparky) || model || {};

		if (Sparky.debug && templateId) {
			console.log('[Sparky] template:', templateId);
		}

		// If there's no model to bind, we need go no further.
		//if (!scope) { return; }

		// The bind function returns an array of unbind functions.
		sparky.detach = unbind = Sparky.bind(templateFragment || node, observe, unobserve, get, set, create);

		sparky.trigger('ready');
	}

	// The Sparky function

	function Sparky(node, model, ctrl) {
		var sparky, modelPath, ctrlPath, tag;
		
		// If node is a string, assume it is the id of a template
		if (typeof node === 'string') {
			node = Sparky.template(node);
		}

		// Where model is not defined look for the data-model attribute
		if (!isDefined(model) && node.getAttribute) {
			modelPath = node.getAttribute('data-model');
			
			if (isDefined(modelPath)) {
				model = findByPath(Sparky.data, modelPath);
				
				if (model === undefined) {
					throw new Error('[Sparky] \'' + modelPath + '\' not found in Sparky.data');
				}
			}
		}

		// If ctrl is a string, assume it is the name of a controller
		if (typeof ctrl === 'string') {
			ctrl = Sparky.ctrl[ctrl];
		}

		// Where ctrl is not defined look for the data-ctrl attribute
		if (!ctrl && node.getAttribute) {
			ctrlPath = node.getAttribute('data-ctrl');
			
			ctrl = isDefined(ctrlPath) ? findByPath(Sparky.ctrl, ctrlPath) :
				(tag = node.tagName.toLowerCase()) === 'input' ? inputCtrl :
				tag === 'select' ? selectCtrl :
				tag === 'textarea' ? textareaCtrl :
				defaultCtrl ;
		}

		// Where model is an array or array-like object with a length property,
		// set up Sparky to clone node for every object in the array.
		if (model && model.length !== undefined) {
			return setupCollection(node, model, ctrl);
		}

		if (Sparky.debug === 'verbose') {
			console.groupCollapsed('[Sparky] Sparky(', node, ',',
				(model && ('model#' + model.id)), ',',
				(ctrl && 'ctrl'), ')'
			);
		}

		sparky = Object.create(prototype);
		setupSparky(sparky, node, model, ctrl);

		if (Sparky.debug === 'verbose') { console.groupEnd(); }

		return sparky;
	}

	Sparky.debug       = false;
	Sparky.config      = {};
	Sparky.settings    = {};
	Sparky.data        = {};
	Sparky.ctrl        = {};
	Sparky.mixin       = ns.mixin || (ns.mixin = {});
	Sparky.observe     = ns.observe;
	Sparky.unobserve   = ns.unobserve;
	Sparky.Throttle    = Throttle;
	Sparky.Collection  = ns.Collection;
	Sparky.templates   = templates;
	Sparky.features    = features;
	Sparky.template    = fetchTemplate;
	Sparky.extend      = extend;
	Sparky.prototype   = prototype;

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
		'value',
		'src',
		'alt'
	];
	
	var xlink = 'http://www.w3.org/1999/xlink';
	var xsvg  = 'http://www.w3.org/2000/svg';

	window.xlink = xlink;
	window.xsvg = xsvg;

	// Matches a sparky template tag, capturing (tag name, filter string)
	var rname   = /\{\{\s*([\w\-]+)\s*(?:\|([^\}]+))?\s*\}\}/g;

	// Matches filter string, capturing (filter name, filter parameter string)
	var rfilter = /\s*([a-zA-Z0-9_\-]+)\s*(?:\:(.+))?/;

	var filterCache = {};

	var types = {
	    	1: domNode,
	    	3: textNode,
	    	11: fragmentNode
	    };
	
	var empty = [];

	var tags = {
	    	input: function(node, name, bind, unbind, get, set) {
	    		var prop = (rname.exec(node.name) || empty)[1];
	    		
	    		//console.log('INPUT', node.type, prop);
	    		
	    		// Only bind to fields that have a sparky {{tag}} in their
	    		// name attribute.
	    		if (!prop) { return; }
	    		
	    		var value1 = get(prop);
	    		var value2 = normalise(node.value);
	    		
	    		if (node.type === 'checkbox') {
	    			// If the model property does not yet exist and this input
	    			// is checked, set model property from node's value.
	    			if (!isDefined(value1) && node.checked) {
	    				set(prop, value2);
	    			}
	    			
	    			bind(prop, function() {
	    				node.checked = get(prop) === value2;
	    			});
	    			
	    			node.addEventListener('change', function(e) {
	    				set(prop, node.checked ? value2 : undefined);
	    			});
	    		}
	    		else if (node.type === 'radio') {
	    			// If the model property does not yet exist and this input
	    			// is checked, set model property from node's value.
	    			if (!isDefined(value1) && node.checked) {
	    				set(prop, value2);
	    			}
	    			
	    			bind(prop, function() {
	    				node.checked = get(prop) === value2;
	    			});
	    			
	    			node.addEventListener('change', function(e) {
	    				if (node.checked) { set(prop, value2); }
	    			});
	    		}
	    		else {
	    			// If the model property does not yet exist and this input
	    			// has value, set model property from node's value.
	    			if (!isDefined(value1) && node.value) {
	    				set(prop, node.value);
	    			}

	    			bind(prop, function() {
	    				var value = get(prop);
	    				node.value = isDefined(value) ? value : '' ;
	    			});

	    			node.addEventListener('change', function(e) {
	    				set(prop, node.value);
	    			});
	    		}
	    	},
	    	
	    	select: function(node, name, bind, unbind, get, set) {
	    		var prop = (rname.exec(node.name) || empty)[1];
	    		
	    		// Only bind to fields that have a sparky {{tag}} in their
	    		// name attribute.
	    		if (!prop) { return; }
	    		
	    		var value = get(prop);
	    		
	    		// If the model property does not yet exist, set it from the
	    		// node's value.
	    		if (!isDefined(value)) {
	    			set(prop, normalise(node.value));
	    		}
	    		
	    		bind(prop, function() {
	    			var value = get(prop);
	    			node.value = isDefined(value) ? value : '' ;
	    		});
	    		
	    		node.addEventListener('change', function(e) {
	    			set(prop, normalise(node.value));
	    		});
	    	},
	    	
	    	textarea: function(node, prop, bind, unbind, get, set) {
	    		var prop = (rname.exec(node.name) || empty)[1];
	    		
	    		//console.log('INPUT', node.type, prop);
	    		
	    		// Only bind to fields that have a sparky {{tag}} in their
	    		// name attribute.
	    		if (!prop) { return; }

	    		var value1 = get(prop);
	    		var value2 = node.value;

	    		// If the model property does not yet exist and this input
	    		// has value, set model property from node's value.
	    		if (!isDefined(value1) && value2) {
	    			set(prop, node.value);
	    		}

	    		bind(prop, function() {
	    			var value = get(prop);
	    			node.value = isDefined(value) ? value : '' ;
	    		});

	    		node.addEventListener('change', function(e) {
	    			console.log('TEXT CHANGE');
	    			set(prop, node.value);
	    		});
	    	}
	    };

	function noop() {}

	function normalise(value) {
		// window.isNaN() coerces non-empty strings to numbers before asking if
		// they are NaN. Number.isNaN() (ES6) does not, so beware.
		return value === '' || isNaN(value) ? value : parseFloat(value) ;
	}

	function call(fn) {
		fn();
	}
	
	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function domNode(node, bind, unbind, get, set, create) {
		var unobservers = [];
		var tag = node.tagName.toLowerCase();
		//var isSVG = node instanceof SVGElement;

		if (Sparky.debug === 'verbose') {
			console.log('[Sparky] <' + tag + '>, children:', node.childNodes.length, Array.prototype.slice.apply(node.childNodes));
		}
		
		bindClass(node, bind, unbind, get, unobservers);
		bindAttributes(node, bind, unbind, get, unobservers);
		bindNodes(node, bind, unbind, get, set, create, unobservers);

		// Set up name-value databinding for form elements 
		if (tags[tag]) {
			tags[tag](node, node.name, bind, unbind, get, set);
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
			else if (types[child.nodeType]) {
				unobservers.push.apply(unobservers, types[child.nodeType](child, bind, unbind, get, set, create));
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

	function bindAttributes(node, bind, unbind, get, unobservers) {
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

	function extractProperties(str) {
		var propertiesCache = {},
		    properties = [];

		str.replace(rname, function($0, $1, $2){
			// Make sure properties are only added once.
			if (!propertiesCache[$1]) {
				propertiesCache[$1] = true;
				properties.push($1);
			}
		});

		return properties;
	}

	function toFilter(filter) {
		var parts = rfilter.exec(filter);

		return {
			name: parts[1],
			fn: Sparky.filters[parts[1]],
			args: parts[2] && JSON.parse('[' + parts[2].replace(/\'/g, '\"') + ']')
		};
	}

	function applyFilters(word, filterString) {
		var filters = filterCache[filterString] || (
		    	filterCache[filterString] = filterString.split('|').map(toFilter)
		    ),
		    l = filters.length,
		    n = -1;

		while (++n < l) {
			if (!filters[n].fn) {
				throw new Error('[Sparky] filter \'' + filters[n].name + '\' is not a Sparky filter');
			}
			
			if (Sparky.debug === 'filter') {
				console.log('[Sparky] filter:', filters[n].name, 'value:', word, 'args:', filters[n].args);
			}
			
			word = filters[n].fn.apply(word, filters[n].args);
		}

		return word;
	}

	function observeProperties(text, bind, unbind, get, fn) {
		var properties = extractProperties(text);

		function replaceText($0, $1, $2) {
			var word = get($1);

			return !isDefined(word) ? '' :
				$2 ? applyFilters(word, $2) :
				word ;
		}

		function update() {
			fn(text.replace(rname, replaceText));
		}

		// Start throttling changes. The first update is immediate.
		var throttle = Sparky.Throttle(update);

		// Observe properties
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
		var unobservers = types[node.nodeType](node, observe, unobserve, get, set, create);

		return function unbind() {
			unobservers.forEach(call);
		};
	}

	Sparky.bind = traverse;
	Sparky.attributes = attributes;
})(window.Sparky || require('sparky'));


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

	function spaces(n) {
		var s = '';
		while (n--) { s += ' ' }
		return s;
	}

	Sparky.filters = {
		add: function(n) {
			return parseFloat(this) + n ;
		},

		capfirst: function() {
			return this.charAt(0).toUpperCase() + string.substring(1);
		},

		cut: function(string) {
			return this.replace(RegExp(string, 'g'), '');
		},

		prepad: function(n) {
			var string = this.toString();
			var l = string.length;
			array.length = 0;
			array.length = n - l;
			array.push(string);
			return l < n ? array.join(' ') : this ;
		},

		postpad: function(n) {
			var string = this.toString();
			var l = string.length;
			var m = parseInt(n, 10);

			return m === l ? this :
				m > l ? string + spaces(m-l) :
				string.substring(0, m) ;
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
			
			return function formatDate(format) {
				var date = this instanceof Date ? this : new Date(this) ;
				
				return format.replace(rletter, function($0, $1) {
					return formatters[$1](date);
				});
			};
		})(settings),

		decimals: Number.prototype.toFixed,

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
			
			return function() {
				text.textContent = this;
				return pre.innerHTML;
			};
		})(),

		//filesizeformat

		first: function() {
			return this[0];
		},

		floatformat: Number.prototype.toFixed,

		//get_digit
		//iriencode

		join: Array.prototype.join,

		json: function() {
			return JSON.stringify(this);
		},

		last: function() {
			return this[this.length - 1];
		},

		length: function() {
			return this.length;
		},

		//length_is
		//linebreaks

		linebreaksbr: (function() {
			var rbreaks = /\n/;
			
			return function() {
				return this.replace(rbreaks, '<br/>')
			};
		})(),

		//linenumbers

		lower: String.prototype.toLowerCase,
		lowercase: String.prototype.toLowerCase,
		
		//make_list 
		
		multiply: function(n) {
			return this * n;
		},
		
		parseint: function() {
			return parseInt(this, 10);
		},
		
		//phone2numeric

		pluralize: function(str1, str2, lang) {
			str1 = str1 || '';
			str2 = str2 || 's';
			
			if (lang === 'fr') {
				return this < 2 ? str1 : str2;
			}
			else {
				return this === 1 ? str1 : str2;
			}
		},

		//pprint

		random: function() {
			return this[Math.floor(Math.random() * this.length)];
		},
		
		//raw
		//removetags
		
		replace: function(str1, str2) {
			return this.replace(RegExp(str1, 'g'), str2);
		},
		
		//reverse

		safe: function() {
			
		},

		//safeseq

		slice: Array.prototype.slice,
		
		slugify: function() {
			return this.trim().toLowerCase().replace(/\W/g, '-').replace(/[_]/g, '-');
		},

		//sort
		//stringformat

		striptags: (function() {
			var rtag = /<(?:[^>'"]|"[^"]*"|'[^']*')*>/g;
			
			return function() {
				return this.replace(rtag, '');
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
			
			return function(tags) {
				if (!tags) {
					return this.replace(rtag, '');
				}
				
				allowedTags = tags.split(' ');
				result = this.replace(rtag, strip);
				allowedTags = false;

				return result;
			};
		})(),

		time: function() {
			
		},

		//timesince
		//timeuntil
		//title

		truncatechars: function(n) {
			return this.length > n ?
				this.length.slice(0, n) + '&hellips;' :
				this ;
		},

		//truncatewords
		//truncatewords_html
		//unique
		
		unordered_list: function() {
			// TODO: Django supports nested lists. 
			var list = this,
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

		yesno: function(truthy, falsy) {
			return this ? truthy : falsy ;
		}
	};
})(window.Sparky || require('sparky'));