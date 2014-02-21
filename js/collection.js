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

	function findById(collection, id) {
		var l = collection.length;

		while (l--) {
			if (collection[l].id === id) {
				return collection[l];
			}
		}
	}

	function add(collection, item) {
		// Add an item, keeping the collection sorted by id.
		var id = item.id;
		var l = collection.length;

		while (collection[--l] && collection[l].id > id);

		collection.splice(l + 1, 0, item);
	}

	function remove(collection, item) {
		var i = collection.indexOf(item);

		if (i === -1) {
			console.log('Collection.remove(item) - item doesnt exist.');
			return;
		}

		collection.splice(i, 1);
	}

	function invalidateCaches(collection) {

	}

	function toJSON(collection) {
		return collection.map(toArray);
	}

	// Object constructor

	var prototype = {
		add: function(item) {
			invalidateCaches(this);
			add(this, item);
			this.trigger('add', item);
			return this;
		},

		remove: function(item) {
			// A bit weird. Review.
			if (typeof item === 'string') {
				return this.find(item).destroy();
			}

			invalidateCaches(this);
			remove(this, item);
			this.trigger('remove', item);
			return this;
		},

		find: function(id) {
			return findById(this, id);
		},

		toJSON: function() {
			return toJSON(this);
		}
	};

	extend(prototype, mixin.array);
	extend(prototype, mixin.events);

	ns.Collection = function Collection(data) {
		var collection = Object.create(prototype);

		if (!(data instanceof Array)) {
			if (debug) console.log('Scribe: data not an array. Scribe cant do that yet.');
			return;
		}

		// Populate the collection
		collection.length = data.length;

		data
		.slice()
		.sort(byId)
		.forEach(setValue, collection);

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