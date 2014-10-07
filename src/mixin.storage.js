// mixin.storage

(function(ns, undefined) {
	"use strict";

	var mixin = ns.mixin || (ns.mixin = {});

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	mixin.storage = {
		store: function() {
			window.localforage[this.url] = JSON.stringify(this);
			return this;
		},

		retrieve: function(overwrite) {
			var data = window.localforage[this.url];
			
			if (!isDefined(data)) {
				return this;
			}
			
			console.log(this.url, window.localforage[this.url]);
			
			data = JSON.parse(window.localforage[this.url]);
			
			var n = data.length;

			console.log('RETRIEVE', data);

			if (typeof n === 'number') {
				if (!overwrite && this.length > 0) {
					console.log('[mixin.storage] Trying to retrieve storage into a ' +
					            'non-empty collection. Use .retrieve(true) ' +
					            'to force overwrite of existing data.');

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
