(function(ns, undefined) {
	"use strict";

	var mixin = ns.mixin || (ns.mixin = {});

	var prototype = {
	    	get: function() {
	    		// Request from server
	    	},

	    	put: function() {
	    		// Send to server
	    	},

	    	delete: function() {
	    		// Delete object
	    	},

	    	revert: function() {
	    		// Revert to last saved state
	    	}
	    };

	mixin.ajax = {
		get: function(query) {
			var url = this.path;
			
		},

		create: function(data) {
			var objects = this;
			var object = Object.create(prototype, {
				path: {
					get: function() { return objects.path; },
					enumerable: false
				}
			});

			Sparky.extend(object, data);
			this.add(object);

			return object;
		}
	};
})(this);
