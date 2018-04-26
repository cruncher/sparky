
(function(window) {
	"use strict";

	const DEBUG  = false;

	const Fn     = window.Fn;
	const dom    = window.dom;

	const invoke = Fn.invoke;
	const now    = dom.now;

	// Render queue

	const queue = new Set();
	const data  = [];

	var point;
	var frame;

	function run(time) {
		if (DEBUG) {
			point = {};
			point.frameTime   = time / 1000;
			point.runTime     = now();
			point.queuedFns   = queue.size;
			point.insertedFns = 0;
			console.groupCollapsed('frame', point.frameTime.toFixed(3));
		}

		frame = true;

		// Use a .forEach() to support IE11, which doesnt have for..of
		queue.forEach(invoke('call', [null, time]));

		//var fn;
		//for (fn of queue) {
		//	fn(time);
		//}

		queue.clear();
		frame = undefined;

		if (DEBUG) {
			point.duration = now() - point.runTime;
			data.push(point);
			//console.log('Render duration ' + (point.duration).toFixed(3) + 's');
			console.groupEnd();
		}
	}

	function cue(fn) {
		if (queue.has(fn)) {
			//if (DEBUG) { console.warn('frame: Trying to add an existing fn. Dropped', fn.name + '()'); }
			return;
		}

		// Functions cued during frame are run syncronously (to preserve
		// inner-DOM-first order of execution during setup)
		if (frame === true) {
			if (DEBUG) { ++point.insertedFns; }
			fn();
			return;
		}

		queue.add(fn);

		if (frame === undefined) {
			//if (DEBUG) { console.log('(request master frame)'); }
			frame = requestAnimationFrame(run);
		}
	}

	function uncue(fn) {
		queue.delete(fn);

		if (frame !== undefined && frame !== true && queue.size === 0) {
			//if (DEBUG) { console.log('(cancel master frame)'); }
			cancelAnimationFrame(frame);
			frame = undefined;
		}
	}

	window.frame = {
		cue: cue,
		uncue: uncue,
		data: data
	};
})(window);
(function(window) {
    "use strict";

	const DEBUG      = false;

	const Fn         = window.Fn;
	const Stream     = window.Stream;
	const frame      = window.frame;
	const Observable = window.Observable;

	const assign     = Object.assign;
    const get        = Fn.get;
	const id         = Fn.id;
	const noop       = Fn.noop;
	const pipe       = Fn.pipe;
	const remove     = Fn.remove;
    const getPath    = Fn.getPath;
    const setPath    = Fn.setPath;
	const cue        = frame.cue;
	const uncue      = frame.uncue;
	const observe    = Observable.observe;


//    var toLog   = overload(toType, {
//        function: function(fn) { return fn.toString(); },
//        object: JSON.stringify,
//        default: id
//    });
//
//    function catchIfDebug(fn, struct) {
//		return function(value) {
//			try {
//				return fn.apply(this, arguments);
//			}
//			catch(e) {
//				//console.log('Original error:', e.stack);
//				throw new Error('Sparky failed to render ' + struct.token + ' with value ' + toLog(value) + '.\n' + e.stack);
//			}
//		}
//	}

    // Transform

	var rtransform = /\|\s*([\w-]+)\s*(?::([^|]+))?/g;
    var rsinglequotes = /'/g;

	// TODO: make parseParams() into a module - it is used by sparky.js also
	var parseParams = (function() {
		//                   null   true   false   number                                     "string"                   'string'                   array        function(args)   string
		var rvalue = /\s*(?:(null)|(true)|(false)|(-?(?:\d+|\d+\.\d+|\.\d+)(?:[eE][-+]?\d+)?)|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\[[^\]]*\])|(\w+)\(([^)]+)\)|([^,\s]+))\s*,?/g;

		function toValue(result, string) {
			if (!result) {
				throw new Error('Sparky: unable to parse transform args "' + string + '"');
			}

                // null
			return result[1] ? null :
                // boolean
				result[2] ? true :
				result[3] ? false :
                // number
				result[4] ? parseFloat(result[4]) :
                // "string"
				result[5] ? result[5] :
                // 'string'
				result[6] ? result[6] :
                // array
                result[7] ? JSON.parse(result[7].replace(rsinglequotes, '"')) :
                // function()
                result[8] ? Sparky.transforms[result[8]].apply(null, JSON.parse('[' + result[9].replace(rsinglequotes, '"') + ']')) :
                // string
                result[10] ? result[10] :
                //
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

    // Struct

    var structs = [];

    var removeStruct = remove(structs);

    function addStruct(struct) {
        structs.push(struct);
    }

    function Struct(node, token, path, render, pipe) {
        //console.log('token: ', postpad(' ', 28, token) + ' node: ', node);

        addStruct(this);
        this.node    = node;
        this.token   = token;
        this.path    = path;
        this.render  = render;
        this.pipe    = pipe;
    }

    assign(Struct.prototype, {
        render:  noop,
        transform: id,

        stop: function stop() {
            uncue(this.cuer);
            removeStruct(this);
        },

        update: function(time) {
            var struct = this;
            var transform = this.transform;
            var value = struct.input && struct.input.shift();

            if (DEBUG) { console.log('update:', struct.token, value, struct.originalValue); }

            if (value === undefined) {
                struct.render(struct.originalValue);
            }
            else {
                struct.render(transform(value));
            }
        }
    });

    function ReadableStruct(node, token, path, render, type, read, pipe) {
        // ReadableStruct extends Struct with listeners and read functions
        Struct.call(this, node, token, path, render, pipe);
        this.type = type;
        this.read = read;
    }

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


    // Struct lifecycle

    function setup(struct, options) {


        struct.transform = Transform(options.transforms, options.transformers, struct.pipe);
        struct.originalValue = struct.read ? struct.read() : '' ;
        if (DEBUG) { console.log('setup: ', struct.token, struct.originalValue); }
    }

    function eachFrame(stream, fn) {
        var unobserve = noop;

        function update(time) {
            var scope = stream.shift();
            // Todo: shouldnt need this line - observe(undefined) shouldnt call fn
            if (scope === undefined) { return; }

            function render(time) {
                fn(scope);
            }

            unobserve();
            unobserve = observe(scope, '', function() {
                cue(render);
            });
        }

        cue(update);

        if (stream.on) {
            stream.on('push', function() {
                cue(update);
            });
        }
    }

    function bind(struct, scope, options) {
        if (DEBUG) { console.log('bind:  ', struct.token); }

        var input = struct.input = Stream.observe(struct.path, scope).latest();

        struct.scope = scope;

        var flag = false;
        var change;

        // If struct is an internal struct (as opposed to a Sparky instance)
        if (struct.render) {
            if (struct.listen) {
                change = listen(struct, scope, options);

                struct.cuer = function updateReadable() {
                    struct.update();

                    if (flag) { return; }
                    flag = true;

                    input.on('push', function() {
                        cue(updateReadable);
                    });

                    var value = getPath(struct.path, scope);

                    // Where the initial value of struct.path is not set, set it to
                    // the value of the <input/>.
                    if (value === undefined) {
                        change();
                    }
                };

                cue(struct.cuer);
                struct.listen(change);
            }
            else {
                struct.cuer = function update() {
                    struct.update();
                    if (flag) { return; }
                    flag = true;
                    input.on('push', function() {
                        cue(update);
                    });
                };

                cue(struct.cuer);
            }

            return;
        }

        if (DEBUG) { console.log('struct is Sparky'); }
        eachFrame(input, struct.push);
    }

    function listen(struct, scope, options) {
        //console.log('listen:', postpad(' ', 28, struct.token) + ' scope:', scope);

        var set, invert;

        if (struct.path === '') { console.warn('mount: Cannot listen to path ""'); }

        set    = setPath(struct.path, scope);
        invert = InverseTransform(options.transformers, struct.pipe);
        return pipe(function() { return struct.read(); }, invert, set);
    }

    function unbind(struct) {
        if (DEBUG) { console.log('unbind:', struct.token); }
        // Todo: only uncue on teardown
        //struct.uncue();
        struct.input && struct.input.stop();
        struct.unlisten && struct.unlisten();
        struct.scope = undefined;
    }

    function teardown(struct) {
        if (DEBUG) { console.log('teardown', struct.token); }
        unbind(struct);
        struct.stop();
    }

    window.Struct = Struct;

    Struct.Readable           = ReadableStruct;
    Struct.setup = setup;
    Struct.bind = bind;
    Struct.listen = listen;
    Struct.unbind = unbind;
    Struct.teardown = teardown;
    Struct.parseParams = parseParams;

    Struct.findScope = function findScope(node) {
		return get('scope', structs.find(function(struct) {
			return struct.node === node;
		}));
	};
})(window);
(function(window) {
	"use strict";

	const DEBUG      = false;

	const A          = Array.prototype;
	const Fn         = window.Fn;
	const dom        = window.dom;

	const assign     = Object.assign;
//	const define     = Object.defineProperties;
	const attribute  = dom.attribute;
	const get        = Fn.get;
	const id         = Fn.id;
	const isDefined  = Fn.isDefined;
	const nothing    = Fn.nothing;
	const noop       = Fn.noop;
	const overload   = Fn.overload;
	const set        = Fn.set;
	const toType     = Fn.toType;

	const Struct             = window.Struct;
	const ReadableStruct     = Struct.Readable;
	const setup              = Struct.setup;
    const bind               = Struct.bind;
    const unbind             = Struct.unbind;
    const teardown           = Struct.teardown;
	const findScope          = Struct.getScope;


	// Matches tags plus any directly adjacent text
	//var rclasstagstemplate = /[^\s]*{{0}}[^\}]+{{1}}[^\s]*/g;
	//var rclasstags;

	// Matches filter string, capturing (filter name, filter parameter string)
	//var rfilter = /\s*([a-zA-Z0-9_\-]+)\s*(?::(.+))?/;

	// Matches anything with a space
	const rspaces = /\s+/;

	// Matches empty or spaces-only string
	const rempty  = /^\s*$/;

	// Matches anything that contains a non-space character
	const rtext = /\S/;

	// Matches the arguments list in the result of a fn.toString()
	const rarguments = /function(?:\s+\w+)?\s*(\([\w,\s]*\))/;

	const settings = {
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

		// new Struct(node, token, path, render)
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

	// Struct value read and write

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

        node.value = typeof value === 'number' && !Number.isNaN(value) ?
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


	const types = {
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

	const tags = {

		// HTML

		a: function(node, options, structs) {
			mountAttribute('href', node, options, structs);
		},

		button: function(node, options, structs) {
			mountBoolean('disabled', node, options, structs);
		},

		form: function(node, options, structs) {
			mountAttribute('method', node, options, structs);
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

	const inputs = {
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

	const mountNode  = overload(get('nodeType'), types);
	const mountTag   = overload(dom.tag, tags);
	const mountInput = overload(get('type'), inputs);


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
		var scope = Struct.findScope(node);
		return scope === undefined && node.parentNode ?
			getScope(node.parentNode) :
			scope ;
	};

	window.mount = mount;

})(window);
(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('Sparky      - https://github.com/cruncher/sparky');
})(window);

(function(window) {
	"use strict";

	var DEBUG          = window.DEBUG;

	var Fn             = window.Fn;
	var Observable     = window.Observable;
	var Stream         = window.Stream;
	var dom            = window.dom;
	var mount          = window.mount;

	var assign         = Object.assign;
	var deprecate      = Fn.deprecate;
	var getPath        = Fn.getPath;
	var invoke         = Fn.invoke;
	var noop           = Fn.noop;
	var nothing        = Fn.nothing;
	var tag            = dom.tag;
	var preventDefault = dom.preventDefault;
	var parseParams    = mount.parseParams;


	// Matches:     xxxx: xxx, "xxx", 'xxx'
	var rfn       = /\s*([-\w]+)(?:\s*:\s*((?:"[^"]*"|'[^']*'|[^\s,]+)(?:\s*,\s*(?:"[^"]*"|'[^']*'|[^\s,]+))*))?/;

	var settings = {
		// Child mounting function
		mount: function mount(node, options, streams) {
			var fn = dom.attribute(Sparky.attributeFn, node);
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
		return selector.replace(/\//g, '\\/');
	}

	function toObservableOrSelf(object) {
		return Observable(object) || object;
	}

	function Sparky(selector, data, options) {
		if (!Sparky.prototype.isPrototypeOf(this)) {
			return new Sparky(selector, data, options);
		}

		var node = typeof selector === 'string' ?
			document.querySelector(escapeSelector(selector)) :
			selector ;

		if (!node) {
			throw new Error('Sparky: "' + selector + '" not found.');
		}

		var fnstring = options && options.fn || dom.attribute(Sparky.attributeFn, node) || '';
		var calling  = true;
		var sparky   = this;
		var input;
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

			// No more tokens, launch Sparky
			if (!token) {
				sparky.continue = noop;
				render();
				return sparky;
			}

			//console.group(token[0].trim());
			var fn = Sparky.fn[token[1]];

			// Function not found
			if (!fn) {
				throw new Error('Sparky: fn "' + token[1] + '" not found in Sparky.fn');
			}

			// Gaurantee that params exists, at least.
			var params = token[2] ? parseParams(token[2]) : nothing ;

			calling    = true;
			fnstring   = fnstring.slice(token[0].length);

			// Call Sparky fn, gauranteeing the output is a non-duplicate stream
			// of observables. Todo: we should not need to be so strict about
			// .dedup() when we create a disticntion between mutation and
			// path changes in Observables.
			var output = fn.call(sparky, node, input, params);

			input = output ?
				output.map(toObservableOrSelf).dedup() :
				input ;
			//if (!calling) { console.log(token[0].trim() + ' interrupted!'); }
			//console.groupEnd();

			// If fns have been interrupted calling is false
			return calling && start();
		}

		function Source(notify, stop) {
			this.shift = function() {
				var object;

				if (data !== undefined) {
					object = data;
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

		// Initialise this as a stream and set input to a deduped version
		Stream.call(this, Source);
		input = this.map(toObservableOrSelf).dedup();

		this.interrupt = interrupt;
		this.continue  = start;

		start();
	}

	Sparky.prototype = Stream.prototype;

	assign(Sparky, {
		attributeFn:     'sparky-fn',
		attributePrefix: 'sparky-',

		fn: {
			global: function(node, stream, params) {
				var scope = getPath(params[0], window);

				if (scope === undefined) {
					console.warn('Sparky.fn.global:path – no object at path ' + params[0]);
					return Fn.of();
				}

				return Fn.of(scope);
			},

			get: function(node, input, params) {
				// TODO: We should be able to express this with
				// input.chain( .. Stream.observe(params[0], objet) .. )
				// but because Fn#join() doesn't know how to handle streams
				// we cant.

				var output = Stream.of();
				var stop = noop;

				input.each(function(object) {
					stop();
					stop = Stream
					.observe(params[0], object)
					.each(output.push)
					.stop;
				});

				this.then(function() {
					stop();
				});

				return output;
			},

			if: function(node, stream, params) {
				var name = params[0];
				var mark = Sparky.MarkerNode(node);
				var visible = false;

				// Put the marker in place and remove the node
				dom.before(node, mark);
				dom.remove(node);

				return stream.tap(function(scope) {
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
				this.interrupt();
			},

			'prevent-on': function preventSubmitCtrl(node, stream, params) {
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
			},

			scope: Fn.deprecate(function(node, stream, params) {
				return Sparky.fn.find.apply(this, arguments);
			}, 'Deprecated Sparky fn scope:path renamed find:path'),

			ignore: deprecate(function ignore(node, stream) {
				console.log(this.interrupt(), node, stream);
			}, 'Sparky: fn "ignore" renamed "stop".')
		},

		transforms: {},

		MarkerNode: function MarkerNode(node) {
			// A text node, or comment node in DEBUG mode, for marking a
			// position in the DOM tree so it can be swapped out with some
			// content in the future.

			if (!DEBUG) {
				return dom.create('text', '');
			}

			var attrFn  = node && node.getAttribute(Sparky.attributeFn);
			return dom.create('comment', tag(node) + (attrFn ? ' ' + Sparky.attributeFn + '="' + attrFn + '"' : ''));
		},

		getScope: mount.getScope
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

})(window);
(function(window) {
    var DEBUG   = window.DEBUG;
    var axios   = window.axios;
    var jQuery  = window.jQuery;
    var Fn      = window.Fn;
    var Sparky  = window.Sparky;
    var Stream  = window.Stream;

    var assign    = Object.assign;
    var fetch     = window.fetch;
    var get       = Fn.get;
    var getData   = get('data');

    var cache     = {};

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

    function importScope(url, scopes) {
        request(url)
        .then(function(data) {
            if (!data) { return; }
            cache[url] = data;
            scopes.push(data);
        })
        .catch(function(error) {
            console.warn('Sparky: no data found at', url);
            //throw error;
        });
    }

    assign(Sparky.fn, {
        load: function load(node, stream, params) {
            var path = params[0];

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
            var path = params[0];

            if (DEBUG && !path) {
                throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="import:url" requires a url.');
            }

            var scopes = Stream.of();

            if (/\$\{(\w+)\}/.test(path)) {
                stream.each(function(scope) {
                    var url = path.replace(/\$\{(\w+)\}/g, function($0, $1) {
                        return scope[$1];
                    });

                    // If the resource is cached...
                    if (cache[url]) {
                        scopes.push(cache[url]);
                    }
                    else {
                        importScope(url, scopes);
                    }
                });

                return scopes;
            }

            // If the resource is cached, return it as a readable
            if (cache[path]) {
                return Fn.of(cache[path]);
            }

            importScope(path, scopes);
            return scopes;
        }
    });
})(window);
(function(window) {
    "use strict";

    var DEBUG          = window.DEBUG;

    var dom            = window.dom;
    var Sparky         = window.Sparky;

    var assign         = Object.assign;
    var attribute      = dom.attribute;
    var events         = dom.events;
    var preventDefault = dom.preventDefault;

    function getCookie(name) {
        var cookieValue = null;
        var cookies, cookie, i;

        if (document.cookie && document.cookie !== '') {
            cookies = document.cookie.split(';');
            for (i = 0; i < cookies.length; i++) {
                cookie = cookies[i] && cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    assign(Sparky.fn, {
        'request-on-submit': function(node, scopes) {
            var type = 'submit';
            var scope;

            events(type, node)
            .tap(preventDefault)
            .each(function(e) {
                var method = attribute('method', node);
                var action = attribute('action', node);

                // Todo: Use request fn from resouce
                request({
                    url:    action,
                    method: method,
                    data:   scope,
                    headers: {
                        "X-CSRFToken": getCookie('csrftoken')
                    }
                })
                .then(function(object) {
                    //console.log('SUCCESS', method, object);
                    assign(scope, object);
                })
                .catch(function(thing) {
                    //console.log('FAIL', thing, thing.response.data);
                    dom.events.trigger(node, 'dom-error', {
                        detail: thing.response.data
                    });
                });
            });

            return scopes.tap(function(object) {
                scope = object;
            });
        }
    });
})(window);
(function(window) {
    "use strict";

    var DEBUG   = false;
    var axios   = window.axios;
    var jQuery  = window.jQuery;
    var Fn      = window.Fn;
    var Stream  = window.Stream;
    var dom     = window.dom;
    var Sparky  = window.Sparky;
    var frame   = window.frame;

    var assign  = Object.assign;
    var cue     = frame.cue;
    var fetch   = window.fetch;
    var get     = Fn.get;
    var noop    = Fn.noop;
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
        .then(parseHTML);
    } :

    function errorRequest(url, id) {
        throw new Error('Sparky: no axios, jQuery or fetch found for request "' + url + '"');
    } ;

    function insertTemplate(sparky, node, scopes, id, template) {
        if (!template) {
            throw new Error('Sparky: template ' + id + ' not found.');
        }

        var run = function first() {
            run = noop;
            var fragment = dom.clone(template);
            dom.empty(node);
            dom.append(node, fragment);
            if (DEBUG) { console.log('Sparky fn=template:', node); }
            sparky.continue();
        };

        var stream = Stream.of();

        scopes.each(function(scope) {
            cue(function() {
                run();
                stream.push(scope);
            });
        });

        return stream;
    }

    function templateFromCache(sparky, node, scopes, path, id) {
        var doc, elem;

        var template = cache[path][id];

        if (!template) {
            doc  = cache[path][''];
            elem = doc.getElementById(id);

            template = cache[path][id] = doc === document ?
                dom.fragmentFromId(id) :
                elem && dom.fragmentFromHTML(elem.innerHTML) ;
        }

        return insertTemplate(sparky, node, scopes, id, template);
    }

    function templateFromCache2(sparky, node, scopes, path, id, template) {
        var doc, elem;

        if (!template) {
            doc  = cache[path][''];
            elem = doc.getElementById(id);

            template = cache[path][id] = doc === document ?
                dom.fragmentFromId(id) :
                elem && dom.fragmentFromHTML(elem.innerHTML) ;
        }

        if (!template) {
            throw new Error('Sparky: template ' + id + ' not found.');
        }

        //return scopes.tap(function(scope) {
            var fragment = dom.clone(template);
            dom.empty(node);
            dom.append(node, fragment);
            sparky.continue();
        //});
    }

    function templateFromDocument(sparky, node, scopes, path, id) {
        var stream = Stream.of();

        request(path)
        .then(function(doc) {
            if (!doc) { return; }
            var tapped = templateFromDocument2(sparky, node, scopes, path, id, doc);
            sparky.continue();
            tapped.each(stream.push);
        })
        .catch(function(error) {
            console.warn(error);
        });

        return stream;
    }

    function templateFromDocument2(sparky, node, scopes, path, id, doc) {
        var template, elem;

        cache[path] = { '': doc };

        if (id) {
            elem = doc.getElementById(id);
            template = cache[path][id] = elem && dom.fragmentFromHTML(elem.innerHTML);
        }
        else {
            throw new Error('Sparky: template url has no hash id ' + path);
        }

        return insertTemplate(sparky, node, scopes, id, template);
    }

    assign(Sparky.fn, {
        template: function(node, scopes, params) {
            var url = params[0];
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
            return cache[path] ?
                templateFromCache(sparky, node, scopes, path, id) :
                templateFromDocument(sparky, node, scopes, path, id) ;
        },


        // TODO: Do this, but better

        'template-from': function(node, scopes, params) {
            var string = params[0];
            var sparky = this;
            var outputScopes = Stream.of();
            sparky.interrupt();

            if (/\$\{([\w._]+)\}/.test(string)) {
                scopes.each(function(scope) {
                    var notParsed = false;
                    var url = string.replace(/\$\{([\w._]+)\}/g, function($0, $1) {
                        var value = Fn.getPath($1, scope);
                        if (value === undefined) { notParsed = true; }
                        return value;
                    });

                    if (notParsed) {
                        console.log('Sparky: template-from not properly assembled from scope', string, scope);
                        return;
                    }

                    var parts = url.split('#');
                    var path  = parts[0] || '';
                    var id    = parts[1] || '';

                    if (DEBUG && !id) {
                        throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="template:url" requires a url with a hash ref. "' + url + '"');
                    }

                    // If the resource is cached, return it as an shiftable
                    if (cache[path]) {
                        templateFromCache2(sparky, node, scopes, path, id, cache[path][id]);
                        outputScopes.push(scope);
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
                });

                return outputScopes;
            }

            throw new Error('Sparky: template-from must have ${prop} in the url string');
        }
    });
})(window);
(function(window) {
	"use strict";

	var DEBUG      = false;

	var Fn         = window.Fn;
	var dom        = window.dom;
	var Observable = window.Observable;
	var Sparky     = window.Sparky;
	var frame      = window.frame;
	var A          = Array.prototype;

	var isArray    = Array.isArray;
	var noop       = Fn.noop;
	var before     = dom.before;
	var clone      = dom.clone;
	var remove     = dom.remove;
	var tag        = dom.tag;
	var cue        = frame.cue;
	var uncue      = frame.uncue;
	var observe    = Observable.observe;
	var MarkerNode = Sparky.MarkerNode;

	var $object    = Symbol('object');

	function create(node, object, options) {
		if (DEBUG) { console.groupCollapsed('each: create', node); }
		var sparky = new Sparky(node, object, options);
		if (DEBUG) { console.groupEnd(); }
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

			// i = -1
			i = n - 1;
			while (sparkies[++i] && sparkies[i][$object] !== object);

			sparky = i === sparkies.length ?
				create(clone(template), object, options) :
				sparkies.splice(i, 1)[0];

			sparkies.splice(n, 0, sparky);
		}

		// Reordering has pushed all removed sparkies to the end of the
		// sparkies. Remove them.
		while (sparkies.length > array.length) {
			A.forEach.call(sparkies.pop().stop(), remove);
		}
	}

	function reorderNodes(node, array, sparkies) {
		// Reorder nodes in the DOM
		var l = sparkies.length;
		var n = -1;
		var parent = node.parentNode;

		while (n < l) {
			// Note that node is null where nextSibling does not exist
			node = node ? node.nextSibling : null ;

			while (++n < l && sparkies[n][0] !== node) {
				// Passing null to insertBefore appends to the end I think
				parent.insertBefore(sparkies[n][0], node);
			}
		}
	}

	function eachFrame(stream, fn) {
		var unobserve = noop;

		function update(time) {
			var scope = stream.shift();
			// Todo: shouldnt need this line - observe(undefined) shouldnt call fn
			if (scope === undefined) { return; }

			function render(time) {
				fn(scope);
			}

			unobserve();

			var uno = observe(scope, '', function() {
				cue(render);
			});

			unobserve = function() {
				uno();
				uncue(render);
			};
		}

		function push() {
			cue(update);
		}

		if (stream.on) {
			stream.on('push', push);
		}
		else {
			push();
		}

		return function() {
			stream.off('push', push);
			unobserve();
			uncue(update);
		};
	}

	function entryToKeyValue(entry) {
		return {
			key:   entry[0],
			value: entry[1]
		};
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

			if (!isArray(array)) {
				array = Object.entries(array).map(entryToKeyValue);
			}

			if (DEBUG) { console.log('render: each ' + JSON.stringify(array)); }

			reorderCache(template, options, array, sparkies);
			reorderNodes(marker, array, sparkies);

			// A fudgy workaround because observe() callbacks (like this update
			// function) are not batched to ticks.
			// TODO: batch observe callbacks to ticks.
			if (isSelect && value !== undefined) {
				marker.parentNode.value = value;
			}
		}

		// Stop Sparky trying to bind the same scope and ctrls again.
		template.removeAttribute(Sparky.attributeFn);

		// Put the marker in place and remove the node
		before(node, marker);
		remove(node);

		// Get the value of scopes in frames after it has changed
		var stream = scopes.latest().dedup();
		var unEachFrame = eachFrame(stream, update);

		this.then(function() {
			remove(marker);
			unEachFrame();
			sparkies.forEach(function(sparky) {
				sparky.stop();
			});
		});
	};
})(window);

// Sparky.filter

(function(window) {
	"use strict";

	var Fn        = window.Fn;
	var dom       = window.dom;
	var Sparky    = window.Sparky;

	var A         = Array.prototype;
	var assign    = Object.assign;
	var curry     = Fn.curry;
	var get       = Fn.get;
	var isDefined = Fn.isDefined;
	var last      = Fn.last;
	var formatDate = Fn.formatDate;

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
		add:         {
			tx: curry(function(a, b) { return b.add ? b.add(a) : b + a ; }),
			ix: curry(function(a, c) { return c.add ? c.add(-a) : c - a ; })
		},

		'add-date':  { tx: Fn.addDate,     ix: Fn.subDate },
		'add-time':  { tx: Fn.addTime,     ix: Fn.subTime },
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
		'int-string': { tx: function(value) { return value ? value + '' : '' ; }, ix: Fn.toInt },

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

		append:       Fn.append,
		contains:     Fn.contains,
		diff:         Fn.diff,
		equals:       Fn.equals,
		//exp:          Fn.exp,
		factorise:    Fn.factorise,
		formatdate:   Fn.formatDate,
		formattime:   Fn.formatTime,
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

		map: curry(function(method, fn, array) {

console.log('>>', fn, array);

			return array && array.map(fn);
		}, true),

		filter: curry(function(method, args, array) {
			return array && array.map(Sparky.transforms[method].apply(null,args));
		}, true),

		match: curry(function(regex, string) {
			regex = typeof regex === 'string' ? RegExp(regex) : regex ;
			return regex.exec(string);
		}),

		matches: curry(function(regex, string) {
			regex = typeof regex === 'string' ? RegExp(regex) : regex ;
			return !!regex.test(string);
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
		}, true),

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
		}, true),

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
})(window);
