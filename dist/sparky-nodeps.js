(function(window) {
	"use strict";

	var DEBUG      = window.DEBUG;

	var Fn         = window.Fn;
	var Observable = window.Observable;
	var Stream     = window.Stream;
	var dom        = window.dom;

	var assign     = Object.assign;
	var attribute  = dom.attribute;
	var compose    = Fn.compose;
	var curry      = Fn.curry;
	var get        = Fn.get;
	var id         = Fn.id;
	var isDefined  = Fn.isDefined;
	var isNaN      = Number.isNaN;
	var nothing    = Fn.nothing;
	var noop       = Fn.noop;
	var overload   = Fn.overload;
	var pipe       = Fn.pipe;
	var set        = Fn.set;
	var setPath    = Fn.setPath;
	var toType     = Fn.toType;


	// Matches tags plus any directly adjacent text
	//var rclasstagstemplate = /[^\s]*{{0}}[^\}]+{{1}}[^\s]*/g;
	//var rclasstags;

	// Matches filter string, capturing (filter name, filter parameter string)
	//var rfilter = /\s*([a-zA-Z0-9_\-]+)\s*(?::(.+))?/;

	// Matches anything with a space
	var rspaces = /\s+/;

	// Matches anything that contains a non-space character
	var rtext = /\S/;

	// Matches the arguments list in the result of a fn.toString()
	var rarguments = /function(?:\s+\w+)?\s*(\([\w,\s]*\))/;

	var settings = {
		attributePrefix: 'data-',
		mount:           noop,
		transforms:      {},
		transformers:    {},
		rtoken:          /(\{\[)\s*(.*?)(?:\s*(\|.*?))?\s*(\]\})/g
	};

	function addClasses(classList, text) {
		var classes = toRenderString(text).trim().split(rspaces);
		classList.add.apply(classList, classes);
	}

	function removeClasses(classList, text) {
		var classes = toRenderString(text).trim().split(rspaces);
		classList.remove.apply(classList, classes);
	}


	// Transform

	var rtransform = /\|\s*([\w\-]+)\s*(?::([^|]+))?/g;

	function Transform(transforms, transformers, string) {
		if (!string) { return id; }

		var fns = [];
		var token, name, fn, args;

		rtransform.lastIndex = 0;

		while (
			rtransform.lastIndex < string.length
			&& (token = rtransform.exec(string))
		) {
			name = token[1];
			fn   = transformers[name] ? transformers[name].tx : transforms[name] ;

			if (!fn) {
				throw new Error('mount:  transform "' + name + '" not found');
			}

			if (token[2]) {
				args = JSON.parse('[' + token[2].replace(/'/g, '"') + ']');
				fns.push(fn.apply(null, args));
			}
			else {
				fns.push(fn);
			}

			if (!(typeof fns[fns.length - 1] === 'function')) {
				throw new Error('mount:  transform "' + name + '" not resulting in fn');
			}
		}

		return pipe.apply(null, fns);
	}

	function InverseTransform(transformers, string) {
		if (!string) { return id; }

		var fns = [];
		var token, name, fn, args;

		rtransform.lastIndex = 0;

		while (
			rtransform.lastIndex < string.length
			&& (token = rtransform.exec(string))
		) {
			name = token[1];
			fn   = transformers[name].ix;

			if (!fn) {
				throw new Error('mount:  transformers "' + name + '" not found');
			}

			if (token[2]) {
				args = JSON.parse('[' + token[2].replace(/'/g, '"') + ']');
				fns.unshift(fn.apply(null, args));
			}
			else {
				fns.unshift(fn);
			}
		}

		return pipe.apply(null, fns);
	}


	// Mount

	var cased = {
		viewbox: 'viewBox'
	};

	var listen = curry(function(node, type, fn) {
		node.addEventListener(type, fn);
		return function unlisten() {
			node.removeEventListener('input', fn);
		};
	}, true);

	var toRenderString = overload(toType, {
		'boolean': function(value) {
			return value + '';
		},

		'function': function(value) {
			// Print function and parameters
			return (value.name || 'function')
				+ (rarguments.exec(value.toString()) || [])[1];
		},

		'number': function(value) {
			// Convert NaN to empty string and Infinity to ∞ symbol
			return Number.isNaN(value) ? '' :
				Number.isFinite(value) ? value + '' :
				value < 0 ? '-∞' : '∞';
		},

		'string': id,

		'symbol': function(value) { return value.toString(); },

		'undefined': function() { return ''; },

		'object': function(value) {
			return value ? JSON.stringify(value) : '';
		},

		'default': JSON.stringify
	});

	function mountStringToken(render, strings, structs, match) {
		var i = strings.length;
		strings.push('');
		structs.push({
			token:  match[0],
			path:   match[2],
			pipe:   match[3],
			render: function renderText(value) {
				strings[i] = toRenderString(value);
				render(strings);
			}
		});
	}

	function mountString(string, render, options, structs) {
		var rtoken  = options.rtoken;
		var i       = rtoken.lastIndex = 0;
		var match   = rtoken.exec(string);

		if (!match) { return nothing; }

		var strings = [];

		var renderStrings = function(strings) {
			render(strings.join(''));
		};

		while (match) {
			if (match.index > i) {
				strings.push(string.slice(i, match.index));
			}

			mountStringToken(renderStrings, strings, structs, match);
			i = rtoken.lastIndex;
			match = rtoken.exec(string);
		}

		if (string.length > i) {
			strings.push(string.slice(i));
		}
	}

	function mountAttributes(names, node, options, structs) {
		var name;

		while (name = names.shift()) {
			mountAttribute(name, node, options, structs);
		}
	}

	function mountAttribute(name, node, options, structs) {
		var text = node.getAttribute(options.attributePrefix + name);

		if (!text) {
			text = node.getAttribute(cased[name] || name);
		}
		else {
			// Remove the sparky attribute, just to keep the DOM clean.
			// Not entirely necessary, perhaps limit to DEBUG mode?
			node.removeAttribute(options.attributePrefix + name);
		}

		return text && mountString(text, function render(value) {
			node.setAttribute(cased[name] || name, value);
		}, options, structs);
	}

	function mountBoolean(name, node, options, structs) {
		var rtoken = options.rtoken;

		// Look for prefixed attributes before attributes.
		//
		// In FF, the disabled attribute is set to the previous value that the
		// element had when the page is refreshed, so it contains no sparky
		// tags. The proper way to address this problem is to set
		// autocomplete="off" on the parent form or on the field.
		//
		// Remember SVG has case sensitive attributes.

		var attr = node.getAttribute(options.attributePrefix + name) || node.getAttribute(name) ;
		if (!attr) { return; }

		rtoken.lastIndex = 0;
		var tokens = rtoken.exec(attr.trim());
		if (!tokens) { return; }

		structs.push({
			token:  attr.trim(),
			path:   tokens[2],
			pipe:   tokens[3],
			render: name in node ?

				// Attribute is also a boolean property
				function render(value) {
					node[name] = !!value;
				} :

				// Attribute is not also a boolean property
				function render(value) {
					if (value) {
						node.setAttribute(name, name);
					}
					else {
						node.removeAttribute(name);
					}
				}
		});
	}

	function mountClass(node, options, structs) {
		var rtoken = options.rtoken;
		var attr   = dom.attribute('class', node);

		// If there are no classes, go no further
		if (!attr) { return; }

		var classes = dom.classes(node);

		// Extract the tags and overwrite the class with remaining text
		var text = attr.replace(rtoken, function($0, $1, $2, $3, $4) {
			var prev    = '';

			structs.push({
				token:  $0,
				path:   $2,
				pipe:   $3,
				render: function render(string) {
					if (prev && rtext.test(prev)) { removeClasses(classes, prev); }
					if (string && rtext.test(string)) { addClasses(classes, string); }
					prev = string;
				}
			});

			return '';
		});

		node.setAttribute('class', text);
	}

	function mountValue(node, options, structs) {
		var string = attribute(options.attributePrefix + 'value', node) ||
			attribute('value', node) ;
		var rtoken = options.rtoken;
		rtoken.lastIndex = 0;

		var match = rtoken.exec(string);
		if (!match) { return; }

		return mountValueByType(node, options, match, structs);
	}

	var types = {
		// element
		1: function mountElement(node, options, structs) {
			var children = node.childNodes;
			var n = -1;
			var child;

			while (child = children[++n]) {
				options.mount(child, options, structs) ||
				mountNode(child, options, structs) ;
			}

			mountClass(node, options, structs);
			mountAttributes(['id', 'title', 'style'], node, options, structs);
			mountTag(node, options, structs);
		},

		// text
		3: function mountText(node, options, structs) {
			mountString(node.nodeValue, set('nodeValue', node), options, structs);
		},

		// comment
		8: noop,

		// document
		9: function mountDocument(node, options, structs) {
			var children = node.childNodes;
			var n = -1;
			var child, renderer;

			while (child = children[++n]) {
				options.mount(child, options, structs) ||
				mountNode(child, options, structs) ;
			}
		},

		// doctype
		10: noop,

		// fragment
		11: function mountFragment(node, options, structs) {
			var children = node.childNodes;
			var n = -1;
			var child;

			while (child = children[++n]) {
				options.mount(child, options, structs) ||
				mountNode(child, options, structs) ;
			}
		}
	};

	var tags = {

		// HTML

		a: function(node, options, structs) {
			mountAttribute('href', node, options, structs);
		},

		button: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
		},

		input: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
			mountBoolean('required', node, options, structs);
			mountAttribute('name', node, options, structs);
			mountInput(node, options, structs);
			mountValue(node, options, structs);
		},

		img: function(node, options, structs) {
			mountAttribute('alt', node, options, structs);
		},

		label: function(node, options, structs) {
			mountAttribute('for', node, options, structs);
		},

		option: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
			mountAttribute('value', node, options, structs);
		},

		select: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
			mountBoolean('required', node, options, structs);
			mountAttribute('name', node, options, structs);
			mountValue(node, options, structs);
		},

		textarea: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
			mountBoolean('required', node, options, structs);
			mountAttribute('name', node, options, structs);
			mountValue(node, options, structs);
		},

		time: function(node, options, structs)  {
			mountAttributes(['datetime'], node, options, structs);
		},

		// SVG

		svg: function(node, options, structs) {
			mountAttributes(['viewbox'], node, options, structs);
		},

		g: function(node, options, structs) {
			mountAttributes(['transform'],  node, options, structs);
		},

		path: function(node, options, structs) {
			mountAttributes(['d', 'transform'], node, options, structs);
		},

		line: function(node, options, structs) {
			mountAttributes(['x1', 'x2', 'y1', 'y2', 'transform'], node, options, structs);
		},

		rect: function(node, options, structs) {
			mountAttributes(['x', 'y', 'width', 'height', 'rx', 'ry', 'transform'], node, options, structs);
		},

		text: function(node, options, structs) {
			mountAttributes(['x', 'y', 'dx', 'dy', 'text-anchor'], node, options, structs);
		},

		use: function(node, options, structs) {
			mountAttributes(['href', 'transform'], node, options, structs);
		},

		default: noop
	};

	var inputs = {
		date: function(node, options, structs) {
			mountAttributes(['min', 'max', 'step'], node, options, structs);
		},

		number: function(node, options, structs) {
			mountAttributes(['min', 'max', 'step'], node, options, structs);
		},

		range: function(node, options, structs) {
			mountAttributes(['min', 'max', 'step'], node, options, structs);
		},

		time: function(node, options, structs) {
			mountAttributes(['min', 'max', 'step'], node, options, structs);
		},

		checkbox: function() {},

		radio: function() {},

		default: noop
	};

	var inputTypes = {
		checkbox: function(node, options, match, structs) {
			structs.push({
				node:  node,
				token: match[0],
				path:  match[2],
				pipe:  match[3],

				read: function read() {
					// TODO: Why do we check attribute here?
					return isDefined(node.getAttribute('value')) ?
						node.checked ? node.value : undefined :
						node.checked ;
				},

				render: function render(value) {
					// Where value is defined check against it, otherwise
					// value is "on", uselessly. Set checked state directly.
					node.checked = isDefined(node.getAttribute('value')) ?
						value === node.value :
						value === true ;
				},

				listen: listen(node, 'change')
			});
		},

		radio: function(node, options, match, structs) {
			structs.push({
				node:  node,
				token: match[0],
				path:  match[2],
				pipe:  match[3],

				read: function read() {
					if (!node.checked) { return; }

					return isDefined(node.getAttribute('value')) ?
						node.value :
						true ;
				},

				render: function render(value) {
					// Where value="" is defined check against it, otherwise
					// value is "on", uselessly: set checked state directly.
					node.checked = isDefined(node.getAttribute('value')) ?
						value === node.value :
						value === true ;
				},

				listen: listen(node, 'change')
			});
		},

		number: function(node, options, match, structs) {
			structs.push({
				node:  node,
				token: match[0],
				path:  match[2],
				pipe:  match[3],

				read: function read() {
					return node.value ? parseFloat(node.value) : undefined ;
				},

				render: function render(value) {
					// Avoid updating with the same value as it sends the cursor to
					// the end of the field (in Chrome, at least).
					if (value === parseFloat(node.value)) { return; }

					node.value = typeof value === 'number' && !isNaN(value) ?
						value :
						'' ;
				},

				listen: listen(node, 'input')
			});
		},

		range: function(node, options, match, structs) {
			structs.push({
				node:  node,
				token: match[0],
				path:  match[2],
				pipe:  match[3],

				read: function read() {
					return node.value ? parseFloat(node.value) : undefined ;
				},

				render: function render(value) {
					// Avoid updating with the same value as it sends the cursor to
					// the end of the field (in Chrome, at least).
					if (value === parseFloat(node.value)) { return; }

					node.value = typeof value === 'number' && !isNaN(value) ?
						value :
						'' ;
				},

				listen: listen(node, 'input')
			});
		},

		default: function(node, options, match, structs) {
			structs.push({
				node:  node,
				token: match[0],
				path:  match[2],
				pipe:  match[3],

				read: function read() {
					return node.value;
				},

				render: function render(value) {
					// Avoid updating with the same value as it sends the cursor to
					// the end of the field (in Chrome, at least).
					if (value === node.value) { return; }

					node.value = typeof value === 'string' ?
						value :
						'' ;
				},

				listen: listen(node, 'input')
			});
		}
	};

	var mountNode        = overload(get('nodeType'), types);
	var mountTag         = overload(dom.tag, tags);
	var mountInput       = overload(get('type'), inputs);
	var mountValueByType = overload(get('type'), inputTypes);

	function setupStruct(struct, options) {
		var transform = Transform(options.transforms, options.transformers, struct.pipe);
		var update    = compose(struct.render, transform);
		var throttle  = Fn.throttle(update, requestAnimationFrame, cancelAnimationFrame);

		struct.update = update;
		struct.push   = throttle;
	}

	function RenderStream(structs, options, node) {
		var old;

		return {
			/* A read-only stream. */
			shift: noop,

			stop: function stopRenderer() {
				structs.forEach(function(struct) {
					struct.unbind && struct.unbind();
					struct.stop && struct.stop();
				});
			},

			push: function pushRenderer(data) {
				if (old === data) { return; }
				old = data;

				if (DEBUG) { console.groupCollapsed('update:', node); }

				var observable = Observable(data);
				var unlisten;

				// Rebind structs
				structs.forEach(function(struct) {
					// Unbind Structs
					struct.unbind && struct.unbind();

					// Set up structs to be pushable. Renderers already have
					// a push method and should not be throttled.
					if (!struct.push) {
						setupStruct(struct, options);
					}

					struct.unbind = struct.unbind || function(data) {
						// If the struct is not a Sparky it's .push() is a
						// throttle and must be cancelled. TODO: dodgy.
						struct.push.cancel && struct.push.cancel();
						struct.input.stop();
						if (struct.listen) { unlisten(); }
					};

					// Rebind struct
					var input = struct.input = Stream.observe(struct.path, observable);
					var value = input.latest().shift();

					// If there is an initial scope render it synchronously, as
					// it is assumed we are already working inside an animation
					// frame
					if (value !== undefined) { (struct.update || struct.push)(value); }

					// Render future scopes at throttled frame rate, where
					// throttle is defined
					input.each(struct.push);

					var set, invert, change;

					// Listen to changes
					if (struct.listen) {
						if (struct.path === '') { console.warn('mount:  Cannot listen to path ""'); };
						set = setPath(struct.path, observable);
						invert = InverseTransform(options.transformers, struct.pipe);
						change = pipe(function() { return struct.read(); }, invert, set);
						unlisten = struct.listen(change);

						if (value === undefined) { change(); }
					}
				});

				if (DEBUG) { console.groupEnd(); }

				return data;
			}
		}
	}

	function mount(node, options) {
		options = assign({}, settings, options);

		if (DEBUG) {
			console.groupCollapsed('mount: ', node);
		}

		var structs = [];
		mountNode(node, options, structs);

		if (DEBUG) {
			console.table(structs, ["token", "path", "pipe"]);
			console.groupEnd();
		}

		return RenderStream(structs, options, node);
	}


	// Export (temporary)
	mount.types  = types;
	mount.tags   = tags;
	mount.inputs = inputs;
	mount.mountAttribute = mountAttribute;
	mount.mountBoolean   = mountBoolean;
	mount.mountInput     = mountInput;
	mount.mountValue     = mountValue;

	// Legacy pre 2.0.3
	mount.mountName = function mountName(node, options, structs) {
		var string = node.name;
		var rtoken = options.rtoken;
		rtoken.lastIndex = 0;

		var match = rtoken.exec(string);
		if (!match) { return; }

		return mountValueByType(node, options, match, structs);
	};

	window.mount = mount;

})(this);
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

