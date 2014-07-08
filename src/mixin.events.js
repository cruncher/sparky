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
			object.events = Object.create(prototype, properties);
		}

		return object.events;
	}

	mixin.events = {
		// Events
		on: function(types, fn) {
			var type, args;
			var events = getEvents(this);
			var args = Array.prototype.slice.call(arguments, 2);

			if (!fn) {
				if (types) {
					fn = types;
					events['*'].push([fn, args]);
					types = Object.keys(events);
				}
				else {
					return this;
				}
			}
			else {
				types = types.split(/\s+/);
			}

			while (type = types.shift()) {
				if (!events[type]) {
					events[type] = events['*'].slice();
				}

				events[type].push([fn, args]);
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

		trigger: function(type) {
			var listeners, i, l, args, params;

			if (!this.events) { return this; }

			// Use a copy of the event list in case it gets mutated while we're
			// triggering the callbacks.
			listeners = (this.events[type] ?
				this.events[type] :
				this.events['*']).slice();

			// Execute event callbacks.
			i = -1;
			l = listeners.length;

			args = arguments.length > 1 ?
				Array.prototype.slice.call(arguments, 1) :
				[] ;
			
			while (++i < l) {
				params = args.concat(listeners[i][1]);
				listeners[i][0].apply(this, params);
			}

			return this;
		}
	};
})(this);