
// Sparky.observe()
// Sparky.unobserve()

(function(window) {
	"use strict";

	// Import

	var Fn        = window.Fn;
	var Sparky    = window.Sparky;
	var observe   = window.observe;
	var unobserve = window.unobserve;

	// Utility functions

	var noop = Fn.noop;
	var isDefined = Fn.isDefined;

	// Handle paths

	var rpathtrimmer = /^\[|\]$/g;
	var rpathsplitter = /\]?(?:\.|\[)/g;
	var rpropselector = /(\w+)=(\w+)/;
	var map = [];

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function findByProperty(array, name, value) {
		// Find first matching object in array
		var n = -1;

		while (++n < array.length) {
			if (array[n] && array[n][name] === value) {
				return array[n];
			}
		}
	}

	function observePath3(root, prop, array, fn, notify) {
		function update() {
			Sparky.logVerbose('path resolved to value:', root[prop]);
			fn(root[prop]);
		}

		Sparky.observe(root, prop, update, notify);

		return function() {
			Sparky.unobserve(root, prop, update);
		};
	}

	function observePath2(root, prop, array, fn, notify) {
		var destroy = noop;
		var object;

		function update() {
			destroy();

			if (typeof object !== 'object' && typeof object !== 'function') {
				destroy = noop;
				if (notify) { fn(); }
			}
			else {
				destroy = observePath1(object, array.slice(), fn, notify) ;
			}
		}

		function updateSelection() {
			var obj = findByProperty(root, selection[1], JSON.parse(selection[2]));
			// Check that object has changed
			if (obj === object) { return; }
			object = obj;
			update();
		}

		function updateProperty() {
			object = root[prop];
			update();
		}

		var selection = rpropselector.exec(prop);

		if (selection) {
			if (!root.on) {
				throw new Error('Sparky: Sparky.observe trying to observe with property selector on a non-collection.')
			}

			root.on('add remove sort', updateSelection);
			updateSelection();
			notify = true;
			return function() {
				destroy();
				root.off('add remove sort', updateSelection);
			};
		}
			
		Sparky.observe(root, prop, updateProperty, true);
		notify = true;
		return function() {
			destroy();
			Sparky.unobserve(root, prop, updateProperty);
		};
	}

	function observePath1(root, array, fn, notify) {
		if (array.length === 0) { return noop; }

		var prop = array.shift();

		return array.length === 0 ?
			observePath3(root, prop, array, fn, notify) :
			observePath2(root, prop, array, fn, notify) ;
	}

	function observePath(root, path, fn, immediate) {
		// If path refers to root object no observation is possible, but where
		// immediate is defined we should call fn with root.
		if (path === '.') {
			if (immediate) { fn(root); }
			return;
		}

		var array = splitPath(path);

		// Observe path without logs.
		var destroy = observePath1(root, array, fn, immediate || false) ;

		// Register this binding in a map
		map.push([root, path, fn, destroy]);
	}

	function observePathOnce(root, path, fn) {
		var value = Fn.getPath(path, root);

		if (isDefined(value)) {
			fn(value);
			return;
		}

		var array   = splitPath(path);
		var destroy = observePath1(root, array, update, false);

		// Hack around the fact that the first call to destroy()
		// is not ready yet, becuase at the point update has been
		// called by the observe recursers, the destroy fn has
		// not been returned yet. TODO: Perhaps make direct returns
		// async to get around this (they would be async if they were
		// using Object.observe).
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

	Sparky.observePath = Sparky.try(observePath, function message(root, path) {
		return 'Sparky: failed to observe path "' + path + '" in object ' + JSON.stringify(root);
	});

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
		}

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

	Sparky.observe = function(object, property, fn, immediate) {
		if (!object) {
			throw new Error('Sparky: Sparky.observe requires an object!', object, property);
		}

		// AudioParams objects must be polled, as they cannot be reconfigured
		// to getters/setters, nor can they be Object.observed. And they fail
		// to do both of those completely silently. So we test the scope to see
		// if it is an AudioParam and set the observe and unobserve functions
		// to poll.
		if (isAudioParam(object)) {
			return poll(object, property, fn);
		}

		var descriptor;

		if (property === 'length') {
			// Observe length and update the DOM on next
			// animation frame if it changes.
			descriptor = Object.getOwnPropertyDescriptor(object, property);

			if (!descriptor.get && !descriptor.configurable) {
				console.warn && console.warn('Sparky: Are you trying to observe an array?. Sparky is going to observe it by polling. You may want to use a Collection() to avoid this.', object, object instanceof Array);
				console.trace && console.trace();
				return poll(object, property, fn);
			}
		}

		observe(object, property, fn);
		if (immediate) { fn(object); }
	};

	Sparky.unobserve = function(object, property, fn) {
		if (isAudioParam(object)) {
			return unpoll(object, property, fn);
		}

		var descriptor;

		if (property === 'length') {
			descriptor = Object.getOwnPropertyDescriptor(object, property);
			if (!descriptor.get && !descriptor.configurable) {
				return unpoll(object, property, fn);
			}
		}

		return unobserve(object, property, fn);
	};
})(this);
