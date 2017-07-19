(function(window) {
	"use strict";

	var DEBUG      = window.DEBUG;

	var Fn         = window.Fn;
	var Stream     = window.Stream;
	var Sparky     = window.Sparky;

	var assign     = Object.assign;
	var apply      = Fn.apply;
	var curry      = Fn.curry;
	var debug      = Fn.debug;
	var each       = Fn.each;
	var get        = Fn.get;
	var getPath    = Fn.getPath;
	var id         = Fn.id;
	var isDefined  = Fn.isDefined;
	var nothing    = Fn.nothing;
	var noop       = Fn.noop;
	var overload   = Fn.overload;
	var pipe       = Fn.pipe;
	var set        = Fn.set;
	var toClass    = Fn.toClass;
	var toType     = Fn.toType;

	// Matches a sparky template tag, capturing (path, filter)
	//var rtagstemplate = /({{0}})\s*([\w\-\.]+)\s*(?:\|([^\}]+))?\s*{{1}}/g;
	//var rtags;

	// Matches a simple sparky template tag, capturing (path)
	//var rsimpletagstemplate = /{{0}}\s*([\w\-\.\[\]]+)\s*{{1}}/g;
	//var rsimpletags;

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

	//var rpath   = /[\w\-\.]+/;
	//var rstring = /".*?"|'.*?'/;
	//var rnumber = /[+-]?(?:\d*\.)?\d+/;
	//var rbool   = /true|false/;

	var settings = {
		mount:      noop,
		transforms: {},
		rtoken:     /(\{\[)\s*(.*?)(?:\s*(\|.*?))?\s*(\]\})/g
	};

	var toRenderString = overload(toType, {
		'boolean': function(value) {
			return value + '';
		},

		'function': function(value) {
			return (value.name || 'function')
				+ (rarguments.exec(value.toString()) || [])[1];
		},

		'number': function(value) {
			return Number.isNaN(value) ? '' : value + '' ;
		},

		'string': id,

		'symbol': function(value) { return value.toString(); },

		'undefined': function() { return ''; },

		'object': function(value) {
			return value === null ? '' : JSON.stringify(value);
		},

		'default': JSON.stringify
	});

	function addClasses(classList, text) {
		var classes = toRenderString(text).trim().split(rspaces);
		classList.add.apply(classList, classes);
	}

	function removeClasses(classList, text) {
		var classes = toRenderString(text).trim().split(rspaces);
		classList.remove.apply(classList, classes);
	}

	function push(array, values) {
		array.push.apply(array, values);
	}

	function call(fn) { return fn(); }


	// Transform

	var rtransform = /\|\s*([\w\-]+)\s*(?::([^|]+))?/g;

	function Transform(transforms, string) {
		if (!string) { return id; }

		var fns = [];
		var token, name, fn, args;

		rtransform.lastIndex = 0;

		while (
			rtransform.lastIndex < string.length
			&& (token = rtransform.exec(string))
		) {
			name = token[1];
			fn   = transforms[name];

			if (!fn) {
				throw new Error('Sparky: transform "' + name + '" not found');
			}

			if (token[2]) {
				args = JSON.parse('[' + token[2].replace(/'/g, '"') + ']');
				fns.push(fn.apply(null, args));
			}
			else {
				fns.push(fn);
			}
		}

		return pipe.apply(null, fns);
	}


	// Mount

	var mountType = overload(get('nodeType'), {
		// element
		1: function(node, options) {
			var structs  = [];
			var children = node.childNodes;
			var n = -1;
			var child;

			while (child = children[++n]) {
				push(structs, options.mount(child) || mountType(child, options));
			}

			push(structs, mountClass(node, options));
			push(structs, mountAttributes(['id', 'title', 'style'], node, options));
			push(structs, mountTag(node, options));

			if (DEBUG) { console.log('mounted:', node, structs.length); }

			return structs;
		},

		// text
		3: function(node, options) {
			var structs = mountString(node.nodeValue, set('nodeValue', node), options);
			return structs;
		},

		// Comment
		8: function() {
			return nothing;
		},

		// fragment
		11: function(node, options) {
			
		},

		default: noop
	});

	var mountTag = overload(dom.tag, {
		
		// HTML

		button: function(node, options) {
			return mountBoolean('disabled', node, options);
		},

		input: function(node, options) {
			var structs = [];
			var type    = node.type;

			push(structs, mountBoolean('disabled', node, options));
			push(structs, mountBoolean('required', node, options));
			push(structs, mountAttributes(['value'], node, options));
			push(structs, mountInput(node, options));
			push(structs, mountAttribute('name', node, options));

			return structs;

			//var unbindName = type === 'number' || type === 'range' ?
			//	// Only let numbers set the value of number and range inputs
			//	parseName(node, get, set, bind, unbind, floatToString, stringToFloat) :
			//// Checkboxes default to value "on" when the value attribute
			//// is not given. Make them behave as booleans.
			//(type === 'checkbox' || type === 'radio') && !isDefined(node.getAttribute('value')) ?
			//	parseName(node, get, set, bind, unbind, boolToStringOn, stringOnToBool) :
			//	// Only let strings set the value of other inputs
			//	parseName(node, get, set, bind, unbind, identity, identity) ;

			//if (unbindName) { unobservers.push(unbindName); }
			
			//mountAttribute(node, 'name', bind, unbind, get, unobservers);
		},

		img: function(node, options) {
			return mountAttribute('alt', node, options);
		},

		label: function(node, options) {
			return mountAttribute('for', node, options);
		},

		option: function(node, options) {
			var structs = [];

			push(structs, mountBoolean('disabled', node, options));
			push(structs, mountAttribute('value', node, options));

			return structs;
		},

		select: function(node, options) {
			var structs = [];

			push(structs, mountBoolean('disabled', node, options));
			push(structs, mountBoolean('required', node, options));
			push(structs, mountAttribute('value', node, options));
			// Two way bind here??
			push(structs, mountAttribute('name', node, options));

			return structs;

			//bindNodes(node, bind, unbind, get, set, setup, create, unobservers);

			// Only let strings set the value of selects
			//var unbindName = parseName(node, get, set, bind, unbind, identity, identity);
			//if (unbindName) { unobservers.push(unbindName); }
			//
			//mountAttribute(node, 'name', bind, unbind, get, unobservers);
		},

		textarea: function(node, options) {
			return Fn.of(
				mountBoolean('disabled', node, options),
				mountBoolean('required', node, options),
				mountAttribute('name', node, options)
			).join();

			// Only let strings set the value of a textarea
			//var unbindName = parseName(node, get, set, bind, unbind, identity, identity);
			//if (unbindName) { unobservers.push(unbindName); }
			//mountAttribute('name', node);
		},

		time: function(node, options)  {
			return mountAttributes(['datetime'], node, options);
		},

		//template: noop,
		//script: noop,

		// SVG

		svg: function(node, options) {
			return mountAttributes(['viewbox'], node, options);
		},

		g: function(node, options) {
			return mountAttributes(['transform'],  node, options);
		},

		path: function(node, options) {
			return mountAttributes(['d', 'transform'], node, options);
		},

		line: function(node, options) {
			return mountAttributes(['x1', 'x2', 'y1', 'y2', 'transform'], node, options);
		},

		rect: function(node, options) {
			return mountAttributes(['x', 'y', 'width', 'height', 'rx', 'ry', 'transform'], node, options);
		},

		text: function(node, options) {
			return mountAttributes(['x', 'y', 'dx', 'dy', 'text-anchor'], node, options);
		},

		use: function(node, options) {
			return mountAttributes(['href', 'transform'], node, options);
		},

		default: noop
	});

	var mountInput = overload(get('type'), {
		date: function(node, options) {
			return mountAttributes(['min', 'max', 'step'], node, options);
		},

		number: function(node, options) {
			return mountAttributes(['min', 'max', 'step'], node, options);
		},

		range: function(node, options) {
			return mountAttributes(['min', 'max', 'step'], node, options);
		},

		time: function(node, options) {
			return mountAttributes(['min', 'max', 'step'], node, options);
		},

		checkbox: function() {
			
		},

		radio: function() {
			
		},

		default: noop
	});

	function mountAttributes(names, node, options) {
		var structs = [];
		var name;

		while (name = names.shift()) {
			push(structs, mountAttribute(options, name, node));
		}

		return structs;
	}

	function mountAttribute(name, node, options) {
		var text   = dom.attribute(name, node);

		return text ? mountString(text, function render(value) {
			node.setAttribute(name, value);
		}, options) : nothing ;
	}

	function mountBoolean(name, node, options) {
		var rtoken = options.rtoken;

		// Look for data-attributes before attributes.
		//
		// In IE, the style attribute does not return invalid CSS text content,
		// so Sparky can't read tags in it.
		//
		// In FF, the disabled attribute is set to the previous value that the
		// element had when the page is refreshed, so it contains no sparky
		// tags. The proper way to address this problem is to set
		// autocomplete="off" on the parent form or on the field.
		//
		// Remember SVG has case sensitive attributes.

		var attr = node.getAttribute('data-' + name) || node.getAttribute(name) ;
		if (!attr) { return nothing; }

		rtoken.lastIndex = 0;
		var tokens = rtoken.exec(attr.trim());
		if (!tokens) { return nothing; }

		var render = name in node ?
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
			} ;

		var structs = [{
			token:  value.trim(),
			path:   tokens[2],
			pipe:   tokens[3],
			render: render
		}];

		return structs;
	}

	function mountClass(node, options) {
		var rtoken = options.rtoken;
		var attr   = dom.attribute('class', node);

		// If there are no classes, go no further
		if (!attr) { return nothing; }

		var structs = [];
		var classes = dom.classes(node);

		// Extract the tags and overwrite the class with remaining text
		var text = attr.replace(rtoken, function($0, $1, $2, $3, $4) {
			var prev    = '';

			// Create an update function for keeping sparky's classes up-to-date
			function render(string) {
				if (prev && rtext.test(prev)) { removeClasses(classes, prev); }
				if (string && rtext.test(string)) { addClasses(classes, string); }
				prev = string;
			}

			structs.push({
				token:  $0,
				path:   $2,
				pipe:   $3,
				render: render
			});

			return '';
		});

		node.setAttribute('class', text);
		return structs;
	}

	function mountStringToken(text, render, strings, structs, i, match) {
		strings.push(text.slice(i, match.index));
		strings.push('');

		var j = strings.length - 1;

		structs.push({
			token:  match[0],
			path:   match[2],
			pipe:   match[3],
			render: function renderText(value) {
				strings[j] = toRenderString(value);
				render(strings);
			}
		});
	}

	function mountString(string, render, options) {
		var strings = [];
		var structs = [];
		var rtoken  = options.rtoken;
		var i       = rtoken.lastIndex = 0;
		var match;

		function renderStrings(strings) {
			render(strings.join(''));
		}

		while (match = rtoken.exec(string)) {
			mountStringToken(string, renderStrings, strings, structs, i, match);
			i = rtoken.lastIndex;
		}

		return structs;
	}

	function mount(node, options) {
		options = assign({}, settings, options);

		if (DEBUG) {
			console.groupCollapsed('Sparky: mount ', node);
		}

		var structs = mountType(node, options);

		if (DEBUG) {
			console.table(structs, ["token", "path", "pipe"]);
			console.groupEnd();
		}

		var stops = nothing;
		var old;

		return function update(data) {
			if (old === data) { return; }
			old = data;

			if (DEBUG) {
				console.groupCollapsed('Sparky: update', node);
				console.log(data);
			}

			var observable = Observable(data);

			stops.forEach(call);

			stops = structs.map(function(struct) {
				struct.transform = struct.transform || Transform(options.transforms, struct.pipe);

				return Stream
				.observe(struct.path, observable)
				.map(struct.transform)
				.each(struct.render)
				.stop;
			});

			if (DEBUG) {
				console.groupEnd();
			}

			return data;
		};
	}


	// Export

	window.mount = mount;

})(this);
