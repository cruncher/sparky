(function(window) {
	"use strict";

	var DEBUG      = false;

	var A          = Array.prototype;
	var Fn         = window.Fn;
	var dom        = window.dom;

	var assign     = Object.assign;
//	var define     = Object.defineProperties;
	var attribute  = dom.attribute;
	var get        = Fn.get;
	var id         = Fn.id;
	var nothing    = Fn.nothing;
	var noop       = Fn.noop;
	var overload   = Fn.overload;
	var set        = Fn.set;
	var toType     = Fn.toType;

	var Struct             = window.Struct;
	var ReadableStruct     = Struct.Readable;
	var writeValue         = Struct.writeValue;
    var writeValueNumber   = Struct.writeValueNumber;
    var writeValueCheckbox = Struct.writeValueCheckbox;
    var writeValueRadio    = Struct.writeValueRadio;
    var readValue          = Struct.readValue;
    var readValueNumber    = Struct.readValueNumber;
    var readValueCheckbox  = Struct.readValueCheckbox;
    var readValueRadio     = Struct.readValueRadio;
	var setup              = Struct.setup;
    var bind               = Struct.bind;
    var unbind             = Struct.unbind;
    var teardown           = Struct.teardown;
	var findScope          = Struct.getScope;


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


	function setupStructs(structs, options) {
		structs.forEach(function(struct) {
			// Set up structs to be pushable. Renderers already have
			// a push method and should not be throttled.
			if (struct.render) {
				setup(struct, options);
			}
		});
	}

	function unbindStructs(structs) {
		structs.forEach(unbind);
	}

	function mount(node, options) {
		if (DEBUG) {
			console.groupCollapsed('mount: ', node);
		}

		options = assign({}, settings, options);

		var structs = [];
		mountNode(node, options, structs);

		if (DEBUG) { console.groupEnd(); }

		var fn = setupStructs;
		var old;

		// Return a read-only stream
		return {
			shift: noop,

			stop: function stop() {
				structs.forEach(teardown);
			},

			push: function push(scope) {
				//if (DEBUG) { console.log('mount: push(scope)', scope); }
				if (old === scope) { return; }
				old = scope;

				// Setup structs on the first scope push, unbind them on
				// later pushes
				fn(structs, options);
				fn = unbindStructs;

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
	mount.parseParams      = Struct.parseParams;


	// Expose a way to get scopes from node for event delegation and debugging

	mount.getScope = function getScope(node) {
		var scope = findScope(node);
		return scope === undefined && node.parentNode ?
			getScope(node.parentNode) :
			scope ;
	};

//	define(mount, {
//		streams: {
//			get: function() {
//				return structs.slice();
//			}
//		}
//	});

	window.mount = mount;

})(window);
