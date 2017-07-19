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
	var get       = Fn.get;
	var set       = Fn.set;
	var each      = Fn.each;

	var remove    = dom.remove;

	var rfn       = /\s*([-\w]+)(?:\(([^)]*)\))?/;

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

	function Sparky(node, data, options) {
		if (!Sparky.prototype.isPrototypeOf(this)) {
			return new Sparky(node);
		}

		node = typeof node === 'string' ?
			dom(node)[0] :
			node ;

		var fnstring = options && options.fn || dom.attribute('data-fn', node) || '';
		var calling  = true;

		var sparky  = this;
		var stream  = data ? Stream.of(data) : Stream.of() ;
		var update  = noop;

		this[0]     = node;
		this.length = 1;

		this.push   = stream.push;

		this.stop = function stop() {
			stream.stop && stream.stop();
			update(null);
			return sparky;
		};

		this.interrupt = function interrupt() {
			calling = false;
			return { fn: fnstring };
		};

		// Parse the fns and params to execute
		var token, fn, params;

		while (token = fnstring.match(rfn)) {
			fn       = Sparky.fn[token[1]];
			params   = token[2] && JSON.parse('[' + token[2].replace(/'/g, '"') + ']');
			fnstring = fnstring.slice(token[0].length);
			stream   = fn.call(this, node, stream, params) || stream;

			// If fns have been interrupted return the sparky without mounting
			if (!calling) { return this; }
		}

		settings.transforms = Sparky.transforms;
		update = mount(node, settings);
		stream.each(update);
	}

	assign(Sparky.prototype, {
		push: noop,

		remove: function() {
			each(remove, this);
			return this;
		}
	});

	assign(Sparky, {
		fn:         {
			get: function(node, stream, params) {
				return stream.map(getPath(params[0]));
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