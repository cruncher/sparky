(function(ns, undefined) {
	"use strict";

	var mixin = ns.mixin || (ns.mixin = {});

	function remove(array, obj, i) {
		if (i === undefined) { i = -1; }

		while (++i < array.length) {
			if (obj === array[i]) {
				array.splice(i, 1);
			}
		}
	}

	function unique(array) {
		var n = -1;

		while (++n < array.length) {
			remove(array, array[n], n);
		}
	}

	mixin.array = {
		filter:  Array.prototype.filter,
		map:     Array.prototype.map,
		reduce:  Array.prototype.reduce,
		push:    Array.prototype.push,
		sort:    Array.prototype.sort,
		splice:  Array.prototype.splice,
		some:    Array.prototype.some,
		indexOf: Array.prototype.indexOf,
		forEach: Array.prototype.forEach,
		each: function() {
			Array.prototype.forEach.apply(this, arguments);
			return this;
		},

		add: function(obj) {
			if (this.indefOf(obj) !== -1) { return; }
			this.push(obj);
			return this;
		},

		remove: function(obj) {
			remove(this, obj);
			return this;
		},

		unique: function() {
			unique(this);
			return this;
		},

		length: 0
	};
})(this);
