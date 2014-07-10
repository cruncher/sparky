// .on(types, fn, args...)
//
// Binds a function to be called on events in types.

// .on(fn, args...)
//
// Binds a function to be called on all events.

// .on(object)
//
// Propagates all events from the target object to the
// passed object. Handlers for the passed object are called
// with 'this' set to the target object.

(function(ns) {
	"use strict";

	var mixin = ns.mixin || (ns.mixin = {});
	var eventObject = {};
	var prototype = {};

	function getEvents(object) {
		if (!object.events) {
			Object.defineProperty(object, 'events', {
				value: Object.create(prototype, { '*': { value: [] }})
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
				item = [fn, Array.prototype.slice.call(arguments, 2)];
			}
			else {
				item = [types, Array.prototype.slice.call(arguments, 1)];
				types = Object.keys(events);
				events['*'].push(item);
			}

			while (type = types.shift()) {
				// If the event has no listener queue, create one using a copy
				// of the all events listener array.
				if (!events[type]) {
					events[type] = events['*'].slice();
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
				
				// Include the all '*' listeners
				types.push('*');
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

			// Use a copy of the event list in case it gets mutated while we're
			// triggering the callbacks.
			listeners = (events[type] ?
				events[type] :
				events['*']).slice();

			// Execute event callbacks.
			i = -1;
			l = listeners.length;

			args = Array.prototype.slice.apply(arguments);
			args[0] = this;

			while (++i < l) {
				params = args.concat(listeners[i][1]);
				listeners[i][0].apply(target, params);
			}

			// Propagate to dependents
			var dependents = this.dependents;
			
			if (!dependents) { return this; }

			i = -1;
			l = dependents.length;

			if (typeof e === 'string') {
				// Prepare the event object. It's ok to reuse a single object,
				// as trigger calls are synchronous, and the object is internal,
				// it does not get exposed.
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