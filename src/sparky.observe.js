
// Sparky.observe()
// Sparky.unobserve()

(function(Sparky) {
	"use strict";

	function noop() {}
	function isDefined(val) { return val !== undefined && val !== null; }

	function isAudioParam(object) {
		return window.AudioParam && window.AudioParam.prototype.isPrototypeOf(object);
	}

	// Handle paths

	var rpathtrimmer = /^\[|]$/g;
	var rpathsplitter = /\]?\.|\[/g;

	function objFrom(obj, array) {
		var key = array.shift();
		var val = obj[key];

		return array.length === 0 ? obj :
			isDefined(val) ? objFrom(val, array) :
			val ;
	}

	function objTo(root, array, obj) {
		var key = array[0];
		
		return array.length > 1 ?
			objTo(isObject(root[key]) ? root[key] : (root[key] = {}), array.slice(1), obj) :
			(root[key] = obj) ;
	}

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function onChanged(root, array, fn) {
		if (!root || array.length === 0) { return noop; }

		var prop = array.shift();
		var object = root[prop];
		var destroy = onChanged(object, array.slice(), fn);
		var update = array.length === 0 ? fn : function update() {
		    	destroy();
		    	object = root[prop];
		    	destroy = onChanged(object, array.slice(), fn) ;
		    	fn();
		    };

		Sparky.observe(root, prop, update);

		return function unobserve() {
			destroy();
			Sparky.unobserve(root, prop, update);
		};
	}

	function observePath(root, path, fn) {
		var array = splitPath(path);

		//if (Sparky.debug) {
			// Observe path with logs.
			console.log('Sparky: unresolved path "' + path + '"');
			return onChanged(root, array, function(object) {
				console.log('Sparky: resolved path   "' + path + '"');
				fn.apply(this, arguments);
			});
		//}

		// Observe path without logs.
		return onChanged(root, array, fn) ;
	}

	function unobservePath(root, path, fn) {

	}

	function onDefined(root, array, fn) {
		if (array.length === 0) { return fn(root); }

		var object = objFrom(root, array.slice());

		// Where an object exists, return it immediately
		if (object) { return fn(object); }

		// Take the last property off the array
		var prop = array.pop();

		// Recursively look up the path array
		onDefined(root, array, function(object) {
			if (object[prop]) { return fn(object[prop]); }

			// Listen for when the property becomes an object
			Sparky.observe(object, prop, function found() {
				if (!object[prop]) { return; }

				// Stop listening
				Sparky.unobserve(object, prop, found);

				// Return the found object
				return fn(object[prop]);
			});
		});
	}

	function observePathOnce(root, path, fn) {
		var array = splitPath(path);

		if (Sparky.debug) {
			// Observe path with logs.
			console.log('Sparky: unresolved path' + path);
			return onDefined(root, array, function(object) {
				console.log('Sparky: resolved path  ' + path);
				fn(object);
			}) ;
		}

		// Observe path without logs.
		return onDefined(root, array, fn) ;
	}

	function getPath(obj, path) {
		var array = splitPath(path);
		
		return array.length === 1 ?
			obj[path] :
			objFrom(obj, array) ;
	}

	function setPath(root, path, obj) {
		var array = splitPath(path);

		return array.length === 1 ?
			(root[path] = obj) :
			objTo(root, array, obj);
	}

	Sparky.getPath = getPath;
	Sparky.setPath = setPath;
	Sparky.observePath = observePath;
	Sparky.unobservePath = unobservePath;
	Sparky.observePathOnce = observePathOnce;

	// Binding

	function Poll(object, property, fn) {
		var v1 = object[property];
		var active = true;

		function frame() {
			var v2 = object[property];

			if (v1 !== v2) {
				v1 = v2;
				fn();
			}

			if (!active) { return; } 

			window.requestAnimationFrame(frame);
		};

		function cancel() {
			active = false;
		}

		window.requestAnimationFrame(frame);

		return cancel;
	}

	var unpollers = [];

	function poll(object, property, fn) {
		unpollers.push([object, property, fn, Poll(object, property, fn)]);
		return object;
	}
	
	function unpoll(object, property, fn) {
		var n = unpollers.length;
		var unpoller;

		while (n--) {
			unpoller = unpollers[n];

			if (object === unpoller[0] && property === unpoller[1] && fn === unpoller[2]) {
				unpoller[3]();
				unpollers.splice(n, 1);
				return object;
			}
		}

		return object;
	}

	(false && Object.observe && window.WeakMap ? function(Sparky) {
		if (Sparky.debug) { console.log('Sparky: Ooo. Lucky you, using Object.observe and WeakMap.'); }

		var map = new WeakMap();
		var names = [];
		var types = ["add", "update", "delete"];

		function call(fn) {
			fn(this);
		}

		function trigger(change) {
			var properties = this;
			var name = change.name;
			var object = change.object;

			// If this property is in the properties being watched, and we
			// have not already called changes on it, do that now.
			if (properties[name] && names.indexOf(name) === -1) {
				names.push(name);
				fns = properties[name];
				fns.forEach(call, object);
			}
		}

		function triggerAll(changes) {
			names.length = 0;
			changes.forEach(trigger, map[object]);
		}

		function setup(object) {
			var properties = map[object] = {};
			Object.observe(object, triggerAll, types);
			return properties;
		}

		function teardown(object) {
			Object.unobserve(object, triggerAll);
		}

		Sparky.observe = function(object, property, fn) {
			var properties = map[object] || setup(object);
			var fns = properties[property] || (properties[property] = []);
			fns.push(fn);
		};

		Sparky.unobserve = function(object, property, fn) {
			if (!map[object]) { return; }

			var properties = map[object];
			var fns = properties[property];

			if (!fns) { return; }

			var n = fns.length;

			while (n--) { fns.splice(n, 1); }

			if (fns.length === 0) {
				delete properties[property];

				if (Object.keys[properties].length === 0) {
					teardown(object);
				}
			}
		};
	} : function(Sparky) {
		Sparky.observe = function(object, property, fn) {
			// AudioParams objects must be polled, as they cannot be reconfigured
			// to getters/setters, nor can they be Object.observed. And they fail
			// to do both of those completely silently. So we test the scope to see
			// if it is an AudioParam and set the observe and unobserve functions
			// to poll.
			if (isAudioParam(object)) {
				return poll(object, property, fn);
			}

			if (property === 'length') {
				// Observe length and update the DOM on next
				// animation frame if it changes.
				var descriptor = Object.getOwnPropertyDescriptor(object, property);
	
				if (!descriptor.get && !descriptor.configurable) {
					console.warn('Sparky: Are you trying to observe an array?. Sparky is going to observe it by polling. You may want to use a Sparky.Collection() to avoid this.');
					return poll(object, property, fn);
				}
			}

			return observe(object, property, fn);
		};

		Sparky.unobserve = function(object, property, fn) {
			if (isAudioParam(object)) {
				return unpoll(object, property, fn);
			}

			if (property === 'length') {
				var descriptor = Object.getOwnPropertyDescriptor(object, property);
				if (!descriptor.get && !descriptor.configurable) {
					return unpoll(object, property, fn);
				}
			}
	
			return unobserve(object, property, fn);
		};
	})(Sparky)
})(Sparky);
