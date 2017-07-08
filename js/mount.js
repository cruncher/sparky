(function(window) {
	"use strict";

	var Fn        = window.Fn;
	var Sparky    = window.Sparky;

	var debug     = Fn.debug;
	var getPath   = Fn.getPath;
	var id        = Fn.id;
	var isDefined = Fn.isDefined;
	var overload  = Fn.overload;
	var nothing   = Fn.nothing;
	var noop      = Fn.noop;
	var curry     = Fn.curry;
	var apply     = Fn.apply;
	var get       = Fn.get;
	var set       = Fn.set;
	var each      = Fn.each;

	// Matches a sparky template tag, capturing (path, filter)
	var rtagstemplate = /({{0}})\s*([\w\-\.]+)\s*(?:\|([^\}]+))?\s*{{1}}/g;
	var rtags;

	// Matches a simple sparky template tag, capturing (path)
	var rsimpletagstemplate = /{{0}}\s*([\w\-\.\[\]]+)\s*{{1}}/g;
	var rsimpletags;

	// Matches tags plus any directly adjacent text
	var rclasstagstemplate = /[^\s]*{{0}}[^\}]+{{1}}[^\s]*/g;
	var rclasstags;

	// Matches filter string, capturing (filter name, filter parameter string)
	var rfilter = /\s*([a-zA-Z0-9_\-]+)\s*(?::(.+))?/;

	// Matches anything with a space
	var rspaces = /\s+/;

	// Matches anything that contains a non-space character
	var rtext = /\S/;

	// Matches the arguments list in the result of a fn.toString()
	var rarguments = /function(?:\s+\w+)?\s*(\([\w,\s]*\))/;

	var rpath   = /[\w\-\.]+/;
	var rstring = /".*?"|'.*?'/;
	var rnumber = /[+-]?(?:\d*\.)?\d+/;
	var rbool   = /true|false/;

	var rtoken = /(\{\[)\s*(.*?)(?:\s*\|\s*(.*?))?\s*(\]\})/g;




	//var attributes = ['href', 'title', 'id', 'style', 'src', 'alt'];

	function toRenderString(value) {
		var type = typeof value;

		return value === null ? '' :
			value === undefined ? '' :
			type === 'string' ? value :
			type === 'number' ?
				Number.isNaN(value) ? '' :
				value + '' :
			type === 'boolean' ? value + '' :
			// Beautify the .toString() result of functions
			type === 'function' ? (value.name || 'function') + (rarguments.exec(value.toString()) || [])[1] :
			// Use just the Class string in '[object Class]'
			toClass(value) ;
	}

	function addClasses(classList, text) {
		var classes = text.trim().split(rspaces);
		classList.add.apply(classList, classes);
	}

	function removeClasses(classList, text) {
		var classes = text.trim().split(rspaces);
		classList.remove.apply(classList, classes);
	}

	function push(array, values) {
		array.push.apply(array, values);
	}


	// Mount

	var mountType = overload(get('nodeType'), {
		// element
		1: function(node) {
			var structs  = [];
			var children = node.childNodes;
			var n = -1;
			var child, sparky;

			while (child = children[++n]) {
				if (child.getAttribute && child.getAttribute('data-fn')) {
					sparky = Sparky(child);

					structs.push({
						path: '',
						token: 'Sparky',
						getValue: id,
						render: sparky.push
					});
				}
				else {
					push(structs, mountType(child));
				}
			}

			push(structs, mountClass(node));
			push(structs, mountAttributes(['id', 'title', 'style'], node));
			push(structs, mountTag(node));

console.log('mounted:', node, structs.length);

			return structs;
		},

		// text
		3: function(node) {
			var structs = mountString(node.nodeValue, set('nodeValue', node));
			return structs;
		},

		// Comment
		8: function() {
			return nothing;
		},

		// fragment
		11: function(node) {
			
		},

		default: noop
	});

	var mountTag = overload(dom.tag, {
		
		// HTML

		button: function(node) {
			return mountBoolean('disabled', node);
		},

		input: function(node) {
			var structs = [];
			var type    = node.type;

			push(structs, mountBoolean('disabled', node));
			push(structs, mountBoolean('required', node));
			push(structs, mountAttributes(['value'], node));
			push(structs, mountInput(node));
			push(structs, mountAttribute('name', node));

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

		img: function(node) {
			return mountAttribute('alt', node);
		},

		label: function(node) {
			return mountAttribute('for', node);
		},

		option: function(node) {
			var structs = [];

			push(structs, mountBoolean('disabled', node));
			push(structs, mountAttribute('value', node));

			return structs;
		},

		select: function(node) {
			var structs = [];

			push(structs, mountBoolean('disabled', node));
			push(structs, mountBoolean('required', node));
			push(structs, mountAttribute('value', node));
			// Two way bind here??
			push(structs, mountAttribute('name', node));

			return structs;

			//bindNodes(node, bind, unbind, get, set, setup, create, unobservers);

			// Only let strings set the value of selects
			//var unbindName = parseName(node, get, set, bind, unbind, identity, identity);
			//if (unbindName) { unobservers.push(unbindName); }
			//
			//mountAttribute(node, 'name', bind, unbind, get, unobservers);
		},

		textarea: function(node) {
			return Fn.of(
				mountBoolean('disabled', node),
				mountBoolean('required', node),
				mountAttribute('name', node)
			).join();

			// Only let strings set the value of a textarea
			//var unbindName = parseName(node, get, set, bind, unbind, identity, identity);
			//if (unbindName) { unobservers.push(unbindName); }
			//mountAttribute('name', node);
		},

		time: function(node)  {
			return mountAttributes(['datetime'], node);
		},

		//template: noop,
		//script: noop,

		// SVG

		svg: function(node) {
			return mountAttributes(['viewbox'], node);
		},

		g: function(node) {
			return mountAttributes(['transform'],  node);
		},

		path: function(node) {
			return mountAttributes(['d', 'transform'], node);
		},

		line: function(node) {
			return mountAttributes(['x1', 'x2', 'y1', 'y2', 'transform'], node);
		},

		rect: function(node) {
			return mountAttributes(['x', 'y', 'width', 'height', 'rx', 'ry', 'transform'], node);
		},

		text: function(node) {
			return mountAttributes(['x', 'y', 'dx', 'dy', 'text-anchor'], node);
		},

		use: function(node) {
			return mountAttributes(['href', 'transform'], node);
		},

		default: noop
	});

	var mountInput = overload(get('type'), {
		date: function(node) {
			return mountAttributes(['min', 'max', 'step'], node);
		},

		number: function(node) {
			return mountAttributes(['min', 'max', 'step'], node);
		},

		range: function(node) {
			return mountAttributes(['min', 'max', 'step'], node);
		},

		time: function(node) {
			return mountAttributes(['min', 'max', 'step'], node);
		},

		checkbox: function() {
			
		},

		radio: function() {
			
		},

		default: noop
	});

	function mountAttributes(names, node) {
		var structs = [];
		var name;

		while (name = names.shift()) {
			push(structs, mountAttribute(name, node));
		}

		return structs;
	}

	function mountAttribute(name, node) {
		var text = dom.attribute(name, node);

		return text ? mountString(text, function render(value) {
			node.setAttribute(name, value);
		}) : nothing ;
	}

	function mountBoolean(name, node) {

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
			token: value.trim(),
			getValue: getPath(tokens[2]),
			path: tokens[2],
			transforms: tokens[3],
			render: render
		}];

		return structs;
	}

	function mountClass(node) {
		var attr    = dom.attribute('class', node);

		// If there are no classes, go no further
		if (!attr) { return nothing; }

		var structs = [];
		var classes = dom.classes(node);

		// Extract the tags and overwrite the class with remaining text
		rclasstags.lastIndex = 0;
		var text = attr.replace(rtoken, function($0, $1, $2, $3, $4) {
			var prev    = '';

			// Create an update function for keeping sparky's classes up-to-date
			function render(string) {
				if (prev && rtext.test(prev)) { removeClasses(classes, prev); }
				if (string && rtext.test(string)) { addClasses(classes, string); }
				prev = string;
			}

			structs.push({
				token: $0,
				transforms: $3,
				path: $2,
				getValue: getPath($2),
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
			token: match[0],
			getValue: getPath(match[2]),
			path: match[2],
			transforms: match[3],
			render: function renderText(value) {
				strings[j] = toRenderString(value);
				render(strings);
			}
		});
	}

	function mountString(text, render) {
		var strings = [];
		var structs = [];
		var i = rtoken.lastIndex = 0;
		var match;

		function renderStrings(strings) {
			render(strings.join(''));
		}

		while (match = rtoken.exec(text)) {
			mountStringToken(text, renderStrings, strings, structs, i, match);
			i = rtoken.lastIndex;
		}

		return structs;
	}

	function Distribute(structs) {
		return debug(function distribute(data) {
			return structs.reduce(function(data, struct) {
				var value = struct.getValue(data);

				if (value === undefined) { return data; }

				//var transform = struct.transforms;
				var render = struct.render;
console.log(struct.path, value);
				render(value);

				return data;
			}, data);
		});
	}

	Sparky.mount = curry(function(node) {

console.groupCollapsed('Sparky: mount', node);

		var structs    = mountType(node);
		var distribute = Distribute(structs);

console.groupEnd();
console.table(structs, ["token", "path", "transform"]);

		return distribute;
	});


	// Tags

	function changeTags(ropen, rclose) {
		//rtags = Sparky.render(rtagstemplate, arguments);
		rsimpletags = Sparky.render(rsimpletagstemplate, arguments);
		rclasstags = Sparky.render(rclasstagstemplate, arguments);
	}

	changeTags(/\{\[{1,2}/, /\]{1,2}\}/);

	Object.defineProperties(Sparky, {
		rtags: {
			get: function() { return rtags; },
			enumerable: true
		},

		rsimpletags: {
			get: function() { return rsimpletags; },
			enumerable: true
		}
	});
})(this);