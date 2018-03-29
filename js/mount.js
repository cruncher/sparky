(function(window) {
	"use strict";

	var DEBUG      = window.DEBUG;

	var A          = Array.prototype;
	var Fn         = window.Fn;
	var Stream     = window.Stream;
	var dom        = window.dom;

	var assign     = Object.assign;
	var define     = Object.defineProperties;
	var attribute  = dom.attribute;
	var get        = Fn.get;
	var id         = Fn.id;
	var isDefined  = Fn.isDefined;
	var isNaN      = Number.isNaN;
	var nothing    = Fn.nothing;
	var noop       = Fn.noop;
	var overload   = Fn.overload;
	var pipe       = Fn.pipe;
	var postpad    = Fn.postpad;
	var remove     = Fn.remove;
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
		if (!string) { return id; }

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

	function isTruthy(value) {
		return !!value;
	}

	function matchToken(string, options) {
		var rtoken = options.rtoken;
		rtoken.lastIndex = 0;
		return rtoken.exec(string);
	}

	function mountStringToken(node, render, strings, structs, match) {
		var i = strings.length;
		strings.push('');

		// new Struct(node, token, path, render [, type, read, pipe])
		structs.push(new Struct(node, match[0], match[2], function renderText(value) {
			strings[i] = toRenderString(value);
			render(strings);
		}, match[3]));
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
		}, match[3]));
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
			}, $3));

			return '';
		});

		node.setAttribute('class', text);
	}

	function mountValueNumber(node, options, structs) {
		var string = attribute(options.attributePrefix + 'value', node)
			|| attribute('value', node) ;

		var match = matchToken(string, options);

		if (!match) { return; }

		// ReadableStruct(node, token, path, render, type, read, pipe)
		structs.push(new ReadableStruct(node, match[0], match[2], writeValueNumber, 'input', readValueNumber, match[3]));
	}

	function mountValueString(node, options, structs) {
		var string = attribute(options.attributePrefix + 'value', node)
			|| attribute('value', node) ;
		var match = matchToken(string, options);
		if (!match) { return; }

		// new Struct (node, token, path, render, type, read, pipe)
		structs.push(new ReadableStruct(node, match[0], match[2], writeValue, 'input', readValue, match[3]));
	}

	function mountValueCheckbox(node, options, structs) {
		var string = attribute(options.attributePrefix + 'value', node);
		var match  = matchToken(string, options);
		if (!match) { return; }

		// new Struct (node, token, path, render, type, read, pipe)
		structs.push(new ReadableStruct(node, match[0], match[2], writeValueCheckbox, 'change', readValueCheckbox, match[3]));
	}

	function mountValueRadio(node, options, structs) {
		var string = attribute(options.attributePrefix + 'value', node);
		var match  = matchToken(string, options);
		if (!match) { return; }

		// new Struct (node, token, path, render, type, read, pipe)
		structs.push(new ReadableStruct(node, match[0], match[2], writeValueRadio, 'change', readValueRadio, match[3]));
	}

	var types = {
		// element
		1: function mountElement(node, options, structs) {
			// Get an immutable list of children. We don't want to mount
			// elements that may be dynamically inserted by other sparky
			// processes. Remember node.childNodes is dynamic.
			var children = A.slice.apply(node.childNodes);
			var n = -1;
			var child;

			while (child = children[++n]) {
				options.mount(child, options, structs) ||
				mountNode(child, options, structs) ;
			}

			// This costs us, needlessly creating a struct for every element
			//mountScope(node, options, structs);
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
			var children = A.slice.apply(node.childNodes);
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
			var children = A.slice.apply(node.childNodes);
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


	// Struct

	var structs = [];

	var removeStruct = remove(structs);

	function addStruct(struct) {
		structs.push(struct);
	}

	function call(fn) {
		fn(this);
	}

	function Struct(node, token, path, render, pipe) {
		//console.log('token: ', postpad(' ', 28, token) + ' node: ', node);

		addStruct(this);
		this.node    = node;
		this.token   = token;
		this.path    = path;
		this.render  = render;
		this.pipe    = pipe;
		this.stopFns = [];
	}

	function ReadableStruct(node, token, path, render, type, read, pipe) {
		// ReadableStruct extends Struct with listeners and read functions
		Struct.call(this, node, token, path, render, pipe);
		this.type = type;
		this.read = read;
	}

	assign(Struct.prototype, {
		stopFns: nothing,
		update:  noop,
		render:  noop,

		then: function(fn) {
			this.stopFns.push(fn);
		},

		stop: function stop() {
			this.stopFns.forEach(call, this);
			removeStruct(this);
		}
	});

	assign(ReadableStruct.prototype, Struct.prototype, {
		listen: function listen(fn) {
			if (this._listenFn) {
				console.warn('Bad Steve. Attempt to listen without removing last listener');
			}

			this._listenFn = fn;
			this.node.addEventListener(this.type, fn);
		},

		unlisten: function unlisten() {
			var fn = this._listenFn;

			this.node.removeEventListener(this.type, fn);
			this._listenType = undefined;
			this._listenFn   = undefined;
		}
	});

	function writeValue(value) {
		var node = this.node;

		// Avoid updating with the same value as it sends the cursor to
		// the end of the field (in Chrome, at least).
		if (value === node.value) { return; }

		node.value = typeof value === 'string' ?
			value :
			'' ;
	}

	function writeValueNumber(value) {
		var node = this.node;

		// Avoid updating with the same value as it sends the cursor to
		// the end of the field (in Chrome, at least).
		if (value === parseFloat(node.value)) { return; }

		node.value = typeof value === 'number' && !isNaN(value) ?
			value :
			'' ;
	}

	function writeValueCheckbox(value) {
		var node = this.node;

		// Where value is defined check against it, otherwise
		// value is "on", uselessly. Set checked state directly.
		node.checked = isDefined(node.getAttribute('value')) ?
			value === node.value :
			value === true ;
	}

	function writeValueRadio(value) {
		var node = this.node;

		// Where value="" is defined check against it, otherwise
		// value is "on", uselessly: set checked state directly.
		node.checked = isDefined(node.getAttribute('value')) ?
			value === node.value :
			value === true ;
	}

	function readValue() {
		var node = this.node;
		return node.value;
	}

	function readValueNumber() {
		var node = this.node;
		return node.value ? parseFloat(node.value) : undefined ;
	}

	function readValueCheckbox() {
		var node = this.node;

		// TODO: Why do we check attribute here?
		return isDefined(node.getAttribute('value')) ?
			node.checked ? node.value : undefined :
			node.checked ;
	}

	function readValueRadio() {
		var node = this.node;

		if (!node.checked) { return; }

		return isDefined(node.getAttribute('value')) ?
			node.value :
			node.checked ;
	}

	// Struct lifecycle

	function setup(struct, options) {
		//console.log('setup: ', struct.token);

		var transform = Transform(options.transforms, options.transformers, struct.pipe);
		var update    = catchIfDebug(function(value) {
			struct.render(transform(value));
		}, struct);
		var throttle  = Fn.throttle(update, requestAnimationFrame, cancelAnimationFrame);

		struct.update = update;
		struct.push   = throttle;
		struct.then(throttle.cancel);
	}

	function bind(struct, scope, options) {
		//console.log('bind:  ', struct.token);

		var input = struct.input = Stream.observe(struct.path, scope).latest();
		var value = input.shift();
		var shift, frameId;

		struct.scope = scope;

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
		else {
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

		if (struct.listen) {
			listen(struct, scope, value, options);
		}
	}

	function listen(struct, scope, value, options) {
		//console.log('listen:', postpad(' ', 28, struct.token) + ' scope:', scope);

		var set, invert, change;

		if (struct.path === '') { console.warn('mount: Cannot listen to path ""'); }

		set    = setPath(struct.path, scope);
		invert = InverseTransform(options.transformers, struct.pipe);
		change = pipe(function() { return struct.read(); }, invert, set);
		struct.listen(change);

		// Where the initial value of struct.path is not set, set it to
		// the value of the <input/>.
		if (value === undefined) { change(); }
	}

	function unbind(struct) {
		//console.log('unbind:', struct.token);
		struct.input && struct.input.stop();
		struct.unlisten && struct.unlisten();
		struct.scope = undefined;
	}

	function teardown(struct) {
		//console.log('teardown', struct.token);
		struct.stop();
	}

	function setupStructs(structs, options) {
		structs.forEach(function(struct) {
			// Set up structs to be pushable. Renderers already have
			// a push method and should not be throttled.
			if (!struct.push) {
				setup(struct, options);
			}
		});
	}

	function unbindStructs(structs) {
		structs.forEach(unbind);
	}

	function mount(node, options) {
		//console.log('parse: ', node);

		options = assign({}, settings, options);

		var structs = [];
		mountNode(node, options, structs);

		var setup = setupStructs;
		var old;

		// Return a read-only stream
		return {
			shift: noop,

			stop: function stop() {
				structs.forEach(teardown);
			},

			push: function push(scope) {
				if (old === scope) { return; }
				old = scope;

				// Setup structs on the first scope push, unbind them on
				// later pushes
				setup(structs, options);
				setup = unbindStructs;

				structs.forEach(function(struct) {
					bind(struct, scope, options);
				});
			}
		}
	}

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


	// Expose a way to get scopes from node for event delegation and debugging

	function findScope(node) {
		return get('scope', structs.find(function(struct) {
			return struct.node === node;
		}));
	}

	mount.getScope = function getScope(node) {
		var scope = findScope(node);
		return scope === undefined && node.parentNode ?
			getScope(node.parentNode) :
			scope ;
	};

	define(mount, {
		streams: {
			get: function() {
				return structs.slice();
			}
		}
	});

	window.mount = mount;

})(window);