// Sparky.fn

Sparky.nodeToString = Fn.id;

(function(window) {
	var Sparky = window.Sparky;

	// Detect IE
	var isIE = !!(document.all && document.compatMode || window.navigator.msPointerEnabled);

	// Logs nodes, scopes and data.
	Sparky.fn.log = function(node, scopes) {
		var sparky = this;

		// In IE11 and probably below, and possibly Edge, who knows,
		// console.groups can arrive in really weird orders. They are not at all
		// useful for debugging as a result. Rely on console.log.

		function log(scope) {
			//console[isIE ? 'log' : 'group']('Sparky: scope ' + Sparky.nodeToString(node));
			//console.log('data ', sparky.data);
			console.log('Sparky node:', node, 'scope:', scope);
			//console.log('fn   ', node, sparky.fn);
			//console[isIE ? 'log' : 'groupEnd']('---');
		}

		//console[isIE ? 'log' : 'group']('Sparky: run   ' + Sparky.nodeToString(node));
		//console.log('data ', sparky.data);
		//console[isIE ? 'log' : 'groupEnd']('---');

		return scopes.tap(log);
	};
})(this);

(function(window) {
	"use strict";

	var assign = Object.assign;
	var dom    = window.dom;
	var Sparky = window.Sparky;

	assign(Sparky.fn, {
		"show-on-scope": function(node, scopes) {
			scopes.tap(function() {
				window.requestAnimationFrame(function() {
					dom.classes(node).remove('sparky-hidden');
				});
			});
		}
	});
})(this);

