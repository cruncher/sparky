(function(window) {
	"use strict";

	var DEBUG     = window.DEBUG;

	var Fn        = window.Fn;
	var dom       = window.dom;
	var mount     = window.mount;

	var debug     = Fn.debug;
	var each      = Fn.each;
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

	var remove    = dom.remove;

	var assign = Object.assign;

	var settings = {
		rtokens: /(\{\[)\s*(.*?)(?:\s*\|\s*(.*?))?\s*(\]\})/g,

		mount: function mount(node) {
			var dataFn = dom.attribute('data-fn', node);

			if (!dataFn) { return; }

			var sparky = Sparky(node);
			var structs = [{
				token: dataFn,
				path:  '',
				render: sparky.push
			}];

			if (DEBUG) { console.log('mounted:', node, structs.length); }

			return structs;
		}
	};

	function resolveFn(node, fn, ctrl, input) {
		// The ctrl list can be a space-separated string of ctrl paths,
		return typeof fn === 'string' ? makeFn(fn, ctrl, input) :
			// a function,
			typeof fn === 'function' ? makeDistributeFn([fn], input) :
			// an array of functions,
			typeof fn === 'object' ? makeDistributeFn(fn, input) :
			// or defined in the data-fn attribute
			node.getAttribute && makeFn(node.getAttribute('data-fn'), ctrl, input) ;
	}

	function makeDistributeFn(list, input) {
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
				result = list[n].call(this, node, input);

				// Returning false interrupts the fn calls.
				if (flag) { return false; }

				// Returning an object sets that object to
				// be used as scope.
				if (result !== undefined) {
					input = result.each ? result : Fn.of(result) ;
				}
			}

			return input;
		};
	}

	function makeDistributeFnFromPaths(paths, ctrls, input) {
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

		return makeDistributeFn(list, input);
	}

	function makeFn(string, ctrls, input) {
		if (!isDefined(string)) {
			return function() { return input; };
		}
		var paths = string.trim().split(Sparky.rspaces);
		return makeDistributeFnFromPaths(paths, ctrls, input);
	}

	function Sparky(node, data) {
		if (!Sparky.prototype.isPrototypeOf(this)) {
			return new Sparky(node);
		}

		node = typeof node === 'string' ? dom(node)[0] : node ;

		var sparky = this;
		var input  = Stream.of();
		var fns    = Sparky.fn;
		var dataFn = dom.attribute('data-fn', node);
		var fn     = makeFn(dataFn, fns, input);

		this.push   = input.push;
		this[0]     = node;
		this.length = 1;

		// If fn is to be called and a stream is returned, we use that.
		var output = fn.call(this, node);

		// A controller returning false is telling us not to do data
		// binding. We can skip the heavy work.
		if (output === false) { return this; }

		this.stop = function() {
			output.stop && output.stop();
			update(null);
			return sparky;
		};

		this.remove = function() {
			each(remove, this);
			return sparky;
		};

		settings.transforms = Sparky.transforms;
		var update = mount(node, settings);
		output.each(update);
	}

	assign(Sparky.prototype, {
		push: noop
	});

	assign(Sparky, {
		fn:         {},
		transforms: {},
		mount:      mount,
		MarkerNode: function MarkerNode(node) {
			// A text (or comment node in DEBUG mode) for marking a position
			// in the DOM tree so it can be swapped out with some content node.

			if (!DEBUG) {
				return dom.create('text', '');
			}

			var attrScope = node && node.getAttribute('data-scope');
			var attrCtrl  = node && node.getAttribute('data-fn');

			return dom.create('comment',
				(attrScope ? ' data-scope="' + attrScope + '"' : '') +
				(attrCtrl ? ' data-fn="' + attrCtrl + '" ' : '')
			);
		}
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