
// Sparky.observe()
// Sparky.unobserve()

(function(Sparky) {
	"use strict";

	// Handle paths

	var rpathtrimmer = /^\[|]$/g;
	var rpathsplitter = /\]?\.|\[/g;
	var map = [];

	function noop() {}
	function isDefined(val) { return val !== undefined && val !== null; }
	function isObject(obj) { return obj instanceof Object; }

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function objFrom(obj, array) {
		var key = array.shift();
		var val = obj[key];

		return array.length === 0 ? val :
			isDefined(val) ? objFrom(val, array) :
			val ;
	}

	function objTo(root, array, obj) {
		var key = array[0];
		
		return array.length > 1 ?
			objTo(isObject(root[key]) ? root[key] : (root[key] = {}), array.slice(1), obj) :
			(root[key] = obj) ;
	}

	function observePath3(root, prop, array, fn, notify) {
		function update() {
			if (Sparky.debug === 'verbose') {
				console.log('Sparky: path resolved. Value:', root[prop]);
			}

			fn(root[prop]);
		}

		if (notify) { update(); }

		Sparky.observe(root, prop, update);

		return function unobserve() {
			Sparky.unobserve(root, prop, update);
		};
	}

	function observePath2(root, prop, array, fn, notify) {
		var destroy = noop;

		function update() {
			var object = root[prop];

			destroy();

			if (typeof object !== 'object' && typeof object !== 'function') {
				destroy = noop;
				if (notify) { fn(); }
			}
			else {
				destroy = observePath1(object, array.slice(), fn, notify) ;
			}
		};

		Sparky.observe(root, prop, update);
		update();
		notify = true;

		return function unobserve() {
			destroy();
			Sparky.unobserve(root, prop, update);
		};
	}

	function observePath1(root, array, fn, notify) {
		if (array.length === 0) { return noop; }

		var prop = array.shift();

		return array.length === 0 ?
			observePath3(root, prop, array, fn, notify) :
			observePath2(root, prop, array, fn, notify) ;
	}

	function observePath(root, path, fn) {
		var array = splitPath(path);

		// Observe path without logs.
		var destroy = observePath1(root, array, fn, false) ;

		// Register this binding in a map
		map.push([root, path, fn, destroy]);
	}

	function observePathOnce(root, path, fn) {
		var array = splitPath(path);
		var value = objFrom(root, array.slice());

		if (isDefined(value)) {
			fn(value);
			return;
		}

		var destroy = observePath1(root, array, update, false);

		// Hack around the fact that the first call to destroy()
		// is not ready yet, becuase at the point update has been
		// called by the observe recursers, the destroy fn has
		// not been returned yet. TODO: we should make direct returns
		// async to get around this - they would be async if they were
		// using Object.observe after all...
		var hasRun = false;

		function update(value) {
			if (hasRun) { return; }
			if (isDefined(value)) {
				hasRun = true;
				fn(value);
				setTimeout(function() {
					unobservePath(root, path, fn);
				}, 0);
			}
		}

		// Register this binding in a map
		map.push([root, path, fn, destroy]);
	}

	function unobservePath(root, path, fn) {
		var n = map.length;
		var record;

		// Allow for the call signatures (root) and (root, fn)
		if (typeof path !== 'string') {
			fn = path;
			path = undefined;
		}

		while (n--) {
			record = map[n];
			if ((root === record[0]) &&
				(!path || path === record[1]) &&
				(!fn || fn === record[2])) {
				record[3]();
				map.splice(n, 1);
			}
		}
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

	function isAudioParam(object) {
		return window.AudioParam && window.AudioParam.prototype.isPrototypeOf(object);
	}

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