(function(window) {
	"use strict";

	var assign = Object.assign;
	var Sparky = window.Sparky;

	assign(Sparky.fn, {
		html: function(node, scopes) {
			scopes.tap(function(html) {
				node.innerHTML = html;
			});
		}
	});
})(this);

(function(window) {
	"use strict";

	var Fn = window.Fn;

	function preventDefault(e) {
		e.preventDefault();
	}

	Sparky.scope = function(node) {
		console.warn('Sparky: Sparky.scope() deprecated in favour of Sparky.getScope()')
		return Sparky.getScope(node);
	};

	Sparky.setScope = function(node, scope) {
		if (!window.jQuery) {
			throw new Error(Sparky.attributePrefix + 'fn="store-scope" requires jQuery.');
		}

		window.jQuery && jQuery.data(node, 'scope', scope);
	};

	Sparky.getScope = function(node) {
		if (!window.jQuery) {
			throw new Error(Sparky.attributePrefix + 'fn="store-scope" requires jQuery.');
		}

		return jQuery.data(node, 'scope');
	};

	Object.assign(Sparky.fn, {
		"prevent": function(node, scopes, params) {
			node.addEventListener(params[0], preventDefault);
		},

		"ajax-on-submit": function(node, scopes, params) {
			var method = node.getAttribute('method') || 'POST';
			var url    = node.getAttribute('action');

			if (!Fn.isDefined(url)) {
				throw new Error('Sparky: fn ajax-on-submit requires an action="url" attribute.');
			}

			var submit;

			node.addEventListener('submit', preventDefault);

			scopes.tap(function(scope) {
				if (submit) { node.removeEventListener(submit); }

				submit = function(e) {
					// Axios
					axios
					.post(url, scope, {
						headers: { "X-CSRFToken": getCookie('csrftoken') }
					})
					.then(function (response) {
						console.log(response);
					})
					.catch(function (error) {
						console.log(error);
					});

					// jQuery
					//jQuery.ajax({
					//	//type: method.toLowerCase(),
					//	//url:  url,
					//	//data: JSON.stringify(scope),
					//	//dataType: 'json'
					//})
					//.then(function(value) {
					//	console.log(value);
					//});
				};

				node.addEventListener('submit', submit);
			})

			//this
			//.on('destroy', function() {
			//	node.removeEventListener('submit', submit);
			//});
		},

		"expose-scope": function(node, scopes) {
			scopes.tap(function(scope) {
				Sparky.setScope(node, scope);
			});
		}
	});
})(this);


