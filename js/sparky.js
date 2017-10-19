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
	var invoke     = Fn.invoke;
	var noop       = Fn.noop;
	var nothing    = Fn.nothing;
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

			if (DEBUG) { console.log('mounted:', node, fn, template); }

			sparky.token = fn;
			sparky.path  = '';
			return sparky;
		}
	};

	function callReducer(object, fn) {
		fn(object);
		return object;
	}

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
		var input    = this;
		var renderer = nothing;

		Stream.call(this, function Source(notify, stop) {
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
		});


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
			input    = fn.call(this, node, input, params) || input;

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
			input
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
				renderer = createRenderStream(sparky, settings);
				renderer.push(scope);
				input.each(renderer.push);
			});
		}
		else {
			renderer = createRenderStream(sparky, settings);
			input.each(renderer.push);
		}
	}

	Sparky.prototype = Object.create(Stream.prototype);

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

			log: function(node, scopes) {
				var sparky = this;

				// In IE11 and probably below, and possibly Edge, who knows,
				// console.groups can arrive in really weird orders. They
				// are not at all useful for debugging as a result. Rely on
				// console.log.

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
