(function(window) {
	"use strict";

	var DEBUG      = window.DEBUG;

	var Fn         = window.Fn;
	var Stream     = window.Stream;
	var dom        = window.dom;

	var assign     = Object.assign;
	var attribute  = dom.attribute;
	var compose    = Fn.compose;
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

	// Matches empty or spaces-only string
	var rempty  = /^\s*$/;

	// Matches anything that contains a non-space character
	var rtext = /\S/;

	// Matches the arguments list in the result of a fn.toString()
	var rarguments = /function(?:\s+\w+)?\s*(\([\w,\s]*\))/;

	var settings = {
		attributePrefix: 'sparky-',
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

	var rtransform = /\|\s*([\w-]+)\s*(?::([^|]+))?/g;

	// TODO: make parseParams() into a module - it is used by sparky.js also
	var parseParams = (function() {
		//                       null   true   false   number                                     "string"                   'string'                   string
		var rvalue     = /\s*(?:(null)|(true)|(false)|(-?(?:\d+|\d+\.\d+|\.\d+)(?:[eE][-+]?\d+)?)|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|([^,\s]+))\s*,?/g;

		function toValue(result, string) {
			if (!result) {
				throw new Error('Sparky: unable to parse transform args "' + string + '"');
			}

			return result[1] ? null :
				result[2] ? true :
				result[3] ? false :
				result[4] ? parseFloat(result[4]) :
				result[5] ? result[5] :
				result[6] ? result[6] :
				result[7] ? result[7] :
				undefined ;
		}

		return function parseParams(string) {
			var params = [];

			rvalue.lastIndex = 0;

			while (rvalue.lastIndex < string.length) {
				params.push(toValue(rvalue.exec(string), string));
			}

			return params;
		};
	})();

	function Transform(transforms, transformers, string) {
		// Support the old clunky way. TODO: remove
		if (!string) { return id; }

		// Transform has already been set
		if (typeof string !== 'string') { return string; }

		var fns = [];
		var token, name, fn, params;

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
				params = parseParams(token[2]);
				//args = JSON.parse('[' + token[2].replace(/'/g, '"') + ']');
				fns.push(fn.apply(null, params));
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

	var scopeMap = new WeakMap();

	function Struct(node, token, path, render, type, read, pipe) {
		this.node   = node;
		this.token  = token;
		this.path   = path;
		this.render = render;

		if (type) {
			this.type   = type;
		}
		else {
			this.listen = noop;
		}

		this.read   = read;

		// TODO: pipe is a TEMP argument, in place to support old way of
		// generating pipes for just now.
		if (pipe) {
			this.pipe   = pipe;
		}
	}

	assign(Struct.prototype, {
		node:   null,
		token:  '',
		path:   '',
		type:   '',
		pipe:   id,
		update: noop,
		push:   noop,
		render: noop,
		read:   noop,

		listen:   function(fn) {
			console.log('LISTEN');
if (this._listenFn) {
	console.warn('Bad Steve. Attempt to listen without removing last listener');
}

			this._listenFn = fn;
			this.node.addEventListener(this.type, fn);

			// TODO: Temp. Support old way of unlistening, where unbinder is a
			// callback
			var struct = this;
			return function() { struct.unlisten(); };
		},

		unlisten: function() {
			console.log('UNLISTEN')
			var fn   = this._listenFn;
			this.node.removeEventListener(this.type, fn);
			this._listenType = undefined;
			this._listenFn   = undefined;
		}
	});

	function isTruthy(value) {
		return !!value;
	}

	function matchToken(string, options) {
		var rtoken = options.rtoken;
		rtoken.lastIndex = 0;
		return rtoken.exec(string);
	}

	function mountScope(node, options, structs) {
		// new Struct(node, token, path, render [, type, pipe])
		structs.push(new Struct(node, '', '', function renderScope(value) {
			scopeMap.set(node, value);
		}));
	}

	function mountStringToken(node, render, strings, structs, match) {
		var i = strings.length;
		strings.push('');

		// new Struct(node, token, path, render [, type, read, pipe])
		structs.push(new Struct(node, match[0], match[2], function renderText(value) {
			strings[i] = toRenderString(value);
			render(strings);
		}, null, null, match[3]));
	}

	function mountString(node, string, render, options, structs) {
		var rtoken  = options.rtoken;
		var i       = rtoken.lastIndex = 0;
		var match   = rtoken.exec(string);

		if (!match) { return; }

		var strings = [];
		var renderStrings = function(strings) {
			render(strings.join(''));
		};

		while (match) {
			if (match.index > i) {
				strings.push(string.slice(i, match.index));
			}

			mountStringToken(node, renderStrings, strings, structs, match);
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

	function mountAttribute(name, node, options, structs, prefixed) {
		var text = prefixed !== false
		&& node.getAttribute(options.attributePrefix + name)
		|| node.getAttribute(cased[name] || name) ;

		return text && mountString(node, text, function render(value) {
			node.setAttribute(cased[name] || name, value);
		}, options, structs);
	}

	function renderBoolean(name, node) {
		return name in node ?

		// Assume attribute is also a boolean property
		function renderBoolean(values) {
			node[name] = !!values.find(isTruthy);
		} :

		// Attribute is not also a boolean property
		function renderBoolean(values) {
			if (values.find(isTruthy)) {
				node.setAttribute(name, name);
			}
			else {
				node.removeAttribute(name);
			}
		} ;
	}

	function mountBooleanToken(node, render, values, structs, match) {
		var i = values.length;
		values.push(false);

		structs.push(new Struct(node, match[0], match[2], function(value) {
			values[i] = value;
			render(values);
		}, null, null, match[3]));
	}

	function mountBoolean(name, node, options, structs) {
		// Look for prefixed attributes before attributes.
		//
		// In FF, the disabled attribute is set to the previous value that the
		// element had when the page is refreshed, so it contains no sparky
		// tags. The proper way to address this problem is to set
		// autocomplete="off" on the parent form or on the field.

		var prefixed = node.getAttribute(options.attributePrefix + name);
		var string   = prefixed || node.getAttribute(name);

		// Fast out
		if (!string) { return; }

		var rtoken  = options.rtoken;
		var i       = rtoken.lastIndex = 0;
		var match   = rtoken.exec(string);

		// Fast out
		if (!match) { return; }

		var render = renderBoolean(name, node);

		// Where the unprefixed attribute is populated, Return the property to
		// the default value.
		if (!prefixed) {
			render(nothing);
		}

		var values = [];
		var value;

		while (match) {
			if (match.index > i) {
				value = string.slice(i, match.index);
				if (!rempty.test(value)) {
					values.push(value);
				}
			}

			mountBooleanToken(node, render, values, structs, match);
			i     = rtoken.lastIndex;
			match = rtoken.exec(string);
		}

		if (string.length > i) {
			value = string.slice(i);
			if (!rempty.test(value)) {
				values.push(value);
			}
		}
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

			structs.push(new Struct(node, $0, $2, function render(string) {
				if (prev && rtext.test(prev)) { removeClasses(classes, prev); }
				if (string && rtext.test(string)) { addClasses(classes, string); }
				prev = string;
			}, null, null, $3));

			return '';
		});

		node.setAttribute('class', text);
	}

	function mountValueNumber(node, options, structs) {
		var string = attribute(options.attributePrefix + 'value', node)
			|| attribute('value', node) ;

		var match = matchToken(string, options);

		if (!match) { return; }

		// new Struct (node, token, path, render, type, read, pipe)
		structs.push(new Struct(node, match[0], match[2], function render(value) {
			// Avoid updating with the same value as it sends the cursor to
			// the end of the field (in Chrome, at least).
			if (value === parseFloat(node.value)) { return; }

			node.value = typeof value === 'number' && !isNaN(value) ?
				value :
				'' ;
		}, 'input', function read() {
			return node.value ? parseFloat(node.value) : undefined ;
		}, match[3]));
	}

	function mountValueString(node, options, structs) {
		var string = attribute(options.attributePrefix + 'value', node)
			|| attribute('value', node) ;
		var match = matchToken(string, options);
		if (!match) { return; }

		// new Struct (node, token, path, render, type, read, pipe)
		structs.push(new Struct(node, match[0], match[2], function render(value) {
			// Avoid updating with the same value as it sends the cursor to
			// the end of the field (in Chrome, at least).
			if (value === node.value) { return; }

			node.value = typeof value === 'string' ?
				value :
				'' ;
		}, 'input', function read() {
			return node.value;
		}, match[3]));
	}

	function mountValueCheckbox(node, options, structs) {
		var string = attribute(options.attributePrefix + 'value', node);
		var match  = matchToken(string, options);
		if (!match) { return; }

		// new Struct (node, token, path, render, type, read, pipe)
		structs.push(new Struct(node, match[0], match[2], function render(value) {
			// Where value is defined check against it, otherwise
			// value is "on", uselessly. Set checked state directly.
			node.checked = isDefined(node.getAttribute('value')) ?
				value === node.value :
				value === true ;
		}, 'change', function read() {
			// TODO: Why do we check attribute here?
			return isDefined(node.getAttribute('value')) ?
				node.checked ? node.value : undefined :
				node.checked ;
		}, match[3]));
	}

	function mountValueRadio(node, options, structs) {
		var string = attribute(options.attributePrefix + 'value', node);
		var match  = matchToken(string, options);
		if (!match) { return; }

		// new Struct (node, token, path, render, type, read, pipe)
		structs.push(new Struct(node, match[0], match[2], function render(value) {
			// Where value="" is defined check against it, otherwise
			// value is "on", uselessly: set checked state directly.
			node.checked = isDefined(node.getAttribute('value')) ?
				value === node.value :
				value === true ;
		}, 'change', function read() {
			if (!node.checked) { return; }

			return isDefined(node.getAttribute('value')) ?
				node.value :
				true ;
		}, match[3]));
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

			mountScope(node, options, structs);
			mountClass(node, options, structs);
			mountBoolean('hidden', node, options, structs);
			mountAttributes(['id', 'title', 'style'], node, options, structs);
			mountTag(node, options, structs);
		},

		// text
		3: function mountText(node, options, structs) {
			mountString(node, node.nodeValue, set('nodeValue', node), options, structs);
		},

		// comment
		8: noop,

		// document
		9: function mountDocument(node, options, structs) {
			var children = node.childNodes;
			var n = -1;
			var child;

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

		form: function(node, options, structs) {
			mountAttribute('action', node, options, structs);
		},

		fieldset: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
		},

		img: function(node, options, structs) {
			mountAttribute('alt', node, options, structs);
		},

		input: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
			mountBoolean('required', node, options, structs);
			mountAttribute('name', node, options, structs);
			mountInput(node, options, structs);
		},

		label: function(node, options, structs) {
			mountAttribute('for', node, options, structs);
		},

		meter: function(node, options, structs) {
			mountAttributes(['min', 'max', 'low', 'high', 'value'], node, options, structs);
		},

		option: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
			mountAttribute('value', node, options, structs);
		},

		output: function(node, options, structs) {
			mountAttribute('for', node, options, structs);
		},

		progress: function(node, options, structs) {
			mountAttribute(['max', 'value'], node, options, structs);
		},

		select: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
			mountBoolean('required', node, options, structs);
			mountAttribute('name', node, options, structs);
			mountValueString(node, options, structs);
		},

		textarea: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
			mountBoolean('required', node, options, structs);
			mountAttribute('name', node, options, structs);
			mountValueString(node, options, structs);
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
			mountAttributes(['x', 'y', 'dx', 'dy', 'text-anchor', 'transform'], node, options, structs);
		},

		use: function(node, options, structs) {
			mountAttributes(['href', 'transform'], node, options, structs);
		},

		default: noop
	};

	var inputs = {
		button: function(node, options, structs) {
			// false flag means don't check the prefixed attribute
			mountAttribute('value', node, options, structs, false);
		},

		checkbox: function(node, options, structs) {
			// false flag means don't check the prefixed attribute
			mountAttribute('value', node, options, structs, false);
			mountBoolean('checked', node, options, structs);
			// This call only binds the prefixed attribute
			mountValueCheckbox(node, options, structs);
		},

		date: function(node, options, structs) {
			mountAttributes(['min', 'max', 'step'], node, options, structs);
			mountValueString(node, options, structs);
		},

		hidden: function(node, options, structs) {
			// false flag means don't check the prefixed attribute
			mountAttribute('value', node, options, structs, false);
		},

		image: function(node, options, structs) {
			mountAttribute('src', node, options, structs);
		},

		number: function(node, options, structs) {
			mountAttributes(['min', 'max', 'step'], node, options, structs);
			mountValueNumber(node, options, structs);
		},

		radio: function(node, options, structs) {
			// false flag means don't check the prefixed attribute
			mountAttribute('value', node, options, structs, false);
			mountBoolean('checked', node, options, structs);
			// This call only binds the prefixed attribute
			mountValueRadio(node, options, structs);
		},

		range: function(node, options, structs) {
			mountAttributes(['min', 'max', 'step'], node, options, structs);
			mountValueNumber(node, options, structs);
		},

		reset: function(node, options, structs) {
			// false flag means don't check the prefixed attribute
			mountAttribute('value', node, options, structs, false);
		},

		submit: function(node, options, structs) {
			// false flag means don't check the prefixed attribute
			mountAttribute('value', node, options, structs, false);
		},

		time: function(node, options, structs) {
			mountAttributes(['min', 'max', 'step'], node, options, structs);
			mountValueString(node, options, structs);
		},

		default: function(node, options, structs) {
			mountValueString(node, options, structs);
		}
	};

	var mountNode        = overload(get('nodeType'), types);
	var mountTag         = overload(dom.tag, tags);
	var mountInput       = overload(get('type'), inputs);

	var toLog   = overload(toType, {
		function: function(fn) { return fn.toString(); },
		object: JSON.stringify,
		default: id
	});

	function catchIfDebug(fn, struct) {
		return function(value) {
			try {
				return fn.apply(this, arguments);
			}
			catch(e) {
				//console.log('Original error:', e.stack);
				throw new Error('Sparky failed to render ' + struct.token + ' with value ' + toLog(value) + '.\n' + e.stack);
			}
		}
	}

	function setupStruct(struct, options) {
		var transform = Transform(options.transforms, options.transformers, struct.pipe);
		var update    = catchIfDebug(compose(struct.render, transform), struct);
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
console.log('RENDERER PUSH', data);
				if (old === data) { return; }
				old = data;

				if (DEBUG) { console.groupCollapsed('update:', node); }

				// Data is now gauranteed to be observable
				var observable = data;//Observable(data);

				// Rebind structs
				structs.forEach(function(struct) {
					// Unbind Structs
					struct.unbind && struct.unbind();

					// Set up structs to be pushable. Renderers already have
					// a push method and should not be throttled.
					if (!struct.push || struct.push === noop) {
						setupStruct(struct, options);
					}

					struct.unbind = struct.unbind || function(data) {
						// If the struct is not a Sparky it's .push() is a
						// throttle and must be cancelled. TODO: dodgy.
						struct.push.cancel && struct.push.cancel();
						struct.input.stop();
						if (struct.unlisten) { struct.unlisten(); }
					};

					// Rebind struct
					if (struct.input) {
						struct.input.stop();
					}

					var input = struct.input = Stream.observe(struct.path, observable).latest();
					var value = input.shift();
					var shift, frameId;

					// If there is an initial scope render it synchronously, as
					// it is assumed we are already working inside an animation
					// frame. Then render future scopes at throttled frame rate,
					// where throttle is defined
					if (value !== undefined) {
						(struct.update || struct.push)(value);
						input.each(struct.push);
					}

					// Otherwise (if input is a pushable stream) render the
					// first thing to pushed before the next frame. This allows
					// us to immediately render a Sparky() that is created and
					// then .push()ed to synchrounously.
					else if (input.on) {
						shift = function shift() {
							input.off('push', shift);
							cancelAnimationFrame(frameId);
							var value = input.shift();
							(struct.update || struct.push)(value);
							input.each(struct.push);
						};

						frameId = requestAnimationFrame(function() {
							input.off('push', shift);
							input.each(struct.push);
						});

						input.on('push', shift);
					}

					var set, invert, change;

					// Listen to changes
					if (struct.listen && struct.listen !== noop) {
						if (struct.path === '') { console.warn('mount:  Cannot listen to path ""'); }
						set = setPath(struct.path, observable);
						invert = InverseTransform(options.transformers, struct.pipe);
						change = pipe(function() { return struct.read(); }, invert, set);
						struct.listen(change);

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

	mount.getScope = function(node) {
		return scopeMap.get(node);
	};

	// Export (temporary)
	mount.types  = types;
	mount.tags   = tags;
	mount.inputs = inputs;
	mount.mountAttribute   = mountAttribute;
	mount.mountBoolean     = mountBoolean;
	mount.mountInput       = mountInput;
	mount.mountValueString = mountValueString;
	mount.mountValueNumber = mountValueNumber;
	mount.parseParams      = parseParams;

	// Legacy pre 2.0.3
	mount.mountName = function mountName(node, options, structs) {
		var string = node.name;
		var match  = matchToken(string, options);
		if (!match) { return; }

		return mountValueByType(node, options, match, structs);
	};

	window.mount = mount;

})(window);
