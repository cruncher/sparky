(function(window) {
	"use strict";

	var Fn        = window.Fn;
	var mount     = window.mount;

	var debug     = Fn.debug;
	var getPath   = Fn.getPath;
	var id        = Fn.id;
	var isDefined = Fn.isDefined;
	var overload  = Fn.overload;
	var nothing   = Fn.nothing;
	var noop      = Fn.noop;
	var curry     = Fn.curry;
	var apply     = Fn.apply;
	var get       = Fn.get;
	var set       = Fn.set;
	var each      = Fn.each;

	var assign = Object.assign;

	var settings = {
		rtokens: /(\{\[)\s*(.*?)(?:\s*\|\s*(.*?))?\s*(\]\})/g,

		mount: function mount(child) {
			if (!dom.attribute('data-fn', child)) { return; }

			var sparky = Sparky(child);

			return {
				path: '',
				token: 'Sparky',
				getValue: id,
				render: sparky.push
			};
		}
	};

	function resolveFn(node, fn, ctrl, instream) {
		// The ctrl list can be a space-separated string of ctrl paths,
		return typeof fn === 'string' ? makeFn(fn, ctrl, instream) :
			// a function,
			typeof fn === 'function' ? makeDistributeFn([fn], instream) :
			// an array of functions,
			typeof fn === 'object' ? makeDistributeFn(fn, instream) :
			// or defined in the data-fn attribute
			node.getAttribute && makeFn(node.getAttribute('data-fn'), ctrl, instream) ;
	}

	function makeDistributeFn(list, instream) {
		return function distributeFn(node) {
			// Distributor controller
			var l = list.length;
			var n = -1;
			var result;
			var flag = false;

			// TODO: This is exposes solely so that ctrl
			// 'observe-selected' can function in sound.io.
			// Really naff. Find a better way.
			this.ctrls = list;

			this.interrupt = function interrupt() {
				flag = true;
				return list.slice(n + 1);
			};

			while (++n < l) {
				// Call the list of ctrls, in order.
				result = list[n].call(this, node, instream);

				// Returning false interrupts the fn calls.
				if (flag) { return false; }

				// Returning an object sets that object to
				// be used as scope.
				if (result !== undefined) {
					instream = result.each ? result : Fn.of(result) ;
				}
			}

			return instream;
		};
	}

	function makeDistributeFnFromPaths(paths, ctrls, instream) {
		var list = [];
		var l = paths.length;
		var n = -1;
		var ctrl;

		while (++n < l) {
			ctrl = Fn.getPath(paths[n], ctrls);
			if (!ctrl) {
				throw new Error('Sparky: data-fn "' + paths[n] + '" not found in sparky.fn');
			}

			list.push(ctrl);
		}

		return makeDistributeFn(list, instream);
	}

	function makeFn(string, ctrls, instream) {
		if (!isDefined(string)) {
			return function() { return instream; };
		}
		var paths = string.trim().split(Sparky.rspaces);
		return makeDistributeFnFromPaths(paths, ctrls, instream);
	}

	function Sparky(node, data) {
		if (!Sparky.prototype.isPrototypeOf(this)) {
			return new Sparky(node);
		}

		var instream = Stream.of();
		var fns      = Sparky.fn;
		var dataFn   = dom.attribute('data-fn', node);
		var fn       = makeFn(dataFn, fns, instream);

		// If fn is to be called and a stream is returned, we use that.
		var outstream = fn.call(this, node);

		settings.transforms = Sparky.transforms;

		var update = mount(node, settings);

		if (instream === outstream) {
			this.push = instream.push;
		}

		outstream.each(update);
	}

	assign(Sparky.prototype, {
		push: noop
	});

	assign(Sparky, {
		mount:      mount,

		transforms: {},

		fn:         {}
	});

	Object.defineProperties(Sparky, {
		rtokens: {
			get: function() { return settings.rtokens; },
			enumerable: true,
			configurable: true
		}
	});

	window.Sparky = Sparky;

})(this);