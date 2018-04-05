(function(window) {

    "use strict";

	var DEBUG      = false;

	var Fn         = window.Fn;
	var Stream     = window.Stream;
	var frame      = window.frame;
	var Observable = window.Observable;

	var assign     = Object.assign;
    var get        = Fn.get;
	var id         = Fn.id;
	var isDefined  = Fn.isDefined;
	var isNaN      = Number.isNaN;
	var noop       = Fn.noop;
	var pipe       = Fn.pipe;
	var remove     = Fn.remove;
    var getPath    = Fn.getPath;
    var setPath    = Fn.setPath;
	var cue        = frame.cue;
	var uncue      = frame.uncue;
	var observe    = Observable.observe;


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
        update:  noop,
        render:  noop,

        stop: function stop() {
            uncue(this.update);
            removeStruct(this);
        },

        cue: function() {
            console.log('cue:   ', this.token)
            cue(this.update);
        },

        uncue: function() {
            uncue(this.update);
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
        if (DEBUG) { console.log('setup: ', struct.token); }

        var transform = Transform(options.transforms, options.transformers, struct.pipe);

        struct.originalValue = struct.read ? struct.read() : '' ;

        struct.update = function(time) {
            var value = struct.input && struct.input.shift();

            if (DEBUG) { console.log('render:', struct.token, value); }

            if (value === undefined) {
                struct.render(struct.originalValue);
            }
            else {
                struct.render(transform(value));
            }
        };
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

        if (struct.cue) {
            if (struct.listen) {
                var change = listen(struct, scope, options);

                cue(function doit() {
                    struct.update();

                    if (flag) { return; }
                    flag = true;

                    input.on('push', function() {
                        cue(doit);
                    });

                    var value = getPath(struct.path, scope);

                    // Where the initial value of struct.path is not set, set it to
                    // the value of the <input/>.
                    if (value === undefined) {
                        change();
                    }
                });

                struct.listen(change);
            }
            else {
                cue(function doit() {
                    struct.update();
                    if (flag) { return; }
                    flag = true;
                    input.on('push', function() {
                        cue(doit);
                    });
                });
            }

            return;
        }

        if (DEBUG) { console.log('struct is Sparky'); }
        eachFrame(input, struct.push);
    }

    function listen(struct, scope, options) {
        //console.log('listen:', postpad(' ', 28, struct.token) + ' scope:', scope);

        var set, invert, change;

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
    Struct.writeValue         = writeValue;
    Struct.writeValueNumber   = writeValueNumber;
    Struct.writeValueCheckbox = writeValueCheckbox;
    Struct.writeValueRadio    = writeValueRadio;
    Struct.readValue          = readValue;
    Struct.readValueNumber    = readValueNumber;
    Struct.readValueCheckbox  = readValueCheckbox;
    Struct.readValueRadio     = readValueRadio;
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
