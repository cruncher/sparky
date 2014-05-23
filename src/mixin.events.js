(function(ns) {
	"use strict";

	var mixin = ns.mixin || (ns.mixin = {});

	function getEvents(object) {
		return object.events ?
			object.events :
			Object.defineProperty(object, 'events', {
				value: {}
			}).events ;
	}

	mixin.events = {
		// Events
		on: function(types, fn) {
			var type, events, args;

			if (!fn) { return this; }

			types = types.split(/\s+/);
			events = getEvents(this);
			args = Array.prototype.slice.call(arguments, 2);

			while (type = types.shift()) {
				if (events[type]) {
					events[type].push([fn, args]);
				}
				else {
					events[type] = [[fn, args]];
				}
			}

			return this;
		},

		// Remove one or many callbacks. If `context` is null, removes all callbacks
		// with that function. If `callback` is null, removes all callbacks for the
		// event. If `events` is null, removes all bound callbacks for all events.
		off: function(types, fn) {
			var type, calls, list, i;

			// No events.
			if (!this.events) { return this; }

			// Remove all events.
			if (!(types || fn)) {
				for (type in this.events) {
					this.events[type].length = 0;
					delete this.events[type];
				}

				return this;
			}

			types = types ?
				types.split(/\s+/) :
				Object.keys(this.events) ;

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

			if (!this.events || !this.events[type]) { return this; }

			// Use a copy of the event list in case it gets mutated while we're
			// triggering the callbacks.
			listeners = this.events[type].slice();

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