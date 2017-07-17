(function(window) {
	"use strict";

	var DEBUG     = window.DEBUG;

	var Fn        = window.Fn;
	var dom       = window.dom;
	var mount     = window.mount;

	var assign    = Object.assign;

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

	var rfn       = /\s*([-\w]+)(?:\(([^)]*)\))?/g;

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

	function makeDistributeFn(list, stream) {
		return function distributeFn(node) {
			this.interrupt = function interrupt() {
				stream = false;
				return list.splice(n + 1);
			};

			var n = -1;
			var entry;
			while (entry = list[++n]) {
				// Call the list of fns, in order.
				stream = entry.fn.call(this, node, stream, entry.args) || stream;
			}

			return stream;
		};
	}

	function makeFn(string, fns, stream) {
		if (!isDefined(string)) {
			return function() { return stream; };
		}

		var list = [];
		var n = -1;
		var bits;

		rfn.lastIndex = 0;

		while (bits = rfn.exec(string)) {
			list.push({
				name: bits[1],
				args: bits[2] && JSON.parse('[' + bits[2].replace(/'/g, '"') + ']'),
				fn:   get(bits[1], fns)
			});
		}

		return makeDistributeFn(list, stream);
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
		fn:         {
			get: function(node, stream, args) {
				return stream.map(getPath(args[0]));
			}
		},

		transforms: {},

		mount:      mount,

		MarkerNode: function MarkerNode(node) {
			// A text node, or comment node in DEBUG mode, for marking a
			// position in the DOM tree so it can be swapped out with some
			// content node.

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