(function(window) {
	"use strict";

	var DEBUG      = window.DEBUG;

	var Fn         = window.Fn;
	var Observable = window.Observable;
	var Stream     = window.Stream;
	var dom        = window.dom;

	var assign     = Object.assign;
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

	// Matches anything that contains a non-space character
	var rtext = /\S/;

	// Matches the arguments list in the result of a fn.toString()
	var rarguments = /function(?:\s+\w+)?\s*(\([\w,\s]*\))/;

	var settings = {
		mount:        noop,
		transforms:   {},
		transformers: {},
		rtoken:       /(\{\[)\s*(.*?)(?:\s*(\|.*?))?\s*(\]\})/g
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

	function callReducer(value, fn) {
		fn(value);
		return value;
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
			fn   = transformers[name] ? transformers[name].transform : transforms[name] ;

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

			if (!(typeof fns[fns.length - 1] === 'function')) {
				throw new Error('Sparky: transform "' + name + '" not resulting in fn');
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
			fn   = transformers[name].invert;

			if (!fn) {
				throw new Error('Sparky: transformers "' + name + '" not found');
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


	// TODO: replace with dom.requestEvent
	function listenChange(fn) {
		var node = this.node;

		node.addEventListener('change', fn);

		return function unlisten() {
			node.removeEventListener('change', fn);
		};
	}

	function listenInput(fn) {
		var node = this.node;

		node.addEventListener('input', fn);

		return function unlisten() {
			node.removeEventListener('input', fn);
		};
	}

	function mountStringToken(text, render, strings, structs, match) {
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

	function mountString(string, render, options) {
		var rtoken  = options.rtoken;
		var i       = rtoken.lastIndex = 0;
		var match   = rtoken.exec(string);

		if (!match) { return; }

		var strings = [];
		var structs = [];

		var renderStrings = function(strings) {
			render(strings.join(''));
		};

		while (match) {
			if (match.index > i) {
				strings.push(string.slice(i, match.index));
			}

			mountStringToken(string, renderStrings, strings, structs, match);
			i = rtoken.lastIndex;
			match = rtoken.exec(string);
		}

		if (string.length > i + 1) {
			strings.push(string.slice(i));
		}

		return structs;
	}

	function mountAttributes(names, node, options) {
		var structs = [];
		var name;

		while (name = names.shift()) {
			push(structs, mountAttribute(name, node, options));
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
			token:  attr.trim(),
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

	function mountName(node, options) {
		var string = node.name;
		var rtoken = options.rtoken;

		rtoken.lastIndex = 0;

		var match = rtoken.exec(string);

		if (!match) { return; }

		return mountNameByType(node, options, match);
	}

	var types = {
		// element
		1: function(node, options) {
			var structs  = [];
			var children = node.childNodes;
			var n = -1;
			var child, renderer;

			while (child = children[++n]) {
				// Test to see if it needs a full Sparky mounting
				renderer = options.mount(child);

				if (renderer) {
					// Sparky mounted it
					structs.push(renderer);
				}
				else {
					// It's a plain old node with no data-fn
					push(structs, mountNode(child, options));
				}
			}

			push(structs, mountClass(node, options));
			push(structs, mountAttributes(['id', 'title', 'style'], node, options));
			push(structs, mountTag(node, options));

			if (DEBUG) { console.log('mounted:', node, structs.length); }

			return structs;
		},

		// text
		3: function(node, options) {
			return mountString(node.nodeValue, set('nodeValue', node), options) || nothing;
		},

		// Comment
		8: function() {
			return nothing;
		},

		// fragment
		11: function(node, options) {
			var structs  = [];
			var children = node.childNodes;
			var n = -1;
			var child;

			while (child = children[++n]) {
				push(structs, options.mount(child) || mountNode(child, options));
			}

			return structs;
		}
	};

	var tags = {
		// HTML

		a: function(node, options) {
			return mountAttribute('href', node, options);
		},

		button: function(node, options) {
			return mountBoolean('disabled', node, options);
		},

		input: function(node, options) {
			var structs = [];

			push(structs, mountBoolean('disabled', node, options));
			push(structs, mountBoolean('required', node, options));
			push(structs, mountAttributes(['value'], node, options));
			push(structs, mountInput(node, options));
			push(structs, mountName(node, options));

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
			push(structs, mountName(node, options));

			return structs;

			//bindNodes(node, bind, unbind, get, set, setup, create, unobservers);

			// Only let strings set the value of selects
			//var unbindName = parseName(node, get, set, bind, unbind, identity, identity);
			//if (unbindName) { unobservers.push(unbindName); }
			//
			//mountAttribute(node, 'name', bind, unbind, get, unobservers);
		},

		textarea: function(node, options) {
			var structs = [];

			push(structs, mountBoolean('disabled', node, options));
			push(structs, mountBoolean('required', node, options));
			push(structs, mountName(node, options));

			return structs;

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
	};

	var inputs = {
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

		checkbox: function() {},

		radio: function() {},

		default: noop
	};

	var namedInputs = {
		checkbox: function(node, options, match) {
			return [{
				node:  node,
				token: match[0],
				path:  match[2],
				pipe:  match[3],

				read: function read() {
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

				listen: listenChange
			}];
		},

		radio: function(node, options, match) {
			return [{
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

				listen: listenChange
			}];
		},

		number: function(node, options, match) {
			return [{
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

				listen: listenInput
			}];
		},

		range: function(node, options, match) {
			return [{
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

				listen: listenInput
			}];
		},

		default: function(node, options, match) {
			return [{
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

				listen: listenInput
			}];
		}
	};

	var mountNode  = overload(get('nodeType'), types);
	var mountTag   = overload(dom.tag, tags);
	var mountInput = overload(get('type'), inputs);
	var mountNameByType = overload(get('type'), namedInputs);

	function setupStruct(struct, options) {
		var transform = Transform(options.transforms, options.transformers, struct.pipe);
		struct.push = compose(struct.render, transform);
		struct.throttle = Fn.throttle(struct.push, requestAnimationFrame, cancelAnimationFrame) ;
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

				if (DEBUG) {
					console.groupCollapsed('Sparky: update', node);
				}

				var observable = Observable(data);

				// Rebind structs
				structs.forEach(function(struct) {
					// Unbind Structs
					struct.unbind && struct.unbind();

					// Set up struct. Sparky objects, which masquerade as structs,
					// already have a .push() method. They don't need to be set
					// up. Also, they don't need to be throttled
					if (!struct.push) {
						setupStruct(struct, options);
					}

					// Rebind struct
					var input = struct.input = Stream.observe(struct.path, observable);
					var value = input.latest().shift();

					// If there is an initial scope render it synchronously, as
					// it is assumed we are already working inside an animation
					// frame
					if (value !== undefined) { struct.push(value); }

					// Render future scopes at throttled frame rate, where
					// throttle is defined
					input.each(struct.throttle || struct.push);

					var set, invert, change, unlisten;

					// Listen to changes
					if (struct.listen) {
						set = setPath(struct.path, observable);
						invert = InverseTransform(options.transformers, struct.pipe);
						change = pipe(function() { return struct.read(); }, invert, set);
						unlisten = struct.listen(change);

						if (value === undefined) { change(); }
					}

					struct.unbind = function(data) {
						struct.throttle && struct.throttle.cancel();
						struct.input.stop();
						if (struct.listen) { unlisten(); }
					};
				});

				if (DEBUG) {
					console.groupEnd();
				}

				return data;
			}
		}
	}

	function mount(node, options) {
		options = assign({}, settings, options);

		if (DEBUG) {
			console.groupCollapsed('Sparky: mount ', node);
		}

		var structs = mountNode(node, options);

		if (DEBUG) {
			console.table(structs, ["token", "path", "pipe"]);
			console.groupEnd();
		}

		return RenderStream(structs, options, node);
	}


	// Export

	mount.types  = types;
	mount.tags   = tags;
	mount.inputs = inputs;
	mount.mountAttribute = mountAttribute;
	mount.mountBoolean   = mountBoolean;
	mount.mountInput     = mountInput;
	mount.mountName      = mountName;

	window.mount = mount;

})(this);