(function() {
	"use strict";

	Sparky.fn['x-scroll-slave'] = function(node) {
		var name = node.getAttribute(Sparky.attributePrefix + 'x-scroll-master');
		var master;

		function update() {
			node.scrollLeft = master.scrollLeft;
		}

		this
		.on('dom-add', function() {
			master = document.getElementById(name);

			if (!master) {
				console.error(node);
				throw new Error('Sparky scroll-x-slave: id="' + name + '" not in the DOM.');
			}

			master.addEventListener('scroll', update);
			update();
		})
		.on('destroy', function() {
			if (!master) { return; }
			master.removeEventListener('scroll', update);
		});
	};

	Sparky.fn['y-scroll-slave'] = function(node) {
		var name = node.getAttribute(Sparky.attributePrefix + 'y-scroll-master');
		var master = document.getElementById(name);

		if (!master) {
			console.error(node);
			throw new Error('Sparky scroll-x-slave: id="' + name + '" not in the DOM.');
		}

		function update() {
			node.scrollTop = master.scrollTop;
		}

		master.addEventListener('scroll', update);
		update();

		this.on('destroy', function() {
			master.removeEventListener('scroll', update);
		});
	};
})();
(function(window) {
    var DEBUG   = window.DEBUG;
    var axios   = window.axios;
    var jQuery  = window.jQuery;
    var Fn      = window.Fn;
    var Sparky  = window.Sparky;
    var Stream  = window.Stream;

    var assign  = Object.assign;
    var fetch   = window.fetch;
    var get     = Fn.get;
    var getData = get('data');

    var cache   = {};

    var request = axios ? function axiosRequest(path) {
        return axios
        .get(path)
        .then(getData);
    } :

    // TODO test these functions

    jQuery ? function jQueryRequest(path) {
        return jQuery
        .get(path)
        .then(getData);
    } :

    fetch ? function fetchRequest(path) {
        return fetch(path)
        .then(getData);
    } :

    function errorRequest(path) {
        throw new Error('Sparky: no axios, jQuery or fetch found for request "' + path + '"');
    } ;

    assign(Sparky.fn, {
        load: function load(node, stream, params) {
            var path  = params[0];

            if (DEBUG && !path) {
                throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="load:url" requires a url.');
            }

            var scopes = Stream.of();

            request(path)
            .then(scopes.push)
            .catch(function (error) {
                console.warn(error);
            });

            return scopes;
        },

        import: function(node, stream, params) {
            var path  = params[0];

            if (DEBUG && !path) {
                throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="import:url" requires a url.');
            }

            // If the resource is cached, return it as an shiftable
            if (cache[path]) {
                return Stream.of(cache[path]);
            }

            var scopes = Stream.of();

            request(path)
            .then(function(data) {
                if (!data) { return; }
                cache[path] = data;
                scopes.push(data);
            })
            .catch(function(error) {
                console.warn(error);
            });

            return scopes;
        }
    });
})(this);
(function(window) {
    "use strict";

    var DEBUG   = window.DEBUG;
    var axios   = window.axios;
    var jQuery  = window.jQuery;
    var Fn      = window.Fn;
    var dom     = window.dom;
    var Sparky  = window.Sparky;

    var assign  = Object.assign;
    var fetch   = window.fetch;
    var get     = Fn.get;
    var getData = get('data');
    var parseHTML = dom.parse('html');

    var cache   = {
        '': {
            '': document
        }
    };

    var request = axios ? function axiosRequest(url, id) {
        return axios
        .get(url)
        .then(getData)
        .then(parseHTML);
    } :

    // TODO test these functions

    jQuery ? function jQueryRequest(url, id) {
        return jQuery
        .get(url)
        .then(getData)
        .then(parseHTML);
    } :

    fetch ? function fetchRequest(url, id) {
        return fetch(url)
        .then(getData)
        .then(parseHTML)
        .then(function() {

        });
    } :

    function errorRequest(url, id) {
        throw new Error('Sparky: no axios, jQuery or fetch found for request "' + url + '"');
    } ;

    function insertTemplate(sparky, node, scopes, id, template) {
        if (!template) {
            throw new Error('Sparky: template ' + id + ' not found.');
        }

        scopes
        .clone()
        .take(1)
        .each(function(scope) {
            var fragment = dom.clone(template);
            dom.empty(node);
            dom.append(node, fragment);
            sparky.continue();
        });
    }

    function templateFromCache(sparky, node, scopes, path, id, template) {
        var doc, elem;

        if (!template) {
            doc  = cache[path][''];
            elem = doc.getElementById(id);

            template = cache[path][id] = doc === document ?
                dom.fragmentFromId(id) :
                elem && dom.fragmentFromHTML(elem.innerHTML) ;
        }

        insertTemplate(sparky, node, scopes, id, template);
    }

    function templateFromDocument(sparky, node, scopes, path, id, doc) {
        var template, elem;

        cache[path] = { '': doc };

        if (id) {
            elem = doc.getElementById(id);
            template = cache[path][id] = elem && dom.fragmentFromHTML(elem.innerHTML);
        }
        else {
            throw new Error('Sparky: template url has no hash id ' + path);
        }

        insertTemplate(sparky, node, scopes, id, template);
    }

    assign(Sparky.fn, {
        template: function(node, scopes, params) {
            var url   = params[0];
            var parts, path, id;

            // Support legacy ids instead of urls for just now
            if (!/#/.test(url)) {
                console.warn('Deprecated: Sparky template:url url should be a url or hash ref, actually an id: "' + url + '"');
                path = '';
                id   = url;
            }
            // Parse urls
            else {
                parts = url.split('#');
                path  = parts[0] || '';
                id    = parts[1] || '';
            }

            if (DEBUG && !id) {
                throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="template:url" requires a url with a hash ref. "' + url + '"');
            }

            var sparky = this;

            sparky.interrupt();

            // If the resource is cached, return it as an shiftable
            if (cache[path]) {
                templateFromCache(sparky, node, scopes, path, id, cache[path][id]);
            }
            else {
                request(path)
                .then(function(doc) {
                    if (!doc) { return; }
                    templateFromDocument(sparky, node, scopes, path, id, doc);
                })
                .catch(function(error) {
                    console.warn(error);
                });
            }

            return scopes;
        }
    });
})(this);
(function(window) {
	"use strict";

	var Fn         = window.Fn;
	var dom        = window.dom;
	var Observable = window.Observable;
	var Sparky     = window.Sparky;
	var A          = Array.prototype;

	var noop       = Fn.noop;
	var clone      = dom.clone;
	var tag        = dom.tag;
	var observe    = Observable.observe;
	var MarkerNode = Sparky.MarkerNode;

	var $object    = Symbol('object');

	// We maintain a list of sparkies that are scheduled for destruction. This
	// time determines how long we wait during periods of inactivity before
	// destroying those sparkies.
	var destroyDelay = 8000;

	function create(node, object, options) {
		var sparky = new Sparky(node, object, options);
		sparky[$object] = object;
		return sparky;
	}

	function reorderCache(template, options, array, sparkies) {
		var n    = -1;
		var sparky, object, i;

		// Reorder sparkies
		while (++n < array.length) {
			object = array[n];
			sparky = sparkies[n];

			if (sparky && object === sparky[$object]) {
				continue;
			}

			i = -1;
			while (sparkies[++i] && sparkies[i][$object] !== object);

			sparky = i === sparkies.length ?
				create(clone(template), object, options) :
				sparkies.splice(i, 1)[0];

			sparkies.splice(n, 0, sparky);
		}
	}

	function reorderNodes(node, array, sparkies) {
		// Reordering has pushed all removed sparkies to the end of the
		// sparkies. Remove them.
		while (sparkies.length > array.length) {
			A.forEach.call(sparkies.pop().stop(), dom.remove);
		}

		// Reorder nodes in the DOM
		var l = sparkies.length;
		var n = -1;
		var parent = node.parentNode;

		while (n < l) {
			// Note that node is null where nextSibling does not exist
			node = node ? node.nextSibling : null ;

			while (++n < l && sparkies[n][0] !== node) {
				parent.insertBefore(sparkies[n][0], node);
			}
		}
	}

	Sparky.fn.each = function each(node, scopes, params) {
		var sparkies = [];
		var template = node.cloneNode(true);
		var options  = this.interrupt();
		var marker   = MarkerNode(node);
		var isSelect = tag(node) === 'option';

		function update(array) {
			// Selects will lose their value if the selected option is removed
			// from the DOM, even if there is another <option> of same value
			// already in place. (Interestingly, value is not lost if the
			// selected <option> is simply moved). Make an effort to have
			// selects retain their value.
			var value = isSelect ? marker.parentNode.value : undefined ;

			reorderCache(template, options, array, sparkies);
			reorderNodes(marker, array, sparkies);

			// A fudgy workaround because observe() callbacks (like this update
			// function) are not batched to ticks.
			// TODO: batch observe callbacks to ticks.
			if (isSelect && value !== undefined) {
				marker.parentNode.value = value;
			}
		}

		var throttle = Fn.throttle(update, requestAnimationFrame, noop);
		//var timer;

		//fns.unshift(function() {
		//	this.data = Object.create(data);
		//});

		// Stop Sparky trying to bind the same scope and ctrls again.
		//template.removeAttribute('data-scope');
		template.removeAttribute(Sparky.attributePrefix + 'fn');

		// Put the marker in place and remove the node
		dom.before(node, marker);
		dom.remove(node);

		var unobserve = noop;
		var initial = scopes.latest().shift();

		if (initial) {
			observe(initial, '', update);
		}

		scopes.each(function(scope) {
			unobserve();
			unobserve = observe(scope, '', throttle);
		});

		this.then(function destroy() {
			throttle.cancel();
			unobserve();
		});
	};
})(this);

