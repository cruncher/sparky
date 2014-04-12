(function(ns, undefined) {
	"use strict";

	var mixin = ns.mixin || (ns.mixin = {});

	mixin.storage = {
		store: function(name) {
			window.localStorage[name] = JSON.stringify(this);
			return this;
		},
		
		fetch: function(name, overwrite) {
			var data = JSON.parse(window.localStorage[name]);
			var n = data.length;
			
			if (typeof n === 'number') {
				if (!overwrite && this.length > 0) {
					console.log('[mixin.store] Cannot fetch into a non-empty collection.\n' +
					            'Use .fetch(name, true) to overwrite existing data.');
					return this;
				}
				
				while (n--) {
					this[n] = data[n];
				}
				
				this.length = data.length;
			}
			
			return this;
		}
	};
})(this);