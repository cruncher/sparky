// Observe and unobserve
// 
// observe(obj, [prop], fn)
// unobserve(obj, [prop], [fn])
// 
// Crudely observes object properties for changes by redefining
// properties of the observable object with setters that fire
// a callback function whenever the property changes.

(function(ns){
	var slice = Array.prototype.slice,
	    toString = Object.prototype.toString;
	
	function isFunction(obj) {
		toString.call(obj) === '[object Function]';
	}
	
	function call(array) {
		// Call observer with stored arguments
		array[0].apply(null, array[1]);
	}
	
	function replaceProperty(obj, prop, observer, call) {
		var v = obj[prop],
		    observers = [observer],
		    descriptor = {
		    	enumerable: true,
		    	configurable: false,
		    	
		    	get: function() {
		    		return v;
		    	},
		    	
		    	set: function(u) {
		    		if (u === v) { return; }
		    		v = u;

		    		observers.forEach(call);
		    	}
		    };
		
		// Store the observers so that future observers can be added.
		descriptor.set.observers = observers;
		
		Object.defineProperty(obj, prop, descriptor);
	}
	
	function observeProperty(obj, prop, fn) {
		var desc = Object.getOwnPropertyDescriptor(obj, prop),
		    args = slice.call(arguments, 0),
		    observer = [fn, args];
		
		// Cut both prop and fn out of the args list
		args.splice(1,2);
		
		// If an observers list is already defined, this property is
		// already being observed, and all we have to do is add our
		// fn to the queue.
		if (desc && desc.set && desc.set.observers) {
			desc.set.observers.push(observer);
			return;
		}
		
		replaceProperty(obj, prop, observer, call);
	}
	
	function observe(obj, prop, fn) {
		var args, key;
		
		// Overload observe to handle observing all properties with
		// the function signature observe(obj, fn).
		if (toString.call(prop) === '[object Function]') {
			fn = prop;
			args = slice.call(arguments, 0);
			args.splice(1, 0, null);
			
			for (prop in obj) {
				args[1] = prop;
				observeProperty.apply(null, args);
			};
			
			return;
		}

		observeProperty.apply(null, arguments);
	}
	
	function unobserve(obj, prop, fn) {
		var desc, observers, index;

		if (prop instanceof Function) {
			fn = prop;
			
			for (prop in obj) {
				unobserve(data, key, fn);
			};
			
			return;
		}
		
		desc = Object.getOwnPropertyDescriptor(obj, prop);
		observers = desc.set && desc.set.observers;

		if (!observers) { return; }
		
		if (fn) {
			// Remove all references to fn
			observers.forEach(function(observer, i, observers) {
				if (observer[0] === fn) {
					observers.splice(i, 1);
				}
			});
		}
		else {
			desc.set.observers.length = 0;
		}
	}
	
	ns.observe = observe;
	ns.unobserve = unobserve;
})(window);