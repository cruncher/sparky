(function(ns, mixin, undefined) {
	"use strict";

	var debug = false;

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	// Map functions

	function returnArg(arg) {
		return arg;
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

	function findByIndex(collection, id) {
		var index = collection.index;
		var l = collection.length;

		while (l--) {
			if (collection[l][index] === id) {
				return collection[l];
			}
		}
	}

	function findByObject(collection, object) {
		var i = collection.indexOf(object);
		
		if (i === -1) { return; }
		
		return collection[i];
	}

	function add(collection, object) {
		// Add an item, keeping the collection sorted by id.
		var index = collection.index;

		// If the object does not have an index key, push it
		// to the end of the collection.
		if (!isDefined(object[index])) {
			collection.push(object);
			return;
		}

		var l = collection.length;

		while (collection[--l] && (collection[l][index] > object[index] || !isDefined(collection[l][index])));
		collection.splice(l + 1, 0, object);
	}

	function remove(array, obj, i) {
		var found = false;

		if (i === undefined) { i = -1; }

		while (++i < array.length) {
			if (obj === array[i]) {
				array.splice(i, 1);
				--i;
				found = true;
			}
		}
		
		return found;
	}

	function invalidateCaches(collection) {

	}

	function toJSON(collection) {
		return collection.map(toArray);
	}

	function multiarg(fn) {
		return function(data) {
			var n = -1;
			var l = arguments.length;

			invalidateCaches(this);

			while (++n < l) {
				fn.call(this, arguments[n]);
			}

			return this;
		}
	}


	mixin.collection = {
		add: multiarg(function(item) {
			add(this, item);
			this.trigger('add', item);
		}),

		remove: multiarg(function(item) {
			var obj = this.find(item);

			if (!obj) { return; }

			remove(this, obj);
			this.trigger('remove', obj);
		}),

		update: multiarg(function(obj) {
			var item = this.find(obj);

			if (item) {
				extend(item, obj);
				this.trigger('update', item);
			}
			else {
				this.add(obj);
				this.trigger('add', obj);
			}

			return this;
		}),

		find: function(obj) {
			var index = this.index;

			return typeof obj === 'string' || typeof obj === 'number' ?
					findByIndex(this, obj) :
				isDefined(obj[index]) ?
					findByIndex(this, obj[index]) :
					findByObject(this, obj) ;
		},

		contains: function(object) {
			return this.indexOf(object) !== -1;
		},

		get: function(property) {
			// Returns a value if all the objects in the selection
			// have the same value for this property, otherwise
			// returns undefined.
			var n = this.length;

			if (n === 0) { return; }

			while (--n) {
				if (this[n][property] !== this[n - 1][property]) {
					return;
				}
			}

			return this[n][property];
		},
		
		set: function(property, value) {
			if (arguments.length !== 2) {
				if (debug) { console.warn('[tb-app] Can\'t set selection with [property, value]', arguments, '. Don\'t be absurd.'); }
				return;
			}

			// For every object in the selection set property = value.
			var n = this.length;

			while (n--) {
				this[n][property] = value;
			}

			return this;
		},

		toJSON: function() {
			return this.map(returnArg);
		},

		toObject: function(key) {
			var object = {};
			var prop, type;

			while (n--) {
				prop = this[n][key];
				type = typeof prop;

				if (type === 'string' || type === 'number' && prop > -Infinity && prop < Infinity) {
					object[prop] = this[n];
				}
				else {
					console.warn('Collection.toObject() ' + prop + ' cannot be used as a key.');
				}
			}

			return object;
		}
	};

	// Object constructor

	var prototype = extend({}, mixin.events, mixin.set, mixin.array, mixin.collection);
	
	var properties = {
		length: {
			value: 0,
			enumerable: false,
			writable: true,
			configurable: true
		}
	};

	function Collection(data, index) {
		var collection = Object.create(prototype, properties);

		index = index || 'id';

		function byIndex(a, b) {
			return a[index] > b[index] ? 1 : -1 ;
		}

		Object.defineProperties(collection, {
			// Define the name of the property that will be used to sort and
			// index this collection.
			index: { value: index }
		});

		if (data === undefined) {
			data = [];
		}
		else if (!(data instanceof Array)) {
			if (debug) console.log('Scribe: data not an array. Scribe cant do that yet.');
			data = [];
		}

		// Populate the collection
		data.forEach(setValue, collection);

		var length = collection.length = data.length;

		// Sort the collection
		collection.sort(byIndex);

		// Watch the length and delete indexes when the length becomes shorter
		// like a nice array does.
		observe(collection, 'length', function(collection) {
			while (length-- > collection.length) {
				// JIT compiler notes suggest that setting undefined is
				// quicker than deleting a property.
				collection[length] = undefined;
			}

			length = collection.length;
		});

		// Delegate events
		//collection
		//.each(setListeners);

		// Define caches
		//Object.defineProperties(collection, {
		//
		//});

		return collection;
	};

	Collection.prototype = prototype;
	Collection.add = add;
	Collection.remove = remove;

	ns.Collection = Collection;
})(this, this.mixin);
