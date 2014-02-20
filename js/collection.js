(function(object) {
	"use strict";

	var debug = false;
	var extend = object.extend;

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	// Map functions

	function toArray(event) {
		return Array.prototype.slice.call(event, 0);
	}

	// Reduce functions

	function setIndex(object, value, i) {
		object[i] = value;
		return object;
	}

	function addListener(sub, pub) {
		sub
		.on('change', pub.trigger)
		.on('destroy', pub.remove);

		return sub;
	}

	function concat(arr1, arr2) {
		return arr1.concat(arr2);
	}

	// Sort functions

	function byGreater(a, b) {
		return a > b ? 1 : -1 ;
	}
	
	function byId(a, b) {
		return a.id > b.id ? 1 : -1 ;
	}

	// Object functions

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

	function populateBeats(data, beats) {
		var n = data.length;
		var beats = data._beats || [];
		var event, beat;

		beats.length = 0;

		while (n--) {
			event = data[n];

			if (beat !== event.beat) {
				beat = event.beat;
				beats.push(beat);
			}
		}

		return beats.sort(byGreater);
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

	extend(prototype, sparky.mixin.array);
	extend(prototype, sparky.mixin.events);

	object.Collection = function(data) {
		var collection = Object.create(prototype);

		if (!(data instanceof Array)) {
			if (debug) console.log('Scribe: data not an array. Scribe cant do that yet.');
			return;
		}

		data
		.slice()
		.sort(byId)
		.reduce(setIndex, collection);
		
		collection.length = data.length;
		//collection.reduce(addListener, collection)

		// Define caches
		Object.defineProperties(collection, {

		});

		return collection;
	};
})(window.sparky || window);