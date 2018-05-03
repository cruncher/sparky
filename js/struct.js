import { parsePipe } from './parse.js';

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
                console.warn('Bad Steve. Attempt to listen without removing last listener. Shouldnt happen.');
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
        // Todo: We need rid of the leading '|' in struct.pipe
        struct.transform = struct.pipe ? parsePipe(struct.pipe.slice(1)) : id ;
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

    Struct.findScope = function findScope(node) {
		return get('scope', structs.find(function(struct) {
			return struct.node === node;
		}));
	};
})(window);
