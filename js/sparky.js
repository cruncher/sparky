(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('Sparky      - https://github.com/cruncher/sparky');
})(this);

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

	var append    = dom.append;
	var children  = dom.children;
	var empty     = dom.empty;
	var fragmentFromId = dom.fragmentFromId;
	var fragmentFromTemplate = dom.fragmentFromTemplate;
	var remove    = dom.remove;
	var tag       = dom.tag;


	// Matches:     xxxx: xxx, "xxx", 'xxx'
	var rfn       = /\s*([-\w]+)(?:\s*:\s*((?:"[^"]*"|'[^']*'|[\w-\[\]]*)(?:\s*,\s*(?:"[^"]*"|'[^']*'|[\w-\[\]]*))*))?/;

	var settings = {
		rtokens: /(\{\[)\s*(.*?)(?:\s*\|\s*(.*?))?\s*(\]\})/g,

		mount: function mount(node) {
			var fn       = dom.attribute('data-fn', node);
			var template = dom.attribute('data-template', node);

			if (!fn && !template) { return; }

			var sparky = Sparky(node, undefined, {
				fn: fn,
				template: template
			});

			if (DEBUG) { console.log('mounted:', node); }

			return [{
				token: fn,
				path:  '',
				render: sparky.push
			}];
		}
	};

	function Sparky(node, data, options) {
		if (!Sparky.prototype.isPrototypeOf(this)) {
			return new Sparky(node, data, options);
		}

		node = typeof node === 'string' ? dom(node)[0] : node ;

		var fnstring = options && options.fn || dom.attribute('data-fn', node) || '';
		var calling  = true;

		var sparky   = this;
		var stream   = data ? Stream.of(Observable(data) || data) : Stream.of() ;
		var update   = noop;

		// TODO: Fudge. 
		if (tag(node) === 'template') {
			var fragment = fragmentFromTemplate(node).cloneNode(true);
			assign(this, fragment.childNodes);
			node = children(fragment)[0];
		}
		else {
			this[0] = node;
		}

		this[0]      = node;
		this.length  = 1;

		this.push    = stream.push;

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

		// TEMP: Find a better way to pass these in
		settings.transforms   = Sparky.transforms;
		settings.transformers = Sparky.transformers;

		var template = (options && options.template)
			|| dom.attribute('data-template', node)
			|| '' ;

		stream
		.take(1)
		.each(template ? function(scope) {
			var fragment = fragmentFromId(template);

			if (!fragment) {
				throw new Error('Sparky: data-template="' + template + '" not found in DOM');
			}

			// Replace node content with fragment
			empty(node);
			append(node, fragment);

			// Update
			update = mount(node, settings);
			update(scope);
			stream.each(update);
		} : function(scope) {
			update = mount(node, settings);
			update(scope);
			stream.each(update);
		});
	}

	assign(Sparky.prototype, {
		push: noop,

		remove: function() {
			each(remove, this);
			return this;
		}
	});

	assign(Sparky, {
		fn: {
			get: function(node, stream, params) {
				return stream.map(getPath(params[0]));
			},

			interrupt: function ignore(node, stream) {
				console.log(this.interrupt(), node, stream);
			},

			log: (function(isIE) {
				// Logs nodes, scopes and data.
				return function(node, scopes) {
					var sparky = this;

					// In IE11 and probably below, and possibly Edge, who knows,
					// console.groups can arrive in really weird orders. They
					// are not at all useful for debugging as a result. Rely on
					// console.log.

					function log(scope) {
						console[isIE ? 'log' : 'group']('Sparky: scope', node);
						console.log('data ', sparky.data);
						console.log('scope', scope);
						console.log('fn   ', sparky.fn);
						console[isIE ? 'log' : 'groupEnd']('---');
					}

					console[isIE ? 'log' : 'group']('Sparky: run  ', node);
					console.log('data ', sparky.data);
					console[isIE ? 'log' : 'groupEnd']('---');

					return scopes.tap(log);
				};
			})(
				// Detect IE
				!!(document.all && document.compatMode || window.navigator.msPointerEnabled)
			)
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