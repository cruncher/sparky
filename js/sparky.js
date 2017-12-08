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
	var deprecate  = Fn.deprecate;
	var getPath    = Fn.getPath;
	var invoke     = Fn.invoke;
	var noop       = Fn.noop;
	var nothing    = Fn.nothing;
	var tag        = dom.tag;
	var preventDefault = dom.preventDefault;


	// Matches:     xxxx: xxx, "xxx", 'xxx'
	var rfn       = /\s*([-\w]+)(?:\s*:\s*((?:"[^"]*"|'[^']*'|[\w-\[\]]*)(?:\s*,\s*(?:"[^"]*"|'[^']*'|[\w-\[\]]*))*))?/;

	var settings = {
		// Child mounting function
		mount: function mount(node, options, streams) {
			var fn = dom.attribute(Sparky.attributePrefix + 'fn', node);
			if (!fn) { return; }

			var sparky = new Sparky(node, undefined, { fn: fn, suppressLogs: true });
			//if (DEBUG) { console.log('mounted:', node, fn); }

			// This is just some help for logging mounted tags
			sparky.token = fn;
			sparky.path  = '';

			// Mount must push write streams into streams. A write stream
			// must have the methods .push() and .stop()
			streams.push(sparky);

			// Tell the mounter we've got ths one
			return true;
		}
	};

	function createRenderStream(sparky, settings) {
		var streams = [];
		var n = -1;

		while (sparky[++n]) {
			streams.push(mount(sparky[n], settings));
		}

		// An aggragate stream for all the mounted streams. How many nested
		// streams do we need in this project?
		return {
			stop: function stop() {
				return streams.forEach(invoke('stop', arguments));
			},

			push: function push() {
				return streams.forEach(invoke('push', arguments));
			}
		};
	}

	function escapeSelector(selector) {
		return selector.replace(/\//g, '\\\/');
	}
var i = 0;
	function Sparky(selector, data, options) {
		if (!Sparky.prototype.isPrototypeOf(this)) {
			return new Sparky(selector, data, options);
		}
var id = ++i;
		var node = typeof selector === 'string' ?
			document.querySelector(escapeSelector(selector)) :
			selector ;

		if (!node) {
			throw new Error('Sparky: "' + selector + '" not found.');
		}

		var fnstring = options && options.fn || dom.attribute(Sparky.attributePrefix + 'fn', node) || '';
		var calling  = true;
		var sparky   = this;
		var input    = this;
		var renderer = nothing;

		this[0]      = node;
		this.length  = 1;

		function interrupt() {
			calling = false;
			return { fn: fnstring };
		}

		function render() {
			// TEMP: Find a better way to pass these in
			settings.attributePrefix = Sparky.attributePrefix;
			settings.transforms      = Sparky.transforms;
			settings.transformers    = Sparky.transformers;

			// Launch rendering
			if (DEBUG && !(options && options.suppressLogs)) { console.groupCollapsed('Sparky:', selector); }
			renderer = createRenderStream(sparky, settings);
			input.each(renderer.push);
			if (DEBUG && !(options && options.suppressLogs)) { console.groupEnd(); }
		}

		function start() {
			// Parse the fns and params to execute
			var token = fnstring.match(rfn);

			if (!token) {
				sparky.continue = noop;
				render();
				return sparky;
			}

			var fn = Sparky.fn[token[1]];

			if (!fn) {
				throw new Error('Sparky: fn "' + token[1] + '" not found in Sparky.fn');
			}

			// Gaurantee that params exists, at least.
			var params = token[2] ?
				JSON.parse('[' + token[2].replace(/'/g, '"') + ']') :
				nothing ;

			fnstring   = fnstring.slice(token[0].length);
			input      = fn.call(sparky, node, input, params) || input;

			// If fns have been interrupted calling is false
			return calling && start();
		}

		function Source(notify, stop) {
			this.shift = function() {
				var object;

				if (data !== undefined) {
					object = Observable(data);
					data   = undefined;
					return object;
				}

				//notify('pull');
			};

			this.push = function() {
				data = arguments[arguments.length - 1];
				notify('push');
			};

			this.stop = function() {
				input.stop && input.stop !== sparky.stop && input.stop();
				renderer.stop && renderer.stop();

				// Schedule stop, if data is waiting to be collected make
				// sure we get it
				stop(data ? 1 : 0);
			};
		}

		Stream.call(this, Source);

		this.interrupt = interrupt;
		this.continue  = start;
		start();
	}

	Sparky.prototype = Stream.prototype;

	assign(Sparky, {
		attributePrefix: 'sparky-',

		fn: {
			find: function(node, stream, params) {
				var scope = getPath(params[0], window);

				if (!scope) {
					console.warn('Sparky: scope:path – no object at path ' + params[0]);
					return Fn.of();
				}

				return Fn.of(getPath(params[0], window));
			},

			scope: Fn.deprecate(function(node, stream, params) {
				return Sparky.fn.find.apply(this, arguments);
			}, 'Deprecated Sparky fn scope:path renamed find:path'),

			get: function(node, stream, params) {
				return stream.map(getPath(params[0]));
			},

			if: function(node, stream, params) {
				var name = params[0];
				var mark = Sparky.MarkerNode(node);
				var visible = false;

				// Put the marker in place and remove the node
				dom.before(node, mark);
				dom.remove(node);

				return stream.map(function(scope) {
					var visibility = !!scope[name];

					if(visibility === visible) { return; }
					visible = visibility;

					if (visible) {
						dom.replace(mark, node);
					}
					else {
						dom.replace(node, mark);
					}
				});
			},

			stop: function ignore(node, stream) {
				console.log(this.interrupt(), node, stream);
			},

			ignore: deprecate(function ignore(node, stream) {
				console.log(this.interrupt(), node, stream);
			}, 'Sparky: fn "ignore" renamed "stop".'),

			prevent: function preventSubmitCtrl(node, stream, params) {
				node.addEventListener(params[0], preventDefault);

				this.then(function() {
					node.removeEventListener(params[0], preventDefault);
				});
			},

			log: function(node, scopes) {
				var sparky = this;

				function log(scope) {
					console.group('Sparky: scope', node);
					console.log('data ', sparky.data);
					console.log('scope', scope);
					console.log('fn   ', sparky.fn);
					console.groupEnd('---');
				}

				console.group('Sparky: run  ', node);
				console.log('data ', sparky.data);
				console.groupEnd('---');

				return scopes.tap(log);
			}
		},

		transforms: {},

		MarkerNode: function MarkerNode(node) {
			// A text node, or comment node in DEBUG mode, for marking a
			// position in the DOM tree so it can be swapped out with some
			// content in the future.

			if (!DEBUG) {
				return dom.create('text', '');
			}

			var attrFn  = node && node.getAttribute(Sparky.attributePrefix + 'fn');
			return dom.create('comment', tag(node) + (attrFn ? ' ' + Sparky.attributePrefix + '-fn="' + attrFn + '"' : ''));
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
