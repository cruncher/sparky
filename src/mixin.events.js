(function(ns) {
	"use strict";

	var mixin = ns.mixin || (ns.mixin = {});

	var prototype = {};
	var properties = {
	    	'*': {
	    		value: []
	    	}
	    };

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
			object.dependents = Object.defineProperty(object, 'dependents', {
				value: []
			});
		}

		return object.dependents;
	}

	mixin.events = {
		propagate: function(object) {
			var dependents = getDependents(this);

			// Make sure dependents stays unique
			if (dependents.indexOf(object) === -1) {
				dependents.push(object);
			}

			return this;
		},

		// .on(type, fn)
		// 
		// Callback fn is called with this set to the current object
		// and the arguments (target, triggerArgs..., onArgs...).
		on: function(types, fn) {
			var events = getEvents(this);
			var type, item;

			if (typeof types === 'string') {
				types = types.split(/\s+/);
				item = [fn, Array.prototype.slice.call(arguments, 2)];
			}
			else {
				if (types) {
					item = [types, Array.prototype.slice.call(arguments, 1)];
					types = Object.keys(events);
					events['*'].push(item);
				}
				else {
					return this;
				}
			}

			while (type = types.shift()) {
				// If the event has no listener queue, create one using a copy
				// of the all events listener array.
				if (!events[type]) {
					events[type] = events['*'].slice();
				}

				// Store the listener in th queue
				events[type].push(item);
			}

			return this;
		},

		// Remove one or many callbacks. If `context` is null, removes all callbacks
		// with that function. If `callback` is null, removes all callbacks for the
		// event. If `events` is null, removes all bound callbacks for all events.
		off: function(types, fn) {
			var type, calls, list, i, listeners;

			// No events.
			if (!this.events) { return this; }

			// Remove all events from all types.
			if (!(types || fn)) {
				for (type in this.events) {
					this.events[type].length = 0;
					delete this.events[type];
				}

				return this;
			}

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

			// Use a copy of the event list in case it gets mutated while we're
			// triggering the callbacks.
			listeners = (events[type] ?
				events[type] :
				events['*']).slice();

			// Execute event callbacks.
			i = -1;
			l = listeners.length;

			args = Array.prototype.slice.apply(arguments);
			args[0] = target;

			while (++i < l) {
				params = args.concat(listeners[i][1]);
				listeners[i][0].apply(this, params);
			}

			// Propagate to dependents
			var dependents = this.dependents;
			
			if (!dependents) { return this; }

			i = -1;
			l = dependents.length;

			if (typeof e === 'string') {
				// Create an event object
				args[0] = {};
				args[0].type = type;
				args[0].target = target;
			}

			while (++i < l) {
				listeners[i].trigger.apply(listeners[i], args);
			}

			// Return this for chaining
			return this;
		}
	};
})(this);