(function(object) {
	"use strict";

	var mixin = object.mixin || (object.mixin = {});

	mixin.array = {
		filter:  Array.prototype.filter,
		map:     Array.prototype.map,
		reduce:  Array.prototype.reduce,
		sort:    Array.prototype.sort,
		splice:  Array.prototype.splice,
		some:    Array.prototype.some,
		indexOf: Array.prototype.indexOf,
		each:   function() {
			Array.prototype.forEach.apply(this, arguments);
			return this;
		}
	};
})(window.sparky);