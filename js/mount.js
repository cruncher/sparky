(function(window) {
	"use strict";

	var DEBUG      = window.DEBUG;

	var Fn         = window.Fn;
	var Observable = window.Observable;
	var Stream     = window.Stream;
	var dom        = window.dom;

	var assign     = Object.assign;
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
		prefix:       'data-',
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

	var listen = curry(function(node, type, fn) {
		node.addEventListener(type, fn);
		return function unlisten() {
			node.removeEventListener('input', fn);
		};
	}, true);

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
		var text   = dom.attribute(name, node);

		return text ? mountString(text, function render(value) {
			node.setAttribute(name, value);
		}, options, structs) : nothing ;
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

		var attr = node.getAttribute(options.prefix + name) || node.getAttribute(name) ;
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

	function mountName(node, options, structs) {
		var string = node.name;
		var rtoken = options.rtoken;
		rtoken.lastIndex = 0;

		var match = rtoken.exec(string);
		if (!match) { return; }

		return mountNameByType(node, options, match, structs);
	}

	var types = {
		// element
		1: function(node, options, structs) {
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
					mountNode(child, options, structs);
				}
			}

			mountClass(node, options, structs);
			mountAttributes(['id', 'title', 'style'], node, options, structs);
			mountTag(node, options, structs);

			if (DEBUG) { console.log('mounted:', node, structs.length); }
		},

		// text
		3: function(node, options, structs) {
			mountString(node.nodeValue, set('nodeValue', node), options, structs);
		},

		// Comment
		8: noop,

		// fragment
		11: function(node, options, structs) {
			var children = node.childNodes;
			var n = -1;
			var child, struct;

			while (child = children[++n]) {
				// If the optional mounter returns a struct
				struct = options.mount(child);

				if (struct) {
					structs.push(struct);
				}
				else {
					mountNode(child, options, structs);
				}
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
			mountAttributes(['value'], node, options, structs);
			mountInput(node, options, structs);
			mountName(node, options, structs);
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
			mountAttribute('value', node, options, structs);
			// Two way bind here??
			mountName(node, options, structs);
		},

		textarea: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
			mountBoolean('required', node, options, structs);
			mountName(node, options, structs);
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

	var mountNode       = overload(get('nodeType'), types);
	var mountTag        = overload(dom.tag, tags);
	var mountInput      = overload(get('type'), inputs);
	var mountNameByType = overload(get('type'), inputTypes);

	function setupStruct(struct, options) {
		var transform = Transform(options.transforms, options.transformers, struct.pipe);
		var update    = compose(struct.render, transform);
		var throttle  = Fn.throttle(update, requestAnimationFrame, cancelAnimationFrame);

		struct.update = update;
		struct.push = throttle;
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
				var unlisten;

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
						set = setPath(struct.path, observable);
						invert = InverseTransform(options.transformers, struct.pipe);
						change = pipe(function() { return struct.read(); }, invert, set);
						unlisten = struct.listen(change);

						if (value === undefined) { change(); }
					}
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

		var structs = [];
		mountNode(node, options, structs);

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
