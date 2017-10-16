(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('Sparky      - https://github.com/cruncher/sparky');
})(this);

(function(window) {
	"use strict";

	var DEBUG      = window.DEBUG;

	var Fn         = window.Fn;
	var Observable = window.Observable;
	var Stream     = window.Stream;
	var dom        = window.dom;
	var mount      = window.mount;

	var assign     = Object.assign;
	var each       = Fn.each;
	var getPath    = Fn.getPath;
	var noop       = Fn.noop;
	var append     = dom.append;
	var children   = dom.children;
	var empty      = dom.empty;
	var fragmentFromId = dom.fragmentFromId;
	var fragmentFromTemplate = dom.fragmentFromTemplate;
	var preventDefault = dom.preventDefault;
	var remove     = dom.remove;
	var tag        = dom.tag;


	// Matches:     xxxx: xxx, "xxx", 'xxx'
	var rfn       = /\s*([-\w]+)(?:\s*:\s*((?:"[^"]*"|'[^']*'|[\w-\[\]]*)(?:\s*,\s*(?:"[^"]*"|'[^']*'|[\w-\[\]]*))*))?/;

	var settings = {
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

	function callReducer(object, fn) {
		fn(object);
		return object;
	}

	function createUpdate(sparky, settings) {
		var updates = [];
		var n = -1;

		while (sparky[++n]) {
			updates.push(mount(sparky[n], settings));
		}

		return function update(scope) {
			return updates.reduce(callReducer, scope);
		};
	}

	function escapeSelector(selector) {
		return selector.replace(/\//g, '\\\/');
	}

	function Sparky(node, data, options) {
		if (!Sparky.prototype.isPrototypeOf(this)) {
			return new Sparky(node, data, options);
		}

		node = typeof node === 'string' ?
			document.querySelector(escapeSelector(node)) :
			node ;

		if (tag(node) === 'template') {
			var fragment = fragmentFromTemplate(node).cloneNode(true);
			var nodes    = fragment.childNodes;
			var n        = -1;

			// assign doesn't seem to work on node collections
			while (nodes[++n]) {
				this[n] = nodes[n];
			}
			this.length = nodes.length;
			node = children(fragment)[0];
		}
		else {
			this[0] = node;
			this.length  = 1;
		}

		var fnstring = options && options.fn || dom.attribute('data-fn', node) || '';
		var calling  = true;
		var sparky   = this;
		var stream   = data ? Stream.of(Observable(data) || data) : Stream.of() ;
		var update   = noop;

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

			if (!fn) {
				throw new Error('Sparky: fn "' + token[1] + '" not found in Sparky.fn');
			}

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

		if (template) {
			stream
			.take(1)
			.each(function(scope) {
				var fragment = fragmentFromId(template);

				if (!fragment) {
					throw new Error('Sparky: data-template="' + template + '" not found in DOM');
				}

				// Replace node content with fragment
				empty(node);
				append(node, fragment);

				// Update
				update = createUpdate(sparky, settings);
				update(scope);
				stream.each(update);
			});
		}
		else {
			update = createUpdate(sparky, settings);
			stream.each(update);
		}
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
			scope: function(node, stream, params) {
				var scope = getPath(params[0], window);

				if (!scope) {
					console.warn('Sparky: no object at path ' + params[0], data.cuts[110]);
					return Fn.of();
				}

				return Fn.of(getPath(params[0], window));
			},

			get: function(node, stream, params) {
				return stream.map(getPath(params[0]));
			},

			ignore: function ignore(node, stream) {
				console.log(this.interrupt(), node, stream);
			},

			prevent: function preventSubmitCtrl(node, stream, params) {
				node.addEventListener(params[0], preventDefault);

				// TODO: Work out how Sparky 2 is to handle teardowns

				//this.on('destroy', function() {
				//	node.removeEventListener('submit', preventDefault);
				//});
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
		rtoken: {
			get: function() { return settings.rtoken; },
			set: function(rtoken) { settings.rtoken = rtoken; },
			enumerable: true,
			configurable: true
		}
	});

	window.Sparky = Sparky;

})(this);