// Sparky.filter

(function(window) {
	"use strict";

	var Fn        = window.Fn;
	var dom       = window.dom;
	var Sparky    = window.Sparky;
	var Time      = window.Time;

	var A         = Array.prototype;
	var assign    = Object.assign;
	var curry     = Fn.curry;
	var get       = Fn.get;
	var isDefined = Fn.isDefined;
	var last      = Fn.last;

	function spaces(n) {
		var s = '';
		while (n--) { s += ' '; }
		return s;
	}

	function interpolateLinear(xs, ys, x) {
		var n = -1;
		while (++n < xs.length && xs[n] < x);

		// Shortcut if x is lower than smallest x
		if (n === 0) {
			return ys[0];
		}

		// Shortcut if x is greater than biggest x
		if (n >= xs.length) {
			return last(ys);
		}

		// Shortcurt if x corresponds exactly to an interpolation coordinate
		if (x === xs[n]) {
			return ys[n];
		}

		// Linear interpolate
		var ratio = (x - xs[n - 1]) / (xs[n] - xs[n - 1]) ;
		return ratio * (ys[n] - ys[n - 1]) + ys[n - 1] ;
	}

	assign(Sparky.transformers = {}, {
		add:         { tx: Fn.add,         ix: curry(function(m, n) { return n - m; }) },
		decibels:    { tx: Fn.todB,        ix: Fn.toLevel },
		multiply:    { tx: Fn.multiply,    ix: curry(function(d, n) { return n / d; }) },
		degrees:     { tx: Fn.toDeg,       ix: Fn.toRad },
		radians:     { tx: Fn.toRad,       ix: Fn.toDeg },
		pow:         { tx: Fn.pow,         ix: curry(function(n, x) { return Fn.pow(1/n, x); }) },
		exp:         { tx: Fn.exp,         ix: Fn.log },
		log:         { tx: Fn.log,         ix: Fn.exp },
		int:         { tx: Fn.toFixed(0),  ix: Fn.toInt },
		float:       { tx: Fn.toFloat,     ix: Fn.toString },
		boolean:     { tx: Boolean,        ix: Fn.toString },
		normalise:   { tx: Fn.normalise,   ix: Fn.denormalise },
		denormalise: { tx: Fn.denormalise, ix: Fn.normalise },
		floatformat: { tx: Fn.toFixed,     ix: curry(function(n, str) { return parseFloat(str); }) },

		interpolate: {
			tx: function(point) {
				var xs = A.map.call(arguments, get('0'));
				var ys = A.map.call(arguments, get('1'));

				return function(value) {
					return interpolateLinear(xs, ys, value);
				};
			},

			ix: function(point) {
				var xs = A.map.call(arguments, get('0'));
				var ys = A.map.call(arguments, get('1'));

				return function(value) {
					return interpolateLinear(ys, xs, value);
				}
			}
		}
	});

	assign(Sparky.transforms, {

		// Transforms from Fn's map functions

		add:          Fn.add,
		append:       Fn.append,
		contains:     Fn.contains,
		diff:         Fn.diff,
		equals:       Fn.equals,
		//exp:          Fn.exp,
		factorise:    Fn.factorise,
		gcd:          Fn.gcd,
		get:          Fn.get,
		getPath:      Fn.getPath,
		intersect:    Fn.intersect,
		invoke:       Fn.invoke,
		is:           Fn.is,
		lcm:          Fn.lcm,
		limit:        Fn.limit,
		//log:          Fn.log,
		max:          Fn.max,
		min:          Fn.min,
		mod:          Fn.mod,
		not:          Fn.not,
		percent:      Fn.multiply(100),
		prepend:      Fn.prepend,
		rest:         Fn.rest,
		root:         Fn.nthRoot,
		slugify:      Fn.slugify,
		sort:         Fn.sort,
		take:         Fn.take,
		toCartesian:  Fn.toCartesian,
		todB:         Fn.todB,
		decibels:     Fn.todB,
		toDeg:        Fn.toDeg,
		toLevel:      Fn.toLevel,
		toPolar:      Fn.toPolar,
		toRad:        Fn.toRad,
		toStringType: Fn.toStringType,
		typeof:       Fn.toType,
		unique:       Fn.unique,
		unite:        Fn.unite,


		// Transforms from dom's map functions

		escape:       dom.escape,
		px:           dom.toPx,
		rem:          dom.toRem,


		// Sparky transforms

		timeformat: function timeformat(format, lang) {
			lang = lang || document.documentElement.lang;

			return function(value) {
				return Time(value).render(format, lang);
			};
		},

		divide: curry(function(n, value) {
			if (typeof value !== 'number') { return; }
			return value / n;
		}),

		'find-in': curry(function(path, id) {
			if (!isDefined(id)) { return; }
			var collection = Fn.getPath(path, Sparky.data);
			return collection && collection.find(id);
		}),

		first: Fn.get(0),

		floatformat: curry(function(n, value) {
			return typeof value === 'number' ? Number.prototype.toFixed.call(value, n) :
				!isDefined(value) ? '' :
				(Sparky.debug && console.warn('Sparky: filter floatformat: ' + n + ' called on non-number ' + value)) ;
		}),

		floor: function(value) {
			return Math.floor(value);
		},

		"greater-than": curry(function(value2, value1) {
			return value1 > value2;
		}),

		invert: function(value) {
			return typeof value === 'number' ? 1 / value : !value ;
		},

		join: curry(function(string, value) {
			return Array.prototype.join.call(value, string);
		}),

		json: function(value) {
			return JSON.stringify(value);
		},

		last: function(value) {
			return value[value.length - 1];
		},

		"less-than": curry(function(value2, value1) {
			return value1 < value2 ;
		}),

		localise: curry(function(digits, value) {
			var locale = document.documentElement.lang;
			var options = {};

			if (isDefined(digits)) {
				options.minimumFractionDigits = digits;
				options.maximumFractionDigits = digits;
			}

			// Todo: localise value where toLocaleString not supported
			return value.toLocaleString ? value.toLocaleString(locale, options) : value ;
		}),

		lowercase: function(value) {
			if (typeof value !== 'string') { return; }
			return String.prototype.toLowerCase.apply(value);
		},

		map: curry(function(method, path, array) {
			return array && array.map(Sparky.transforms[method](path));
		}),

		pluralise: curry(function(str1, str2, lang, value) {
			if (typeof value !== 'number') { return; }

			str1 = str1 || '';
			str2 = str2 || 's';

			// In French, numbers less than 2 are considered singular, where in
			// English, Italian and elsewhere only 1 is singular.
			return lang === 'fr' ?
				(value < 2 && value >= 0) ? str1 : str2 :
				value === 1 ? str1 : str2 ;
		}),

		// TODO: these should copy postpadding and preppadding from Fn

		postpad: curry(function(n, value) {
			var string = isDefined(value) ? value.toString() : '' ;
			var l = string.length;
			var m = parseInt(n, 10);

			return m === l ? value :
				m > l ? string + spaces(m - l) :
				string.substring(0, m) ;
		}),

		prepad: curry(function(n, char, value) {
			var string = isDefined(value) ? value.toString() : '' ;
			var l = string.length;
			var array = [];

			// String is longer then padding: let it through unprocessed
			if (n - l < 1) { return value; }

			array.length = 0;
			array.length = n - l;
			array.push(string);
			return array.join(char || ' ');
		}),

		random: function(value) {
			return value[Math.floor(Math.random() * value.length)];
		},

		reduce: curry(function(name, initialValue, array) {
			return array && array.reduce(Fn[name], initialValue || 0);
		}),

		replace: curry(function(str1, str2, value) {
			if (typeof value !== 'string') { return; }
			return value.replace(RegExp(str1, 'g'), str2);
		}),

		round: curry(function round(n, value) {
			return Math.round(value / n) * n;
		}),

		slice: curry(function(i0, i1, value) {
			return typeof value === 'string' ?
				value.slice(i0, i1) :
				Array.prototype.slice.call(value, i0, i1) ;
		}),

		striptags: (function() {
			var rtag = /<(?:[^>'"]|"[^"]*"|'[^']*')*>/g;

			return function(value) {
				return value.replace(rtag, '');
			};
		})(),

		switch: function(value) {
			if (typeof value === 'string') { value = parseInt(value, 10); }
			if (typeof value !== 'number' || Number.isNaN(value)) { return; }
			return arguments[value + 1];
		},

		translate: (function() {
			var warned = {};

			return function(value) {
				var translations = Sparky.translations;

				if (!translations) {
					if (!warned.missingTranslations) {
						console.warn('Sparky: Missing lookup object Sparky.translations');
						warned.missingTranslations = true;
					}
					return value;
				}

				var text = translations[value] ;

				if (!text) {
					if (!warned[value]) {
						console.warn('Sparky: Sparky.translations contains no translation for "' + value + '"');
						warned[value] = true;
					}

					return value;
				}

				return text ;
			};
		})(),

		truncatechars: curry(function(n, value) {
			return value.length > n ?
				value.slice(0, n) + '…' :
				value ;
		}),

		type: function(value) {
			return typeof value;
		},

		uppercase: function(value) {
			if (typeof value !== 'string') { return; }
			return String.prototype.toUpperCase.apply(value);
		},

		//urlencode
		//urlize
		//urlizetrunc
		//wordcount
		//wordwrap

		yesno: curry(function(truthy, falsy, value) {
			return value ? truthy : falsy ;
		})
	});
})(this);
