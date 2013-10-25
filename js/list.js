// list.js
// 
// A basic array-like list with an observable length property.
// Mutating the list must be done using only the list methods,
// but dot or bracket notation is fine for accessing. There is
// no need for the 'new' keyword:
// 
// List(0,1,2,3); // -> [0,1,2,3]

this.List = (function(proto, undefined){
	return function() {
		var length = 0,
		    list = Object.create(proto, {
		    	length: {
		    		get: function ()  { return length; },
		    		set: function (n) { length = n; },
		    		configurable: true
		    	}
		    });
		
		while (list.length < arguments.length) {
			list.push(arguments[list.length]);
		}
		
		return list;
	};
})(Object.create(Array.prototype, {
	toSource: {
		value: function () {
			return '[' + this.join(', ') + ']';
		}
	}
}));