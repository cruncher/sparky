(function (module) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['jquery'], module);
	} else {
		// Browser globals
		module(jQuery, !!window);
	}
})(function(jQuery, global, undefined){
	
	function returnTrue() { return true; }

	function returnFalse() { return false; }


	function Model(data) {
		this._data = data;
	}
	
	Model.prototype = {
		get: function(prop) {
			return prop === undefined ? this._data : this._data[prop] ;
		},
		
		set: function(prop, value) {
			this._data[prop] = value;
			this.trigger(prop);
		},
		
		toJSON: function () {
			return JSON.stringify(this._data);
		},
		
		saved: returnFalse,
		
		post: function() {
			var self = this;
			
			return jQuery.ajax({
				url: this.url,
				data: this._data,
				type: 'POST'
			})
			.done(function() {
				self.saved = returnTrue;
				self.trigger('post', arguments)
			});
		},
		
		create: function() {
			var self = this;
			
			return jQuery.ajax({
				url: this.url,
				data: this._data,
				type: 'CREATE'
			})
			.done(function() {
				self.saved = returnTrue;
				self.trigger('create', arguments)
			});
		},
	
		// Events
		on: function(types, fn) {
			var type, event;
			
			if (!fn) { return this; }
	
			types = types.split(/\s+/);
			events = this._events || (this._events = {});
			args = Array.prototype.slice.call(arguments, 1);
			args[0] = this;
	
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
	
			// No events, or removing *all* events.
			if (!this._events) { return this; }
		
			if (!(types || fn)) {
				delete this._events;
				return this;
			}
	
			types = types ?
				types.split(/\s+/) :
				Object.keys(this.events) ;
	
			while (type = types.shift()) {
				listeners = this._events[type];
				
				if (!listeners) {
					continue;
				}
				
				if (!fn) {
					delete this._events[type];
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
			var listeners, i, l, args;

			if (!this._events || !this._events[type]) { return this; }
	
			// Use a copy of the event list in case it gets mutated while we're
			// triggering the callbacks.
			listeners = this._events[type].slice();
	
			// Execute event callbacks.
			i = -1;
			l = listeners.length;
			
			while (++i < l) {
				listeners[i][0].apply(this, listeners[i][1]);
			}
	
			return this;
		}
	};
	
	return (window.Model = Model);
});