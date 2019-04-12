'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/* cache(fn)
Returns a function that caches results of calling it.
*/

function cache(fn) {
    var map = new Map();

    return function cache(object) {

        if (map.has(object)) {
            return map.get(object);
        }

        var value = fn(object);
        map.set(object, value);
        return value;
    };
}

const A     = Array.prototype;

function applyFn(fn, args) {
    return typeof fn === 'function' ? fn.apply(null, args) : fn ;
}

function curry(fn, muteable, arity) {
    arity = arity || fn.length;

    var memo = arity === 1 ?
        // Don't cache if `muteable` flag is true
        muteable ? fn : cache(fn) :

        // It's ok to always cache intermediate memos, though
        cache(function(object) {
            return curry(function() {
                var args = [object];
                args.push.apply(args, arguments);
                return fn.apply(null, args);
            }, muteable, arity - 1) ;
        }) ;

    return function partial(object) {
        return arguments.length === 0 ?
            partial :
        arguments.length === 1 ?
            memo(object) :
        arguments.length === arity ?
            fn.apply(null, arguments) :
        arguments.length > arity ?
            applyFn(fn.apply(null, A.splice.call(arguments, 0, arity)), arguments) :
        applyFn(memo(object), A.slice.call(arguments, 1)) ;
    };
}

/*
function curry(fn, muteable, arity) {
    arity = arity || fn.length;
    return function curried() {
        return arguments.length >= arity ?
            fn.apply(null, arguments) :
            curried.bind(null, ...arguments) ;
    };
}
*/

{
    const _curry = curry;

    // Feature test
	const isFunctionLengthDefineable = (function() {
		var fn = function() {};

		try {
			// Can't do this on Safari - length non configurable :(
			Object.defineProperty(fn, 'length', { value: 2 });
		}
		catch(e) {
			return false;
		}

		return fn.length === 2;
	})();

    const setFunctionProperties = function setFunctionProperties(text, parity, fn1, fn2) {
        // Make the string representation of fn2 display parameters of fn1
        fn2.toString = function() {
            return /function\s*[\w\d]*\s*\([,\w\d\s]*\)/.exec(fn1.toString()) + ' { [' + text + '] }';
        };

        // Where possible, define length so that curried functions show how
        // many arguments they are yet expecting
        if (isFunctionLengthDefineable) {
            Object.defineProperty(fn2, 'length', { value: parity });
        }

        return fn2;
    };

    // Make curried functions log a pretty version of their partials
    curry = function curry(fn, muteable, arity) {
        arity  = arity || fn.length;
        return setFunctionProperties('curried', arity, fn, _curry(fn, muteable, arity));
    };
}


var curry$1 = curry;

function rest(i, object) {
    if (object.slice) { return object.slice(i); }
    if (object.rest)  { return object.rest(i); }

    var a = [];
    var n = object.length - i;
    while (n--) { a[n] = object[n + i]; }
    return a;
}

function choose(map) {
    return function choose(key) {
        var fn = map[key] || map.default;
        return fn && fn.apply(this, rest(1, arguments)) ;
    };
}

function noop() {}

const resolved = Promise.resolve();

function requestTick(fn) {
    resolved.then(fn);
    return fn;
}

// Throttle

function toArray$1(object) {
    if (object.toArray) { return object.toArray(); }

    // Speed test for array conversion:
    // https://jsperf.com/nodelist-to-array/27

    var array = [];
    var l = object.length;
    var i;

    if (typeof object.length !== 'number') { return array; }

    array.length = l;

    for (i = 0; i < l; i++) {
        array[i] = object[i];
    }

    return array;
}

const A$1 = Array.prototype;
const S = String.prototype;

function by(fn, a, b) {
    const fna = fn(a);
    const fnb = fn(b);
    return fnb === fna ? 0 : fna > fnb ? 1 : -1 ;
}

function byAlphabet(a, b) {
    return S.localeCompare.call(a, b);
}

function each(fn, object) {
    // A stricter version of .forEach, where the callback fn
    // gets a single argument and no context.
    var l, n;

    if (typeof object.each === 'function') {
        object.each(fn);
    }
    else {
        l = object.length;
        n = -1;
        while (++n < l) { fn(object[n]); }
    }

    return object;
}

function map(fn, object) {
    return object && object.map ? object.map(fn) : A$1.map.call(object, fn) ;
}

function filter(fn, object) {
    return object.filter ?
        object.filter(fn) :
        A$1.filter.call(object, fn) ;
}

function reduce(fn, seed, object) {
    return object.reduce ?
        object.reduce(fn, seed) :
        A$1.reduce.call(object, fn, seed);
}

function sort(fn, object) {
    return object.sort ? object.sort(fn) : A$1.sort.call(object, fn);
}

function concat(array2, array1) {
    // A.concat only works with arrays - it does not flatten array-like
    // objects. We need a robust concat that will glue any old thing
    // together.
    return Array.isArray(array1) ?
        // 1 is an array. Convert 2 to an array if necessary
        array1.concat(Array.isArray(array2) ? array2 : toArray$1(array2)) :

    array1.concat ?
        // It has it's own concat method. Lets assume it's robust
        array1.concat(array2) :
    // 1 is not an array, but 2 is
    toArray$1(array1).concat(Array.isArray(array2) ? array2 : toArray$1(array2)) ;
}
function contains(value, object) {
    return object.includes ?
        object.includes(value) :
    object.contains ?
        object.contains(value) :
    A$1.includes ?
        A$1.includes.call(object, value) :
        A$1.indexOf.call(object, value) !== -1 ;
}
function find(fn, object) {
    return A$1.find.call(object, fn);
}

function insert(fn, array, object) {
    var n = -1;
    var l = array.length;
    var value = fn(object);
    while(++n < l && fn(array[n]) <= value);
    A$1.splice.call(array, n, 0, object);
}

function slice(n, m, object) {
    return object.slice ?
        object.slice(n, m) :
        A$1.slice.call(object, n, m) ;
}

/*
args()

Returns `arguments` object.

```
code(block)
```

*/

// choke
//
// Returns a function that waits for `time` seconds without being invoked
// before calling `fn` using the context and arguments from the latest
// invocation

function choke(fn, time) {
    var timer, context, args;
    var cue = function cue() {
        if (timer) { clearTimeout(timer); }
        timer = setTimeout(update, (time || 0) * 1000);
    };

    function update() {
        timer = false;
        fn.apply(context, args);
    }

    function cancel() {
        // Don't permit further changes to be queued
        cue = noop;

        // If there is an update queued apply it now
        if (timer) { clearTimeout(timer); }
    }

    function wait() {
        // Store the latest context and arguments
        context = this;
        args = arguments;

        // Cue the update
        cue();
    }

    wait.cancel = cancel;
    return wait;
}

// Choke or wait? A simpler implementation without cancel(), I leave this here for reference...
//	function choke(seconds, fn) {
//		var timeout;
//
//		function update(context, args) {
//			fn.apply(context, args);
//		}
//
//		return function choke() {
//			clearTimeout(timeout);
//			timeout = setTimeout(update, seconds * 1000, this, arguments);
//		};
//	}

function compose(fn2, fn1) {
    return function compose() {
        return fn2(fn1.apply(null, arguments));
    };
}

function deprecate(fn, message) {
    // Recall any function and log a depreciation warning
    return function deprecate() {
        console.warn('Deprecation warning: ' + message);
        return fn.apply(this, arguments);
    };
}

function id(object) { return object; }

function isDefined(value) {
    // !!value is a fast out for non-zero numbers, non-empty strings
    // and other objects, the rest checks for 0, '', etc.
    return !!value || (value !== undefined && value !== null && !Number.isNaN(value));
}

function latest(source) {
    var value = source.shift();
    return value === undefined ? arguments[1] : latest(source, value) ;
}

var nothing = Object.freeze({
    shift: noop,
    push:  noop,
    stop:  noop,
    length: 0
});

function now() {
    // Return time in seconds
    return +new Date() / 1000;
}

function once(fn) {
    return function once() {
        var value = fn.apply(this, arguments);
        fn = noop;
        return value;
    };
}

function overload(fn, map) {
    return typeof map.get === 'function' ?
        function overload() {
            var key = fn.apply(null, arguments);
            return map.get(key).apply(this, arguments);
        } :
        function overload() {
            const key     = fn.apply(null, arguments);
            const handler = (map[key] || map.default);
            if (!handler) { throw new Error('overload() no handler for "' + key + '"'); }
            return handler.apply(this, arguments);
        } ;
}

function apply(value, fn) {
    return fn(value);
}

const A$2 = Array.prototype;

function pipe() {
    const fns = arguments;
    return fns.length ?
        (value) => A$2.reduce.call(fns, apply, value) :
        id ;
}

const O = Object.prototype;

function toClass(object) {
    return O.toString.apply(object).slice(8, -1);
}

function toInt(object) {
    return object === undefined ?
        undefined :
        parseInt(object, 10);
}

function toString(object) {
	return object.toString();
}

function toType(object) {
    return typeof object;
}

function prepend(string1, string2) {
    return '' + string1 + string2;
}

const assign = Object.assign;

function isDone(source) {
    return source.length === 0 || source.status === 'done' ;
}

function create(object, fn) {
    var functor = Object.create(object);
    functor.shift = fn;
    return functor;
}

function arrayReducer(array, value) {
    array.push(value);
    return array;
}

function shiftTap(shift, fn) {
    return function tap() {
        var value = shift();
        value !== undefined && fn(value);
        return value;
    };
}

function sortedSplice(array, fn, value) {
    // Splices value into array at position determined by result of fn,
    // where result is either in the range [-1, 0, 1] or [true, false]
    var n = sortIndex(array, function(n) {
        return fn(value, n);
    });
    array.splice(n, 0, value);
}

function sortIndex(array, fn) {
    var l = array.length;
    var n = l + l % 2;
    var i = 0;

    while ((n = Math.floor(n / 2)) && (i + n <= l)) {
        if (fn(array[i + n - 1]) >= 0) {
            i += n;
            n += n % 2;
        }
    }

    return i;
}

function Fn(fn) {
    // Accept constructor without `new`
    if (!this || !Fn.prototype.isPrototypeOf(this)) {
        return new Fn(fn);
    }

    var source = this;

    if (!fn) {
        source.status = 'done';
        return;
    }

    var value = fn();

    if (value === undefined) {
        source.status = 'done';
        return;
    }

    this.shift = function shift() {
        if (source.status === 'done') { return; }

        var v = value;

        // Where the next value is undefined mark the functor as done
        value = fn();
        if (value === undefined) {
            source.status = 'done';
        }

        return v;
    };
}


assign(Fn, {

    // Constructors

    of: function() { return Fn.from(arguments); },

    from: function(object) {
        var i;

        // object is an array or array-like object. Iterate over it without
        // mutating it.
        if (typeof object.length === 'number') {
            i = -1;

            return new Fn(function shiftArray() {
                // Ignore undefined holes in arrays
                return ++i >= object.length ?
                    undefined :
                object[i] === undefined ?
                    shiftArray() :
                    object[i] ;
            });
        }

        // object is an object with a shift function
        if (typeof object.shift === "function" && object.length === undefined) {
            return new Fn(function shiftObject() {
                return object.shift();
            });
        }

        // object is an iterator
        if (typeof object.next === "function") {
            return new Fn(function shiftIterator() {
                var result = object.next();

                // Ignore undefined holes in iterator results
                return result.done ?
                    result.value :
                result.value === undefined ?
                    shiftIterator() :
                    result.value ;
            });
        }

        throw new Error('Fn: from(object) object is not a list of a known kind (array, functor, stream, iterator).')
    }
});

assign(Fn.prototype, {
    shift: noop,

    // Input

    of: function() {
        // Delegate to the constructor's .of()
        return this.constructor.of.apply(this.constructor, arguments);
    },

    // Transform

    ap: function(object) {
        var shift = this.shift;

        return create(this, function ap() {
            var fn = shift();
            return fn === undefined ?
                undefined :
                object.map(fn) ;
        });
    },

    unshift: function() {
        // Create an unshift buffer, such that objects can be inserted
        // back into the stream at will with stream.unshift(object).
        var source = this;
        var buffer = toArray$1(arguments);

        return create(this, function() {
            return (buffer.length ? buffer : source).shift() ;
        });
    },

    catch: function(fn) {
        var source = this;

        return create(this, function() {
            try {
                return source.shift();
            }
            catch(e) {
                return fn(e);
            }
        });
    },

    chain: function(fn) {
        return this.map(fn).join();
    },

    clone: function() {
        var source  = this;
        var shift   = this.shift;
        var buffer1 = [];
        var buffer2 = [];
        var doneFlag = false;

        // Messy. But it works. Just.

        this.shift = function() {
            var value;

            if (buffer1.length) {
                value = buffer1.shift();

                if (!buffer1.length && doneFlag) {
                    source.status = 'done';
                }

                return value;
            }

            if (!doneFlag) {
                value = shift();

                if (source.status === 'done') {
                    doneFlag = true;
                }

                if (value !== undefined) {
                    buffer2.push(value);
                }

                return value;
            }
        };

        var clone = new Fn(function shiftClone() {
            var value;

            if (buffer2.length) {
                return buffer2.shift();
                //if (!buffer2.length && doneFlag) {
                //	clone.status = 'done';
                //}
            }

            if (!doneFlag) {
                value = shift();

                if (source.status === 'done') {
                    doneFlag = true;
                    source.status = undefined;
                }

                if (value !== undefined) {
                    buffer1.push(value);
                }

                return value;
            }
        });

        return clone;
    },

    concat: function() {
        var sources = toArray$1(arguments);
        var source  = this;

        var stream  = create(this, function concat() {
            if (source === undefined) {
                stream.status = 'done';
                return;
            }

            if (isDone(source)) {
                source = sources.shift();
                return concat();
            }

            var value = source.shift();

            stream.status = sources.length === 0 && isDone(source) ?
                'done' : undefined ;

            return value;
        });

        return stream;
    },

    dedup: function() {
        var v;
        return this.filter(function(value) {
            var old = v;
            v = value;
            return old !== value;
        });
    },

    filter: function(fn) {
        var source = this;

        return create(this, function filter() {
            var value;
            while ((value = source.shift()) !== undefined && !fn(value));
            return value;
        });
    },

    first: function() {
        var source = this;
        return create(this, once(function first() {
            source.status = 'done';
            return source.shift();
        }));
    },

    join: function() {
        var source = this;
        var buffer = nothing;

        return create(this, function join() {
            var value = buffer.shift();
            if (value !== undefined) { return value; }
            buffer = source.shift();
            if (buffer !== undefined) { return join(); }
            buffer = nothing;
        });
    },

    latest: function() {
        var source = this;
        return create(this, function shiftLast() {
            return latest(source);
        });
    },

    map: function(fn) {
        return create(this, compose(function map(object) {
            return object === undefined ? undefined : fn(object) ;
        }, this.shift));
    },

    chunk: function(n) {
        var source = this;
        var buffer = [];

        return create(this, n ?
            // If n is defined batch into arrays of length n.
            function shiftChunk() {
                var value, _buffer;

                while (buffer.length < n) {
                    value = source.shift();
                    if (value === undefined) { return; }
                    buffer.push(value);
                }

                if (buffer.length >= n) {
                    _buffer = buffer;
                    buffer = [];
                    return Fn.of.apply(Fn, _buffer);
                }
            } :

            // If n is undefined or 0, batch all values into an array.
            function shiftChunk() {
                buffer = source.toArray();
                // An empty array is equivalent to undefined
                return buffer.length ? buffer : undefined ;
            }
        );
    },

    fold: function(fn, seed) {
        var i = 0;
        return this
        .map(function fold(value) {
            seed = fn(seed, value, i++);
            return seed;
        });

        // Why would we want this? To gaurantee a result? It's a bad idea
        // when streaming, as you get an extra value in front...
        //.unshift(seed);
    },

    scan: function(fn, seed) {
        return this.map((value) => (seed = fn(seed, value)));
    },

    partition: function(fn) {
        var source = this;
        var buffer = [];
        var streams = new Map();

        fn = fn || Fn.id;

        function createPart(key, value) {
            var stream = Stream.of().on('pull', shiftPull);
            stream.key = key;
            streams.set(key, stream);
            return stream;
        }

        function shiftPull(type, pullStream) {
            var value  = source.shift();
            if (value === undefined) { return; }

            var key    = fn(value);
            var stream = streams.get(key);

            if (stream === pullStream) { return value; }

            if (stream === undefined) {
                stream = createPart(key, value);
                buffer.push(stream);
            }

            stream.push(value);
            return shiftPull(type, pullStream);
        }

        return create(this, function shiftStream() {
            if (buffer.length) { return buffer.shift(); }

            var value = source.shift();
            if (value === undefined) { return; }

            var key    = fn(value);
            var stream = streams.get(key);

            if (stream === undefined) {
                stream = createPart(key, value);
                stream.push(value);
                return stream;
            }

            stream.push(value);
            return shiftStream();
        });
    },

    reduce: function reduce(fn, seed) {
        return this.fold(fn, seed).latest().shift();
    },

    take: function(n) {
        var source = this;
        var i = 0;

        return create(this, function take() {
            var value;

            if (i < n) {
                value = source.shift();
                // Only increment i where an actual value has been shifted
                if (value === undefined) { return; }
                if (++i === n) { source.status = 'done'; }
                return value;
            }
        });
    },

    sort: function(fn) {
        fn = fn || Fn.byGreater ;

        var source = this;
        var buffer = [];

        return create(this, function sort() {
            var value;

            while((value = source.shift()) !== undefined) {
                sortedSplice(buffer, fn, value);
            }

            return buffer.shift();
        });
    },

    split: function(fn) {
        var source = this;
        var buffer = [];

        return create(this, function split() {
            var value = source.shift();
            var temp;

            if (value === undefined) {
                if (buffer.length) {
                    temp = buffer;
                    buffer = [];
                    return temp;
                }

                return;
            }

            if (fn(value)) {
                temp = buffer;
                buffer = [value];
                return temp.length ? temp : split() ;
            }

            buffer.push(value);
            return split();
        });
    },

    syphon: function(fn) {
        var shift   = this.shift;
        var buffer1 = [];
        var buffer2 = [];

        this.shift = function() {
            if (buffer1.length) { return buffer1.shift(); }

            var value;

            while ((value = shift()) !== undefined && fn(value)) {
                buffer2.push(value);
            }

            return value;
        };

        return create(this, function filter() {
            if (buffer2.length) { return buffer2.shift(); }

            var value;

            while ((value = shift()) !== undefined && !fn(value)) {
                buffer1.push(value);
            }

            return value;
        });
    },

    rest: function(i) {
        var source = this;

        return create(this, function rest() {
            while (i-- > 0) { source.shift(); }
            return source.shift();
        });
    },

    unique: function() {
        var source = this;
        var values = [];

        return create(this, function unique() {
            var value = source.shift();

            return value === undefined ? undefined :
                values.indexOf(value) === -1 ? (values.push(value), value) :
                unique() ;
        });
    },

    // Consumers

    each: function(fn) {
        var value;

        while ((value = this.shift()) !== undefined) {
            fn.call(this, value);
        }

        return this;
    },

    find: function(fn) {
        return this
        .filter(fn)
        .first()
        .shift();
    },

    next: function() {
        return {
            value: this.shift(),
            done:  this.status
        };
    },

    pipe: function(stream) {
        this.each(stream.push);
        return stream;
    },

    tap: function(fn) {
        // Overwrite shift to copy values to tap fn
        this.shift = shiftTap(this.shift, fn);
        return this;
    },

    toJSON: function() {
        return this.reduce(arrayReducer, []);
    },

    toString: function() {
        return this.reduce(prepend, '');
    },


    // Deprecated

    process: deprecate(function(fn) {
        return fn(this);
    }, '.process() is deprecated'),

    last: deprecate(function() {
        var source = this;
        return create(this, function shiftLast() {
            return latest(source);
        });
    }, '.last() is now .latest()'),
});

Fn.prototype.toArray = Fn.prototype.toJSON;

// Todo: As of Nov 2016 fantasy land spec requires namespaced methods:
//
// equals: 'fantasy-land/equals',
// lte: 'fantasy-land/lte',
// concat: 'fantasy-land/concat',
// empty: 'fantasy-land/empty',
// map: 'fantasy-land/map',
// contramap: 'fantasy-land/contramap',
// ap: 'fantasy-land/ap',
// of: 'fantasy-land/of',
// alt: 'fantasy-land/alt',
// zero: 'fantasy-land/zero',
// reduce: 'fantasy-land/reduce',
// traverse: 'fantasy-land/traverse',
// chain: 'fantasy-land/chain',
// chainRec: 'fantasy-land/chainRec',
// extend: 'fantasy-land/extend',
// extract: 'fantasy-land/extract',
// bimap: 'fantasy-land/bimap',
// promap: 'fantasy-land/promap'


if (window.Symbol) {
    // A functor is it's own iterator
    Fn.prototype[Symbol.iterator] = function() {
        return this;
    };
}

function remove(array, value) {
    if (array.remove) { array.remove(value); }
    var i = array.indexOf(value);
    if (i !== -1) { array.splice(i, 1); }
}

// Timer

function Timer(duration, getTime) {
    if (typeof duration !== 'number') { throw new Error('Timer(duration) requires a duration in seconds (' + duration + ')'); }

    // Optional second argument is a function that returns
    // current time (in seconds)
    getTime = getTime || now;

    var fns = [];
    var id;
    var t0  = -Infinity;

    function frame() {
        var n = fns.length;

        id = undefined;
        t0 = getTime();

        while (n--) {
            fns.shift()(t0);
        }
    }

    return {
        now: getTime,

        request: function(fn) {
            if (typeof fn !== 'function') { throw new Error('fn is not a function.'); }

            // Add fn to queue
            fns.push(fn);

            // If the timer is cued do nothing
            if (id) { return; }

            var t1 = getTime();

            // Set the timer and return something truthy
            if (t0 + duration > t1) {
                id = setTimeout(frame, (t0 + duration - t1) * 1000);
            }
            else {
                requestTick(frame) ;
            }

            // Use the fn reference as the request id, because why not
            return fn;
        },

        cancel: function(fn) {
            var i = fns.indexOf(fn);
            if (i === -1) { return; }

            fns.splice(i, 1);

            if (!fns.length) {
                clearTimeout(id);
                id = undefined;
            }
        }
    };
}

var A$3         = Array.prototype;
var assign$1    = Object.assign;


// Functions

function call(value, fn) {
    return fn(value);
}

function isValue(n) { return n !== undefined; }

function isDone$1(stream) {
    return stream.status === 'done';
}


// Events

var $events = Symbol('events');

function notify(type, object) {
    var events = object[$events];

    if (!events) { return; }
    if (!events[type]) { return; }

    var n = -1;
    var l = events[type].length;
    var value;

    while (++n < l) {
        value = events[type][n](type, object);
        if (value !== undefined) {
            return value;
        }
    }
}

function createNotify(stream) {
    var _notify = notify;

    return function trigger(type) {
        // Prevent nested events, so a 'push' event triggered while
        // the stream is 'pull'ing will do nothing. A bit of a fudge.
        var notify = _notify;
        _notify = noop;
        var value = notify(type, stream);
        _notify = notify;
        return value;
    };
}


// Sources
//
// Sources that represent stopping and stopped states of a stream

var doneSource = {
    shift: noop,
    push:  noop,
    start: noop,
    stop:  noop
};

function StopSource(source, n, done) {
    this.source = source;
    this.n      = n;
    this.done   = done;
}

assign$1(StopSource.prototype, doneSource, {
    shift: function() {
        if (--this.n < 1) { this.done(); }
        return this.source.shift();
    }
});


// Stream

function Stream$1(Source, options) {
    // Enable construction without the `new` keyword
    if (!Stream$1.prototype.isPrototypeOf(this)) {
        return new Stream$1(Source, options);
    }

    var stream  = this;
    var resolve = noop;
    var source;
    var promise;

    function done() {
        stream.status = 'done';
        source = doneSource;
    }

    function stop(n, value) {
        // Neuter events and schedule shutdown of the stream
        // after n values
        delete stream[$events];

        if (n) { source = new StopSource(source, n, done); }
        else { done(); }

        resolve(stream);
    }

    function getSource() {
        var notify = createNotify(stream);
        source = new Source(notify, stop, options);

        // Gaurantee that source has a .stop() method
        if (!source.stop) { source.stop = noop; }

        getSource = function() { return source; };

        return source;
    }

    // Properties and methods

    this[$events] = {};

    this.push = function push() {
        var source = getSource();
        source.push.apply(source, arguments);
        return this;
    };

    this.shift = function shift() {
        return getSource().shift();
    };

    this.start = function start() {
        var source = getSource();
        source.start.apply(source, arguments);
        return this;
    };

    this.stop = function stop() {
        var source = getSource();
        source.stop.apply(source, arguments);
        return this;
    };

    this.done = function done(fn) {
        promise = promise || new Promise((res, rej) => {
            resolve = res;
        });

        return promise.then(fn);
    };
}


// Buffer Stream

function BufferSource(notify, stop, list) {
    const buffer = list === undefined ? [] :
        Fn.prototype.isPrototypeOf(list) ? list :
        Array.from(list).filter(isValue) ;

    this._buffer = buffer;
    this._notify = notify;
    this._stop   = stop;
}

assign$1(BufferSource.prototype, {
    shift: function() {
        var buffer = this._buffer;
        var notify = this._notify;
        return buffer.length ? buffer.shift() : notify('pull') ;
    },

    push: function() {
        var buffer = this._buffer;
        var notify = this._notify;
        buffer.push.apply(buffer, arguments);
        notify('push');
    },

    stop: function() {
        var buffer = this._buffer;
        this._stop(buffer.length);
    }
});

Stream$1.from = function BufferStream(list) {
    return new Stream$1(BufferSource, list);
};

Stream$1.of = function ArgumentStream() {
    return Stream$1.from(arguments);
};


// Promise Stream

function PromiseSource(notify, stop, promise) {
    const source = this;

    promise
    // Todo: Put some error handling into our streams
    .catch(stop)
    .then(function(value) {
        source.value = value;
        notify('push');
        stop();
    });
}

PromiseSource.prototype.shift = function() {
    const value = this.value;
    this.value = undefined;
    return value;
};

Stream$1.fromPromise = function(promise) {
    return new Stream$1(PromiseSource, promise);
};


// Callback stream

Stream$1.fromCallback = function(object, name) {
    const stream = Stream$1.of();
    const args = rest(2, arguments);
    args.push(stream.push);
    object[name].apply(object, args);
    return stream;
};

// Clock Stream

const clockEventPool = [];

function TimeSource(notify, end, timer) {
    this.notify = notify;
    this.end    = end;
    this.timer  = timer;

    const event = this.event = clockEventPool.shift() || {};
    event.stopTime = Infinity;

    this.frame = (time) => {
        // Catch the case where stopTime has been set before or equal the
        // end time of the previous frame, which can happen if start
        // was scheduled via a promise, and therefore should only ever
        // happen on the first frame: stop() catches this case thereafter
        if (event.stopTime <= event.t2) { return; }

        // Wait until startTime
        if (time < event.startTime) {
            this.requestId = this.timer.request(this.frame);
            return;
        }

        // Reset frame fn without checks
        this.frame = (time) => this.update(time);
        this.frame(time);
    };
}

assign$1(TimeSource.prototype, {
    shift: function shift() {
        var value = this.value;
        this.value = undefined;
        return value;
    },

    start: function(time) {
        const now = this.timer.now();

        this.event.startTime = time !== undefined ? time : now ;
        this.event.t2 = time > now ? time : now ;

        // If the currentTime (the last frame time) is greater than now
        // call the frame for up to this point, otherwise add an arbitrary
        // frame duration to now.
        const frameTime = this.timer.currentTime > now ?
            this.timer.currentTime :
            now + 0.08 ;

        if (this.event.startTime > frameTime) {
            // Schedule update on the next frame
            this.requestId = this.timer.request(this.frame);
        }
        else {
            // Run the update on the next tick, in case we schedule stop
            // before it gets chance to fire. This also gaurantees all stream
            // pushes are async.
            Promise.resolve(frameTime).then(this.frame);
        }
    },

    stop: function stop(time) {
        if (this.event.startTime === undefined) {
            // This is a bit of an arbitrary restriction. It wouldnt
            // take much to support this.
            throw new Error('TimeStream: Cannot call .stop() before .start()');
        }

        this.event.stopTime = time || this.timer.now();

        // If stopping during the current frame cancel future requests.
        if (this.event.stopTime <= this.event.t2) {
            this.requestId && this.timer.cancel(this.requestId);
            this.end();
        }
    },

    update: function(time) {
        const event = this.event;
        event.t1 = event.t2;

        this.requestId = undefined;
        this.value     = event;

        if (time >= event.stopTime) {
            event.t2 = event.stopTime;
            this.notify('push');
            this.end();

            // Release event
            clockEventPool.push(event);
            return;
        }

        event.t2 = time;
        this.notify('push');
        // Todo: We need this? Test.
        this.value     = undefined;
        this.requestId = this.timer.request(this.frame);
    }
});

Stream$1.fromTimer = function TimeStream(timer) {
    return new Stream$1(TimeSource, timer);
};

Stream$1.fromDuration = function(duration) {
    return Stream$1.fromTimer(new Timer(duration));
};

Stream$1.frames = function() {
    return Stream$1.fromTimer(frameTimer);
};




// Stream.Combine

function toValue(data) {
    var source = data.source;
    var value  = data.value;
    return data.value = value === undefined ? latest(source) : value ;
}

function CombineSource(notify, stop, fn, sources) {
    var object = this;

    this._notify  = notify;
    this._stop    = stop;
    this._fn      = fn;
    this._sources = sources;
    this._hot     = true;

    this._store = sources.map(function(source) {
        var data = {
            source: source,
            listen: listen
        };

        // Listen for incoming values and flag as hot
        function listen() {
            data.value = undefined;
            object._hot = true;
        }

        source.on('push', listen);
        source.on('push', notify);
        return data;
    });
}

assign$1(CombineSource.prototype, {
    shift: function combine() {
        // Prevent duplicate values going out the door
        if (!this._hot) { return; }
        this._hot = false;

        var sources = this._sources;
        var values  = this._store.map(toValue);
        if (sources.every(isDone$1)) { this._stop(0); }
        return values.every(isValue) && this._fn.apply(null, values) ;
    },

    stop: function stop() {
        var notify = this._notify;

        // Remove listeners
        each(function(data) {
            var source = data.source;
            var listen = data.listen;
            source.off('push', listen);
            source.off('push', notify);
        }, this._store);

        this._stop(this._hot ? 1 : 0);
    }
});

Stream$1.Combine = function(fn) {
    var sources = A$3.slice.call(arguments, 1);

    if (sources.length < 2) {
        throw new Error('Stream: Combine requires more than ' + sources.length + ' source streams')
    }

    return new Stream$1(function setup(notify, stop) {
        return new CombineSource(notify, stop, fn, sources);
    });
};


// Stream.Merge

function MergeSource(notify, stop, sources) {
    var values = [];
    var buffer = [];

    function update(type, source) {
        buffer.push(source);
    }

    this._notify  = notify;
    this._stop    = stop;
    this._sources = sources;
    this._values  = values;
    this._buffer  = buffer;
    this._i       = 0;
    this._update  = update;

    each(function(source) {
        // Flush the source
        values.push.apply(values, toArray$1(source));

        // Listen for incoming values
        source.on('push', update);
        source.on('push', notify);
    }, sources);
}

assign$1(MergeSource.prototype, {
    shift: function() {
        var sources = this._sources;
        var values  = this._values;
        var buffer  = this._buffer;
        var stop    = this._stop;

        if (values.length) { return values.shift(); }
        var stream = buffer.shift();
        if (!stream) { return; }
        var value = stream.shift();
        // When all the sources are empty, stop
        if (stream.status === 'done' && ++this._i >= sources.length) { stop(0); }
        return value;
    },

    stop: function() {
        var notify  = this._notify;
        var sources = this._sources;
        var stop    = this._stop;
        var update  = this._update;

        // Remove listeners
        each(function(source) {
            source.off('push', update);
            source.off('push', notify);
        }, sources);

        stop(this._values.length + this._buffer.length);
    }
});

Stream$1.Merge = function(source1, source2) {
    var args = arguments;

    return new Stream$1(function setup(notify, stop) {
        return new MergeSource(notify, stop, Array.from(args));
    });
};





// Stream Timers

Stream$1.Choke = function(time) {
    return new Stream$1(function setup(notify, done) {
        var value;
        var update = choke(function() {
            // Get last value and stick it in buffer
            value = arguments[arguments.length - 1];
            notify('push');
        }, time);

        return {
            shift: function() {
                var v = value;
                value = undefined;
                return v;
            },

            push: update,

            stop: function stop() {
                update.cancel(false);
                done();
            }
        };
    });
};



// Frame timer

var frameTimer = {
    now:     now,
    request: requestAnimationFrame.bind(window),
    cancel:  cancelAnimationFrame.bind(window)
};


// Stream timer

function StreamTimer(stream) {
    var timer = this;
    var fns0  = [];
    var fns1  = [];
    this.fns = fns0;

    stream.each(function() {
        timer.fns = fns1;
        fns0.reduce(call, undefined);
        fns0.length = 0;
        fns1 = fns0;
        fns0 = timer.fns;
    });
}

assign$1(StreamTimer.prototype, {
    request: function(fn) {
        this.fns.push(fn);
        return fn;
    },

    cancel: function(fn) {
        remove(this.fns, fn);
    }
});


// Stream.throttle

function schedule() {
    var timer   = this.timer;

    this.queue = noop;
    this.ref   = timer.request(this.update);
}

function ThrottleSource(notify, stop, timer) {
    var source   = this;

    this._stop   = stop;
    this.timer   = timer;
    this.queue   = schedule;
    this.update  = function update() {
        source.queue = schedule;
        notify('push');
    };
}

assign$1(ThrottleSource.prototype, {
    shift: function shift() {
        var value = this.value;
        this.value = undefined;
        return value;
    },

    stop: function stop(callLast) {
        var timer = this.timer;

        // An update is queued
        if (this.queue === noop) {
            timer.cancel && timer.cancel(this.ref);
            this.ref = undefined;
        }

        // Don't permit further changes to be queued
        this.queue = noop;

        // If there is an update queued apply it now
        // Hmmm. This is weird semantics. TODO: callLast should
        // really be an 'immediate' flag, no?
        this._stop(this.value !== undefined && callLast ? 1 : 0);
    },

    push: function throttle() {
        // Store the latest value
        this.value = arguments[arguments.length - 1];

        // Queue the update
        this.queue();
    }
});

Stream$1.throttle = function(timer) {
    if (typeof timer === 'function') {
        throw new Error('Dont accept request and cancel functions anymore');
    }

    timer = typeof timer === 'number' ?
        new Timer(timer) :
    timer instanceof Stream$1 ?
        new StreamTimer(timer) :
    timer ? timer :
        frameTimer ;

    return new Stream$1(function(notify, stop) {
        return new ThrottleSource(notify, stop, timer);
    });
};


// Stream Methods

Stream$1.prototype = assign$1(Object.create(Fn.prototype), {
    constructor: Stream$1,

    clone: function() {
        var source  = this;
        var shift   = this.shift;
        var buffer1 = [];
        var buffer2 = [];

        var stream  = new Stream$1(function setup(notify, stop) {
            var buffer = buffer2;

            source.on('push', notify);

            return {
                shift: function() {
                    if (buffer.length) { return buffer.shift(); }
                    var value = shift();

                    if (value !== undefined) { buffer1.push(value); }
                    else if (source.status === 'done') {
                        stop(0);
                        source.off('push', notify);
                    }

                    return value;
                },

                stop: function() {
                    var value;

                    // Flush all available values into buffer
                    while ((value = shift()) !== undefined) {
                        buffer.push(value);
                        buffer1.push(value);
                    }

                    stop(buffer.length);
                    source.off('push', notify);
                }
            };
        });

        this.done(stream.stop);

        this.shift = function() {
            if (buffer1.length) { return buffer1.shift(); }
            var value = shift();
            if (value !== undefined && stream.status !== 'done') { buffer2.push(value); }
            return value;
        };

        return stream;
    },

    combine: function(fn, source) {
        return Stream$1.Combine(fn, this, source);
    },

    merge: function() {
        var sources = toArray$1(arguments);
        sources.unshift(this);
        return Stream$1.Merge.apply(null, sources);
    },

    choke: function(time) {
        return this.pipe(Stream$1.Choke(time));
    },

    throttle: function(timer) {
        return this.pipe(Stream$1.throttle(timer));
    },

    clock: function(timer) {
        return this.pipe(Stream$1.clock(timer));
    },


    // Consume

    each: function(fn) {
        var args   = arguments;
        var source = this;

        // Flush and observe
        Fn.prototype.each.apply(source, args);

        // Delegate to Fn#each().
        return this.on('push', () => Fn.prototype.each.apply(source, args));
    },

    join: function() {
        const output = this.constructor.of();
        this.each((input) => input.pipe(output));
        return output;
    },

    // Events

    on: function(type, fn) {
        var events = this[$events];
        if (!events) { return this; }

        var listeners = events[type] || (events[type] = []);
        listeners.push(fn);
        return this;
    },

    off: function off(type, fn) {
        var events = this[$events];
        if (!events) { return this; }

        // Remove all handlers for all types
        if (arguments.length === 0) {
            Object.keys(events).forEach(off, this);
            return this;
        }

        var listeners = events[type];
        if (!listeners) { return; }

        // Remove all handlers for type
        if (!fn) {
            delete events[type];
            return this;
        }

        // Remove handler fn for type
        var n = listeners.length;
        while (n--) {
            if (listeners[n] === fn) { listeners.splice(n, 1); }
        }

        return this;
    }
});

const $observer = Symbol('Observer');

const A$4            = Array.prototype;
const DOMPrototype = (window.EventTarget || window.Node).prototype;
const nothing$1      = Object.freeze([]);
const isExtensible = Object.isExtensible;


// Utils

function isArrayLike(object) {
	return object
	&& typeof object === 'object'
	// Slows it down a bit
	//&& object.hasOwnProperty('length')
	&& typeof object.length === 'number' ;
}


// Listeners

function getListeners(object, name) {
	return object[$observer].properties[name]
		|| (object[$observer].properties[name] = []);
}

function fire(fns, value, record) {
	if (!fns) { return; }
    fns = fns.slice(0);
	var n = -1;
	while (fns[++n]) {
        // For OO version
        //fns[n].update(value, record);
		fns[n](value, record);
	}
}


// Observer proxy

function trapGet(target, name, self) {
	// Ignore symbols
	let desc;
	return typeof name !== 'symbol'
		&& ((desc = Object.getOwnPropertyDescriptor(target, name)), !desc || desc.writable)
		&& Observer(target[name])
		|| target[name] ;
}

const arrayHandlers = {
	get: trapGet,

	set: function(target, name, value, receiver) {
		// We are setting a symbol
		if (typeof name === 'symbol') {
			target[name] = value;
			return true;
		}

		var old = target[name];
		var length = target.length;

		// If we are setting the same value, we're not really setting at all
		if (old === value) { return true; }

		var properties = target[$observer].properties;
		var change;

		// We are setting length
		if (name === 'length') {
			if (value >= target.length) {
				// Don't allow array length to grow like this
				//target.length = value;
				return true;
			}

			change = {
				index:   value,
				removed: A$4.splice.call(target, value),
				added:   nothing$1,
			};

			while (--old >= value) {
				fire(properties[old], undefined);
			}
		}

		// We are setting an integer string or number
		else if (+name % 1 === 0) {
			name = +name;

			if (value === undefined) {
				if (name < target.length) {
					change = {
						index:   name,
						removed: A$4.splice.call(target, name, 1),
						added:   nothing$1
					};

					value = target[name];
				}
				else {
					return true;
				}
			}
			else {
				change = {
					index:   name,
					removed: A$4.splice.call(target, name, 1, value),
					added:   [value]
				};
			}
		}

		// We are setting some other key
		else {
			target[name] = value;
		}

		if (target.length !== length) {
			fire(properties.length, target.length);
		}

        // Notify the observer
		fire(properties[name], Observer(value) || value);

        var mutate = target[$observer].mutate;
        fire(mutate, receiver, change);

		// Return true to indicate success
		return true;
	}
};

const objectHandlers = {
	get: trapGet,

	set: function(target, name, value, receiver) {
		// If we are setting the same value, we're not really setting at all
		if (target[name] === value) { return true; }

        // Set value on target
		target[name] = value;

        // Notify the observer
        var properties = target[$observer].properties;
		fire(properties[name], Observer(value) || value);

        var mutate = target[$observer].mutate;
        fire(mutate, receiver, {
			name:    name,
			removed: target[name],
			added:   value
		});

		// Return true to indicate success
		return true;
	}

    //			apply: function(target, context, args) {
    //console.log('MethodProxy', target, context, args);
    //debugger;
    //				return Reflect.apply(target, context, args);
    //			}
};

function createObserver(target) {
	var observer = new Proxy(target, isArrayLike(target) ?
		arrayHandlers :
		objectHandlers
	);

	// This is strict but slow
	//define(target, $observer, {
    //    value: {
    //        observer:   observer,
    //        properties: {},
    //        mutate:     []
    //    }
    //});

	// An order of magnitude faster
	target[$observer] = {
		target:     target,
		observer:   observer,
		properties: {},
		mutate:     []
	};

	return observer;
}

function isObservable(object) {
	// Many built-in objects and DOM objects bork when calling their
	// methods via a proxy. They should be considered not observable.
	// I wish there were a way of whitelisting rather than
	// blacklisting, but it would seem not.

	return object
		// Reject primitives and other frozen objects
		// This is really slow...
		//&& !isFrozen(object)
		// I haven't compared this, but it's necessary for audio nodes
		// at least, but then only because we're extending with symbols...
		// hmmm, that may need to change...
		&& isExtensible(object)
		// This is less safe but faster.
		//&& typeof object === 'object'
		// Reject DOM nodes, Web Audio context, MIDI inputs,
		// XMLHttpRequests, which all inherit from EventTarget
		&& !DOMPrototype.isPrototypeOf(object)
		// Reject dates
		&& !(object instanceof Date)
		// Reject regex
		&& !(object instanceof RegExp)
		// Reject maps
		&& !(object instanceof Map)
		&& !(object instanceof WeakMap)
		// Reject sets
		&& !(object instanceof Set)
		&& !(window.WeakSet && object instanceof WeakSet)
		// Reject TypedArrays and DataViews
		&& !ArrayBuffer.isView(object) ;
}

function notify$1(object, path, value) {
	const observer = object[$observer];
	if (!observer) { return; }

	const fns = observer.properties;
	fire(fns[path], value === undefined ? object[path] : value);

    const mutate = observer.mutate;
	fire(mutate, object);
}

function Observer(object) {
	return !object ? undefined :
		object[$observer] ? object[$observer].observer :
		isObservable(object) && createObserver(object) ;
}

function Target(object) {
	return object
		&& object[$observer]
		&& object[$observer].target
		|| object ;
}

/*
parseSelector(string)

Takes a string of the form '[key=value, ... ]' and returns a function isMatch
that returns true when passed an object that matches the selector.
*/

//                 1 key                 2 quote 3 value           4 comma 5 closing bracket
const rselector = /^([^\]=,\s]+)\s*(?:=\s*(['"])?([^\]=,\s]+)\2\s*)?(?:(,)|(])(\s*\.$)?)\s*/;

const fselector = {
    3: function parseValue(match, tokens) {
        match[tokens[1]] =
            tokens[2] ? tokens[3] :
            tokens[3] === 'true' ? true :
            tokens[3] === 'false' ? false :
            isFloatString(tokens[3]) ? parseFloat(tokens[3]) :
            tokens[3] ;

        return match;
    },

    4: parseSelector,

    5: function(match, tokens) {
        return function isMatch(object) {
            let key;

            for (key in match) {
                if (object[key] !== match[key]) {
                    return false;
                }
            }

            return true;
        };
    },

    6: function(match, tokens) {
        throw new Error('Observer: A path may not end with "[key=value]." ' + tokens.input);
    }
};

function isFloatString(string) {
	// Convert to float and back to string to check if it retains
	// the same value.
	const float = parseFloat(string);
	return (float + '') === string;
}

function parse(regex, fns, acc, path) {
    // If path is a regex result, get path from latest index
    const string = typeof path !== 'string' ?
        path.input.slice(path.index + path[0].length + (path.consumed || 0)) :
        path ;

    const tokens = regex.exec(string);
    if (!tokens) {
        throw new Error('Observer: Invalid path: ' + string + ' : ' + path.input);
    }

    let n = -1;
    while (++n < tokens.length) {
        acc = (tokens[n] !== undefined && fns[n]) ? fns[n](acc, tokens) : acc ;
    }

    path.consumed = tokens.index + tokens[0].length + (tokens.consumed || 0);

    return acc;
}

function parseSelector(match, path) {
    return parse(rselector, fselector, match, path);
}

function parseSelector$1(path) {
    return parse(rselector, fselector, {}, path);
}

const A$5       = Array.prototype;
const nothing$2 = Object.freeze([]);

//                   1 .name         [2 number  3 'quote' 4 "quote" ]
const rpath   = /^\.?([^.[\s]+)\s*|^\[(?:(\d+)|'([^']*)'|"([^"]*)")\]\s*|^\[\s*/;

function isPrimitive(object) {
    return !(object && typeof object === 'object');
}

function observePrimitive(primitive, data) {
	if (primitive !== data.value) {
		data.old   = data.value;
		data.value = primitive;
		data.fn(primitive);
	}

	return noop;
}

function observeMutable(object, data) {
	var fns = object[$observer].mutate;
	fns.push(data.fn);

	if (object !== data.value) {
		data.old   = data.value;
		data.value = object;
		data.fn(object, {
			index:   0,
			removed: data.old ? data.old : nothing$2,
			added:   data.value
		});
	}

	return () => {
		remove(fns, data.fn);
	};
}

function observeSelector(object, isMatch, path, data) {
	var unobserve = noop;

	function update(array) {
		var value = array && A$5.find.call(array, isMatch);
		unobserve();
		unobserve = observeUnknown(value, path, data);
	}

	// We create an intermediate data object to go with the new update
	// function. The original data object is passed on inside update.
	var unobserveMutable = observeMutable(object, { fn: update });

	return () => {
		unobserve();
		unobserveMutable();
	};
}

function observeProperty(object, name, path, data) {
	var fns = getListeners(object, name);
	var unobserve = noop;

	function update(value) {
		unobserve();
		unobserve = observeUnknown(value, path, data);
	}

	fns.push(update);
	update(object[name]);

	return () => {
		unobserve();
		remove(fns, update);
	};
}

function readSelector(object, isMatch, path, data) {
	var value = object && A$5.find.call(object, isMatch);
	return observeUnknown(Observer(value) || value, path, data);
}

function readProperty(object, name, path, data) {
	return observeUnknown(Observer(object[name]) || object[name], path, data);
}

function observeUnknown(object, path, data) {
    // path is ''
    if (!path.length) {
		return observePrimitive(object, data) ;
	}

    // path is '.'
    if (path === '.') {
        // We assume the full isObserver() check has been done –
        // this function is internal after all
        return object && object[$observer] ?
            observeMutable(object, data) :
            observePrimitive(object, data) ;
    }

    // Object is primitive
    if (isPrimitive(object)) {
		return observePrimitive(undefined, data);
	}

    const tokens = rpath.exec(path);

    if (!tokens) {
        throw new Error('Observer: Invalid path: ' + path + ' : ' + path.length);
    }

    // path is .name, [number], ['name'] or ["name"]
    const name = tokens[1] || tokens[2] || tokens[3] || tokens[4] ;

    if (name) {
        path = tokens.input.slice(tokens.index + tokens[0].length);
        return object[$observer] ?
            observeProperty(object, name, path, data) :
            readProperty(object, name, path, data) ;
    }

    const isMatch = parseSelector$1(tokens);
    path = tokens.input.slice(tokens.index + tokens[0].length + (tokens.consumed || 0));

    // path is '[key=value]'
    return object[$observer] ?
        observeSelector(object, isMatch, path, data) :
        readSelector(object, isMatch, path, data) ;
}

/*
    observe(path, fn, object)

    path:

    fn:

    object:


    observe(path, fn, object, initialValue)

    initialValue: optional, defaults is undefined

    Initial value of the path. When a path is observed the callback is called
    immediately if the value of the path is not equal to the initialValue. In
    the default case initialValue is undefined, so paths with a value of
    undefined do not cause the callback to be called on setup.

    If you want to force the callback to be called on setup, pass in null
    as an initialValue. After all, in JS null is never equal to null.
*/

function observe(path, fn, object, initialValue) {
    return observeUnknown(Observer(object) || object, path + '', {
        value: initialValue,
        fn:    fn
    });
}

function set(key, object, value) {
    return typeof object.set === "function" ?
        object.set(key, value) :
        (object[key] = value) ;
}

var rpath$1  = /\[?([-\w]+)(?:=(['"])([^\2]+)\2|(true|false)|((?:\d*\.)?\d+))?\]?\.?/g;

function findByProperty(key, value, array) {
    var l = array.length;
    var n = -1;

    while (++n < l) {
        if (array[n][key] === value) {
            return array[n];
        }
    }
}


/* Get path */

function getRegexPathThing(regex, path, object, fn) {
    var tokens = regex.exec(path);

    if (!tokens) {
        throw new Error('Fn.getPath(path, object): invalid path "' + path + '"');
    }

    var key      = tokens[1];
    var property = tokens[3] ?
        findByProperty(key,
            tokens[2] ? tokens[3] :
            tokens[4] ? Boolean(tokens[4]) :
            parseFloat(tokens[5]),
        object) :
        object[key] ;

    return fn(regex, path, property);
}

function getRegexPath(regex, path, object) {
    return regex.lastIndex === path.length ?
        object :
    !(object && typeof object === 'object') ?
        undefined :
    getRegexPathThing(regex, path, object, getRegexPath) ;
}

function getPath(path, object) {
    rpath$1.lastIndex = 0;
    return getRegexPath(rpath$1, path, object) ;
}


/* Set path */

function setRegexPath(regex, path, object, thing) {
    var tokens = regex.exec(path);

    if (!tokens) {
        throw new Error('Fn.getPath(path, object): invalid path "' + path + '"');
    }

    var key = tokens[1];

    if (regex.lastIndex === path.length) {
        // Cannot set to [prop=value] selector
        if (tokens[3]) {
            throw new Error('Fn.setPath(path, object): invalid path "' + path + '"');
        }

        return object[key] = thing;
    }

    var value = tokens[3] ?
        findByProperty(key,
            tokens[2] ? tokens[3] :
            tokens[4] ? Boolean(tokens[4]) :
            parseFloat(tokens[5])
        ) :
        object[key] ;

    if (!(value && typeof value === 'object')) {
        value = {};

        if (tokens[3]) {
            if (object.push) {
                value[key] = tokens[2] ?
                    tokens[3] :
                    parseFloat(tokens[3]) ;

                object.push(value);
            }
            else {
                throw new Error('Not supported');
            }
        }

        set(key, object, value);
    }

    return setRegexPath(regex, path, value, thing);
}

function setPath(path, object, value) {
    rpath$1.lastIndex = 0;
    return setRegexPath(rpath$1, path, object, value);
}

function ObserveSource(end, object, path) {
	this.observable = Observer(object);
	this.path       = path;
	this.end        = end;
}

ObserveSource.prototype = {
	shift: function() {
		var value = this.value;
		this.value = undefined;
		return value;
	},

	push: function() {
		setPath(this.path, this.observable, arguments[arguments.length - 1]);
	},

	stop: function() {
		this.unobserve();
		this.end();
	},

	unobserve: noop
};

function Observable(path, object) {
	return new Stream$1(function setup(notify, stop) {
		var source = new ObserveSource(stop, object, path);

		function update(v) {
			source.value = v === undefined ? null : v ;
			notify('push');
		}

		source.unobserve = observe(path, update, object);
		return source;
	});
}

function requestTime(s, fn) {
    return setTimeout(fn, s * 1000);
}

function equals(a, b) {
    // Fast out if references are for the same object
    if (a === b) { return true; }

    // If either of the values is null, or not an object, we already know
    // they're not equal so get out of here
    if (a === null ||
        b === null ||
        typeof a !== 'object' ||
        typeof b !== 'object') {
        return false;
    }

    // Compare their enumerable keys
    const akeys = Object.keys(a);
    let n = akeys.length;

    while (n--) {
        // Has the property been set to undefined on a?
        if (a[akeys[n]] === undefined) {
            // We don't want to test if it is an own property of b, as
            // undefined represents an absence of value
            if (b[akeys[n]] === undefined) {
                return true;
            }
        }
        else {
            //
            if (b.hasOwnProperty(akeys[n]) && !equals(a[akeys[n]], b[akeys[n]])) {
                return false;
            }
        }
    }

    return true;
}

function exec(regex, fn, string) {
    let data;

    // If string looks like a regex result, get rest of string
    // from latest index
    if (string.input !== undefined && string.index !== undefined) {
        data   = string;
        string = data.input.slice(
            string.index
            + string[0].length
            + (string.consumed || 0)
        );
    }

    // Look for tokens
    const tokens = regex.exec(string);
    if (!tokens) { return; }

    const output = fn(tokens);

    // If we have a parent tokens object update its consumed count
    if (data) {
        data.consumed = (data.consumed || 0)
            + tokens.index
            + tokens[0].length
            + (tokens.consumed || 0) ;
    }

    return output;
}

function get(key, object) {
    // Todo? Support WeakMaps and Maps and other map-like objects with a
    // get method - but not by detecting the get method
    return object[key];

    // Why are we protecting against null again? To innoculate ourselves
    // against DOM nodes?
    //return value === null ? undefined : value ;
}

/*
has(key, value, object)

Returns `true` if `object[key]` is strictly equal to `value`.
*/

function has(key, value, object) {
    return object[key] === value;
}

var _is = Object.is || function is(a, b) { return a === b; };

function invoke(name, values, object) {
    return object[name].apply(object, values);
}

function matches(object, item) {
	let property;
	for (property in object) {
		if (object[property] !== item[property]) { return false; }
	}
	return true;
}

function error(regex, reducers, string) {
    if (string.input !== undefined && string.index !== undefined) {
        string = string.input;
    }

    throw new Error('Cannot capture() in invalid string "' + string + '"');
}

function reduce$1(reducers, acc, tokens) {
    let n = -1;

    while (++n < tokens.length) {
        acc = (tokens[n] !== undefined && reducers[n]) ? reducers[n](acc, tokens) : acc ;
    }

    // Call the optional close fn
    return reducers.close ?
        reducers.close(acc, tokens) :
        acc ;
}

function capture(regex, reducers, acc, string) {
    const output = exec(regex, (tokens) => reduce$1(reducers, acc, tokens), string);

    // If tokens is undefined exec has failed apply regex to string
    return output === undefined ?
        // If there is a catch function, call it, otherwise error out
        reducers.catch ?
            reducers.catch(acc, string) :
            error(regex, reducers, string) :

        // Return the accumulator
        output ;
}

const N     = Number.prototype;
const isNaN = Number.isNaN;

function toFixed(n, value) {
    if (isNaN(value)) {
        throw new Error('Fn.toFixed does not accept NaN.');
    }

    return N.toFixed.call(value, n);
}

function ap(data, fns) {
	let n = -1;
	let fn;
	while (fn = fns[++n]) {
		fn(data);
	}
}

function take(i, object) {
    if (object.slice) { return object.slice(0, i); }
    if (object.take)  { return object.take(i); }

    var a = [];
    var n = i;
    while (n--) { a[n] = object[n]; }
    return a;
}

const assign$2 = Object.assign;

function update(fn, target, array) {
    return array.reduce(function(target, obj2) {
        var obj1 = target.find(compose(is(fn(obj2)), fn));
        if (obj1) {
            assign$2(obj1, obj2);
        }
        else {
            insert(fn, target, obj2);
        }
        return target;
    }, target);
}

function diff(array, object) {
    var values = toArray$1(array);

    return filter(function(value) {
        var i = values.indexOf(value);
        if (i === -1) { return true; }
        values.splice(i, 1);
        return false;
    }, object)
    .concat(values);
}

function intersect(array, object) {
    var values = toArray$1(array);

    return filter(function(value) {
        var i = values.indexOf(value);
        if (i === -1) { return false; }
        values.splice(i, 1);
        return true;
    }, object);
}

function unite(array, object) {
    var values = toArray(array);

    return map(function(value) {
        var i = values.indexOf(value);
        if (i > -1) { values.splice(i, 1); }
        return value;
    }, object)
    .concat(values);
}

function last(array) {
    if (typeof array.length === 'number') {
        return array[array.length - 1];
    }

    // Todo: handle Fns and Streams
}

function append$1(string1, string2) {
    return '' + string2 + string1;
}

function prepad(chars, n, value) {
    var string = value + '';
    var i = -1;
    var pre = '';

    while (pre.length < n - string.length) {
        pre += chars[++i % chars.length];
    }

    string = pre + string;
    return string.slice(string.length - n);
}

function postpad(chars, n, value) {
    var string = value + '';

    while (string.length < n) {
        string = string + chars;
    }

    return string.slice(0, n);
}

/*
slugify(string)

Replaces any series of non-word characters with a `'-'` and lowercases the rest.

    slugify('Party on #mydudes!') // 'party-on-mydudes'
*/

function slugify(string) {
    if (typeof string !== 'string') { return; }
    return string
    .trim()
    .toLowerCase()
    .replace(/^[\W_]+/, '')
    .replace(/[\W_]+$/, '')
    .replace(/[\W_]+/g, '-');
}

function toCamelCase(string) {
    // Be gracious in what we accept as input
    return string.replace(/-(\w)?/g, function($0, letter) {
        return letter ? letter.toUpperCase() : '';
    });
}

const DEBUG$1 = window.DEBUG === undefined || window.DEBUG;

const defs = {
    // Primitive types

    'boolean': (value) =>
        typeof value === 'boolean',

    'function': (value) =>
        typeof value === 'function',

    'number': (value) =>
        typeof value === 'number',

    'object': (value) =>
        typeof value === 'object',

    'symbol': (value) =>
        typeof value === 'symbol',

    // Functional types
    // Some of these are 'borrowed' from SancturyJS
    // https://github.com/sanctuary-js/sanctuary-def/tree/v0.19.0

    'Any': noop,

    'Array': (value) =>
        Array.isArray(value),

    'ArrayLike': (value) =>
        typeof value.length === 'number',

    'Boolean': (value) =>
        typeof value === 'boolean',

    'Date': (value) =>
        value instanceof Date
        && !Number.isNaN(value.getTime()),

    'Error': (value) =>
        value instanceof Error,

    'Integer': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value,

    'NegativeInteger': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value < 0,

    'NonPositiveInteger': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value <= 0,

    'PositiveInteger': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value > 0,

    'NonNegativeInteger': (value) =>
        Number.isInteger(value)
        && Number.MIN_SAFE_INTEGER <= value
        && Number.MAX_SAFE_INTEGER >= value
        && value >= 0,

    'Number': (value) =>
        typeof value === 'number'
        && !Number.isNaN(value),

    'NegativeNumber': (value) =>
        typeof value === 'number'
        && value < 0,

    'NonPositiveNumber': (value) =>
        typeof value === 'number'
        && value <= 0,

    'PositiveNumber': (value) =>
        typeof value === 'number'
        && value > 0,

    'NonNegativeNumber': (value) =>
        typeof value === 'number'
        && value >= 0,

    'Null': (value) =>
        value === null,

    'Object': (value) =>
        !!value
        && typeof value === 'object',

    'RegExp': (value) =>
        value instanceof RegExp
};

const checkType = DEBUG$1 ? function checkType(type, value, file, line, message) {
    if (!defs[type]) {
        throw new RangeError('Type "' + type + '" not recognised');
    }

    if (!defs[type](value)) {
        throw new Error(message || 'value not of type "' + type + '": ' + value, file, line);
    }
} : noop ;

const checkTypes = DEBUG$1 ? function checkTypes(types, args, file, line) {
    var n = types.length;

    while (n--) {
        checkType(types[n], args[n], file, line, 'argument ' + n + ' not of type "' + types[n] + '": ' + args[n]);
    }
} : noop ;

function def(notation, fn, file, line) {
    // notation is of the form:
    // 'Type, Type -> Type'
    // Be generous with what we accept as output marker '->' or '=>'
    var parts = notation.split(/\s*[=-]>\s*/);
    var types = parts[0].split(/\s*,\s*/);
    var returnType = parts[1];

    return DEBUG$1 ? function() {
        checkTypes(types, arguments, file, line);
        const output = fn.apply(this, arguments);
        checkType(returnType, output, file, line, 'return value not of type "' + returnType + '": ' + output);
        return output;
    } : fn ;
}

// Cubic bezier function (originally translated from
// webkit source by Christian Effenberger):
// http://www.netzgesta.de/dev/cubic-bezier-timing-function.html


function sampleCubicBezier(a, b, c, t) {
    // `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
    return ((a * t + b) * t + c) * t;
}

function sampleCubicBezierDerivative(a, b, c, t) {
    return (3 * a * t + 2 * b) * t + c;
}

function solveCubicBezierX(a, b, c, x, epsilon) {
    // Solve x for a cubic bezier
    var x2, d2, i;
    var t2 = x;

    // First try a few iterations of Newton's method -- normally very fast.
    for(i = 0; i < 8; i++) {
        x2 = sampleCubicBezier(a, b, c, t2) - x;
        if (Math.abs(x2) < epsilon) {
            return t2;
        }
        d2 = sampleCubicBezierDerivative(a, b, c, t2);
        if (Math.abs(d2) < 1e-6) {
            break;
        }
        t2 = t2 - x2 / d2;
    }

    // Fall back to the bisection method for reliability.
    var t0 = 0;
    var t1 = 1;

    t2 = x;

    if(t2 < t0) { return t0; }
    if(t2 > t1) { return t1; }

    while(t0 < t1) {
        x2 = sampleCubicBezier(a, b, c, t2);
        if(Math.abs(x2 - x) < epsilon) {
            return t2;
        }
        if (x > x2) { t0 = t2; }
        else { t1 = t2; }
        t2 = (t1 - t0) * 0.5 + t0;
    }

    // Failure.
    return t2;
}

function cubicBezier(p1, p2, duration, x) {
    // The epsilon value to pass given that the animation is going
    // to run over duruation seconds. The longer the animation, the
    // more precision is needed in the timing function result to
    // avoid ugly discontinuities.
    var epsilon = 1 / (200 * duration);

    // Calculate the polynomial coefficients. Implicit first and last
    // control points are (0,0) and (1,1).
    var cx = 3 * p1[0];
    var bx = 3 * (p2[0] - p1[0]) - cx;
    var ax = 1 - cx - bx;
    var cy = 3 * p1[1];
    var by = 3 * (p2[1] - p1[1]) - cy;
    var ay = 1 - cy - by;

    var y = solveCubicBezierX(ax, bx, cx, x, epsilon);
    return sampleCubicBezier(ay, by, cy, y);
}

// Normalisers take a min and max and transform a value in that range
// to a value on the normal curve of a given type

const linear = def(
    'Number, Number, Number => Number',
    (min, max, value) => (value - min) / (max - min)
);

const quadratic = def(
    'Number, Number, Number => Number',
    (min, max, value) => Math.pow((value - min) / (max - min), 1/2)
);

const cubic = def(
    'Number, Number, Number => Number',
    (min, max, value) => Math.pow((value - min) / (max - min), 1/3)
);

const logarithmic = def(
    'PositiveNumber, PositiveNumber, NonNegativeNumber => Number',
    (min, max, value) => Math.log(value / min) / Math.log(max / min)
);

const linearLogarithmic = def(
    'PositiveNumber, PositiveNumber, NonNegativeNumber => Number',
    (min, max, value) => {
        // The bottom 1/9th of the range is linear from 0 to min, while
        // the top 8/9ths is dB linear from min to max.
        return value <= min ?
            (value / min) / 9 :
            (0.1111111111111111 + (Math.log(value / min) / Math.log(max / min)) / 1.125) ;
    }
);

// cubicBezier
// `begin` and `end` are objects of the form
// { point:  [x, y], handle: [x, y] }

const cubicBezier$1 = def(
    'Object, Object, Number => Number',
    (begin, end, value) => cubicBezier({
        0: linear(begin.point[0], end.point[0], begin.handle[0]),
        1: linear(begin.point[0], end.point[0], begin.handle[0])
    }, {
        0: linear(begin.point[0], end.point[0], end.handle[0]),
        1: linear(begin.point[0], end.point[0], end.handle[0])
    }, 1, linear(begin.point[0], end.point[0], value))
);

var normalise = /*#__PURE__*/Object.freeze({
    linear: linear,
    quadratic: quadratic,
    cubic: cubic,
    logarithmic: logarithmic,
    linearLogarithmic: linearLogarithmic,
    cubicBezier: cubicBezier$1
});

// Denormalisers take a min and max and transform a value into that range
// from the range of a curve of a given type

const linear$1 = def(
    'Number, Number, Number => Number',
    (min, max, value) => value * (max - min) + min
);

const quadratic$1 = def(
    'Number, Number, Number => Number',
    (min, max, value) => Math.pow(value, 2) * (max - min) + min
);

const cubic$1 = def(
    'Number, Number, Number => Number',
    (min, max, value) => Math.pow(value, 3) * (max - min) + min
);

const logarithmic$1 = def(
    'PositiveNumber, PositiveNumber, Number => Number',
    (min, max, value) => min * Math.pow(max / min, value)
);

const linearLogarithmic$1 = def(
    'PositiveNumber, PositiveNumber, Number => Number',
    (min, max, value) => {
        // The bottom 1/9th of the range is linear from 0 to min, while
        // the top 8/9ths is dB linear from min to max.
        return value <= 0.1111111111111111 ?
            value * 9 * min :
            min * Math.pow(max / min, (value - 0.1111111111111111) * 1.125);
    }
);

// cubicBezier
// `begin` and `end` are objects of the form
// { point:  [x, y], handle: [x, y] }

const cubicBezier$2 = def(
    'Object, Object, Number => Number',
    (begin, end, value) => linear$1(cubicBezier({
        0: linear(begin.point[0], end.point[0], begin.handle[0]),
        1: linear(begin.point[0], end.point[0], begin.handle[0])
    }, {
        0: linear(begin.point[0], end.point[0], end.handle[0]),
        1: linear(begin.point[0], end.point[0], end.handle[0])
    }, 1, value))
);

var denormalise = /*#__PURE__*/Object.freeze({
    linear: linear$1,
    quadratic: quadratic$1,
    cubic: cubic$1,
    logarithmic: logarithmic$1,
    linearLogarithmic: linearLogarithmic$1,
    cubicBezier: cubicBezier$2
});

// Constant for converting radians to degrees
const angleFactor = 180 / Math.PI;

function add(a, b)  { return b + a; }
function multiply(a, b) { return b * a; }
function min(a, b)  { return a > b ? b : a ; }
function max(a, b)  { return a < b ? b : a ; }
function pow(n, x)  { return Math.pow(x, n); }
function exp(n, x)  { return Math.pow(n, x); }
function log(n, x)  { return Math.log(x) / Math.log(n); }
function root(n, x) { return Math.pow(x, 1/n); }

function mod(d, n) {
    // JavaScript's modulu operator % uses Euclidean division, but for
    // stuff that cycles through 0 the symmetrics of floored division
    // are more useful.
    // https://en.wikipedia.org/wiki/Modulo_operation
    var value = n % d;
    return value < 0 ? value + d : value ;
}

function limit(min, max, n) {
    return n > max ? max : n < min ? min : n ;
}

function wrap(min, max, n) {
    return (n < min ? max : min) + (n - min) % (max - min);
}

function gcd(a, b) {
    // Greatest common divider
    return b ? gcd(b, a % b) : a ;
}

function lcm(a, b) {
    // Lowest common multiple.
    return a * b / gcd(a, b);
}

function factorise(n, d) {
    // Reduce a fraction by finding the Greatest Common Divisor and
    // dividing by it.
    var f = gcd(n, d);
    return [n/f, d/f];
}

// A bit disturbingly, a correction factor is needed to make todB() and
// to toLevel() reciprocate more accurately. This is quite a lot to off
// by... investigate?
const dBCorrectionFactor = (60 / 60.205999132796244);

function todB(n)    { return 20 * Math.log10(n) * dBCorrectionFactor; }
function toLevel(n) { return Math.pow(2, n / 6); }
function toRad(n)   { return n / angleFactor; }
function toDeg(n)   { return n * angleFactor; }

// Exponential functions
//
// e - exponent
// x - range 0-1
//
// eg.
// var easeInQuad   = exponential(2);
// var easeOutCubic = exponentialOut(3);
// var easeOutQuart = exponentialOut(4);

function exponentialOut(e, x) {
    return 1 - Math.pow(1 - x, e);
}

function toPolar(cartesian) {
    var x = cartesian[0];
    var y = cartesian[1];

    return [
        // Distance
        x === 0 ?
            Math.abs(y) :
        y === 0 ?
            Math.abs(x) :
            Math.sqrt(x*x + y*y) ,
        // Angle
        Math.atan2(x, y)
    ];
}

function toCartesian(polar) {
    var d = polar[0];
    var a = polar[1];

    return [
        Math.sin(a) * d ,
        Math.cos(a) * d
    ];
}

function createOrdinals(ordinals) {
	var array = [], n = 0;

	while (n++ < 31) {
		array[n] = ordinals[n] || ordinals.n;
	}

	return array;
}

var langs = {
	'en': {
		days:     ('Sunday Monday Tuesday Wednesday Thursday Friday Saturday').split(' '),
		months:   ('January February March April May June July August September October November December').split(' '),
		ordinals: createOrdinals({ n: 'th', 1: 'st', 2: 'nd', 3: 'rd', 21: 'st', 22: 'nd', 23: 'rd', 31: 'st' })
	},

	'fr': {
		days:     ('dimanche lundi mardi mercredi jeudi vendredi samedi').split(' '),
		months:   ('janvier février mars avril mai juin juillet août septembre octobre novembre décembre').split(' '),
		ordinals: createOrdinals({ n: "ième", 1: "er" })
	},

	'de': {
		days:     ('Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag').split(' '),
		months:   ('Januar Februar März April Mai Juni Juli Oktober September Oktober November Dezember').split(' '),
		ordinals: createOrdinals({ n: "er" })
	},

	'it': {
		days:     ('domenica lunedì martedì mercoledì giovedì venerdì sabato').split(' '),
		months:   ('gennaio febbraio marzo aprile maggio giugno luglio agosto settembre ottobre novembre dicembre').split(' '),
		ordinals: createOrdinals({ n: "o" })
	}
};


// Date string parsing
//
// Don't parse date strings with the JS Date object. It has variable
// time zone behaviour. Set up our own parsing.
//
// Accept BC dates by including leading '-'.
// (Year 0000 is 1BC, -0001 is 2BC.)
// Limit months to 01-12
// Limit dates to 01-31

var rdate     = /^(-?\d{4})(?:-(0[1-9]|1[012])(?:-(0[1-9]|[12]\d|3[01])(?:T([01]\d|2[0-3])(?::([0-5]\d)(?::([0-5]\d)(?:.(\d+))?)?)?)?)?)?([+-]([01]\d|2[0-3]):?([0-5]\d)?|Z)?$/;
//                sign   year        month       day               T or -
var rdatediff = /^([+-])?(\d{2,})(?:-(\d{2,})(?:-(\d{2,}))?)?(?:([T-])|$)/;

var parseDate = overload(toType, {
	number:  secondsToDate,
	string:  exec$1(rdate, createDate),
	object:  function(date) {
		return isValidDate(date) ? date : undefined ;
	},
	default: noop
});

var parseDateLocal = overload(toType, {
	number:  secondsToDate,
	string:  exec$1(rdate, createDateLocal),
	object:  function(date) {
		return date instanceof Date ? date : undefined ;
	},
	default: noop
});

function isValidDate(date) {
	return toClass(date) === "Date" && !Number.isNaN(date.getTime()) ;
}

function createDate(match, year, month, day, hour, minute, second, ms, zone, zoneHour, zoneMinute) {
	// Month must be 0-indexed for the Date constructor
	month = parseInt(month, 10) - 1;

	var date = new Date(
		ms ?     Date.UTC(year, month, day, hour, minute, second, ms) :
		second ? Date.UTC(year, month, day, hour, minute, second) :
		minute ? Date.UTC(year, month, day, hour, minute) :
		hour ?   Date.UTC(year, month, day, hour) :
		day ?    Date.UTC(year, month, day) :
		month ?  Date.UTC(year, month) :
		Date.UTC(year)
	);

	if (zone && (zoneHour !== '00' || (zoneMinute !== '00' && zoneMinute !== undefined))) {
		setTimeZoneOffset(zone[0], zoneHour, zoneMinute, date);
	}

	return date;
}

function createDateLocal(year, month, day, hour, minute, second, ms, zone) {
	if (zone) {
		throw new Error('Time.parseDateLocal() will not parse a string with a time zone "' + zone + '".');
	}

	// Month must be 0-indexed for the Date constructor
	month = parseInt(month, 10) - 1;

	return ms ?  new Date(year, month, day, hour, minute, second, ms) :
		second ? new Date(year, month, day, hour, minute, second) :
		minute ? new Date(year, month, day, hour, minute) :
		hour ?   new Date(year, month, day, hour) :
		day ?    new Date(year, month, day) :
		month ?  new Date(year, month) :
		new Date(year) ;
}

function exec$1(regex, fn, error) {
	return function exec(string) {
		var parts = regex.exec(string);
		if (!parts && error) { throw error; }
		return parts ?
			fn.apply(null, parts) :
			undefined ;
	};
}

function secondsToDate(n) {
	return new Date(secondsToMilliseconds(n));
}

function setTimeZoneOffset(sign, hour, minute, date) {
	if (sign === '+') {
		date.setUTCHours(date.getUTCHours() - parseInt(hour, 10));
		if (minute) {
			date.setUTCMinutes(date.getUTCMinutes() - parseInt(minute, 10));
		}
	}
	else if (sign === '-') {
		date.setUTCHours(date.getUTCHours() + parseInt(hour, 10));
		if (minute) {
			date.setUTCMinutes(date.getUTCMinutes() + parseInt(minute, 10));
		}
	}

	return date;
}



// Date object formatting
//
// Use the internationalisation methods for turning a date into a UTC or
// locale string, the date object for turning them into a local string.

var dateFormatters = {
	YYYY: function(date)       { return ('000' + date.getFullYear()).slice(-4); },
	YY:   function(date)       { return ('0' + date.getFullYear() % 100).slice(-2); },
	MM:   function(date)       { return ('0' + (date.getMonth() + 1)).slice(-2); },
	MMM:  function(date, lang) { return this.MMMM(date, lang).slice(0,3); },
	MMMM: function(date, lang) { return langs[lang || Time.lang].months[date.getMonth()]; },
	D:    function(date)       { return '' + date.getDate(); },
	DD:   function(date)       { return ('0' + date.getDate()).slice(-2); },
	ddd:  function(date, lang) { return this.dddd(date, lang).slice(0,3); },
	dddd: function(date, lang) { return langs[lang || Time.lang].days[date.getDay()]; },
	hh:   function(date)       { return ('0' + date.getHours()).slice(-2); },
	//hh:   function(date)       { return ('0' + date.getHours() % 12).slice(-2); },
	mm:   function(date)       { return ('0' + date.getMinutes()).slice(-2); },
	ss:   function(date)       { return ('0' + date.getSeconds()).slice(-2); },
	sss:  function(date)       { return (date.getSeconds() + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
	ms:   function(date)       { return '' + date.getMilliseconds(); },

	// Experimental
	am:   function(date) { return date.getHours() < 12 ? 'am' : 'pm'; },
	zz:   function(date) {
		return (date.getTimezoneOffset() < 0 ? '+' : '-') +
			 ('0' + Math.round(100 * Math.abs(date.getTimezoneOffset()) / 60)).slice(-4) ;
	},
	th:   function(date, lang) { return langs[lang || Time.lang].ordinals[date.getDate()]; },
	n:    function(date) { return +date; },
	ZZ:   function(date) { return -date.getTimezoneOffset() * 60; }
};

var componentFormatters = {
	YYYY: function(data)       { return data.year; },
	YY:   function(data)       { return ('0' + data.year).slice(-2); },
	MM:   function(data)       { return data.month; },
	MMM:  function(data, lang) { return this.MMMM(data, lang).slice(0,3); },
	MMMM: function(data, lang) { return langs[lang].months[data.month - 1]; },
	D:    function(data)       { return parseInt(data.day, 10) + ''; },
	DD:   function(data)       { return data.day; },
	ddd:  function(data)       { return data.weekday.slice(0,3); },
	dddd: function(data, lang) { return data.weekday; },
	hh:   function(data)       { return data.hour; },
	//hh:   function(data)       { return ('0' + data.hour % 12).slice(-2); },
	mm:   function(data)       { return data.minute; },
	ss:   function(data)       { return data.second; },
	//sss:  function(data)       { return (date.second + date.getMilliseconds() / 1000 + '').replace(/^\d\.|^\d$/, function($0){ return '0' + $0; }); },
	//ms:   function(data)       { return '' + date.getMilliseconds(); },
};

var componentKeys = {
	// Components, in order of appearance in the locale string
	'en-US': ['weekday', 'month', 'day', 'year', 'hour', 'minute', 'second'],
	// fr: "lundi 12/02/2018 à 18:54:09" (different in IE/Edge, of course)
	// de: "Montag, 12.02.2018, 19:28:39" (different in IE/Edge, of course)
	default: ['weekday', 'day', 'month', 'year', 'hour', 'minute', 'second']
};

var options = {
	// Time zone
	timeZone:      'UTC',
	// Use specified locale matcher
	formatMatcher: 'basic',
	// Use 24 hour clock
	hour12:        false,
	// Format string components
	weekday:       'long',
	year:          'numeric',
	month:         '2-digit',
	day:           '2-digit',
	hour:          '2-digit',
	minute:        '2-digit',
	second:        '2-digit',
	//timeZoneName:  'short'
};

var rtoken    = /([YZMDdhmswz]{2,4}|D|\+-)/g;
var rusdate   = /\w{3,}|\d+/g;
var rdatejson = /^"(-?\d{4,}-\d\d-\d\d)/;

function matchEach(regex, fn, text) {
	var match = regex.exec(text);

	return match ? (
		fn.apply(null, match),
		matchEach(regex, fn, text)
	) :
	undefined ;
}

function toLocaleString(timezone, locale, date) {
	options.timeZone = timezone || 'UTC';
	var string = date.toLocaleString(locale, options);
	return string;
}

function toLocaleComponents(timezone, locale, date) {
	var localedate = toLocaleString(timezone, locale, date);
	var components = {};
	var keys       = componentKeys[locale] || componentKeys.default;
	var i          = 0;

	matchEach(rusdate, function(value) {
		components[keys[i++]] = value;
	}, localedate);

	return components;
}

function _formatDate(string, timezone, locale, date) {
	// Derive lang from locale
	var lang = locale ? locale.slice(0,2) : document.documentElement.lang ;

	// Todo: only en-US and fr supported for the time being
	locale = locale === 'en' ? 'en-US' :
		locale ? locale :
		'en-US';

	var data    = toLocaleComponents(timezone, locale, date);
	var formats = componentFormatters;

	return string.replace(rtoken, function($0) {
		return formats[$0] ? formats[$0](data, lang) : $0 ;
	});
}

function formatDateLocal(string, locale, date) {
	var formatters = dateFormatters;
	var lang = locale.slice(0, 2);

	// Use date formatters to get time as current local time
	return string.replace(rtoken, function($0) {
		return formatters[$0] ? formatters[$0](date, lang) : $0 ;
	});
}

function formatDateISO(date) {
	return rdatejson.exec(JSON.stringify(parseDate(date)))[1];
}


// Time operations

var days   = {
	mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0
};

var dayMap = [6,0,1,2,3,4,5];

function toDay(date) {
	return dayMap[date.getDay()];
}

function cloneDate(date) {
	return new Date(+date);
}

function addDateComponents(sign, yy, mm, dd, date) {
	date.setUTCFullYear(date.getUTCFullYear() + sign * parseInt(yy, 10));

	if (!mm) { return; }

	// Adding and subtracting months can give weird results with the JS
	// date object. For example, taking a montha way from 2018-03-31 results
	// in 2018-03-03 (or the 31st of February), whereas adding a month on to
	// 2018-05-31 results in the 2018-07-01 (31st of June).
	//
	// To mitigate this weirdness track the target month and roll days back
	// until the month is correct, like Python's relativedelta utility:
	// https://dateutil.readthedocs.io/en/stable/relativedelta.html#examples
	var month       = date.getUTCMonth();
	var monthDiff   = sign * parseInt(mm, 10);
	var monthTarget = mod(12, month + monthDiff);

	date.setUTCMonth(month + monthDiff);

	// If the month is too far in the future scan backwards through
	// months until it fits. Setting date to 0 means setting to last
	// day of previous month.
	while (date.getUTCMonth() > monthTarget) { date.setUTCDate(0); }

	if (!dd) { return; }

	date.setUTCDate(date.getUTCDate() + sign * parseInt(dd, 10));
}

function _addDate(duration, date) {
	// Don't mutate the original date
	date = cloneDate(date);

	// First parse the date portion duration and add that to date
	var tokens = rdatediff.exec(duration) ;
	var sign = 1;

	if (tokens) {
		sign = tokens[1] === '-' ? -1 : 1 ;
		addDateComponents(sign, tokens[2], tokens[3], tokens[4], date);

		// If there is no 'T' separator go no further
		if (!tokens[5]) { return date; }

		// Prepare duration for time parsing
		duration = duration.slice(tokens[0].length);

		// Protect against parsing a stray sign before time
		if (duration[0] === '-') { return date; }
	}

	// Then parse the time portion and add that to date
	var time = parseTimeDiff(duration);
	if (time === undefined) { return; }

	date.setTime(date.getTime() + sign * time * 1000);
	return date;
}

function diff$1(t, d1, d2) {
	var y1 = d1.getUTCFullYear();
	var m1 = d1.getUTCMonth();
	var y2 = d2.getUTCFullYear();
	var m2 = d2.getUTCMonth();

	if (y1 === y2 && m1 === m2) {
		return t + d2.getUTCDate() - d1.getUTCDate() ;
	}

	t += d2.getUTCDate() ;

	// Set to last date of previous month
	d2.setUTCDate(0);
	return diff$1(t, d1, d2);
}

function _diffDateDays(date1, date2) {
	var d1 = parseDate(date1);
	var d2 = parseDate(date2);

	return d2 > d1 ?
		// 3rd argument mutates, so make sure we get a clean date if we
		// have not just made one.
		diff$1(0, d1, d2 === date2 || d1 === d2 ? cloneDate(d2) : d2) :
		diff$1(0, d2, d1 === date1 || d2 === d1 ? cloneDate(d1) : d1) * -1 ;
}

function floorDateByGrain(grain, date) {
	var diff, week;

	if (grain === 'ms') { return date; }

	date.setUTCMilliseconds(0);
	if (grain === 'second') { return date; }

	date.setUTCSeconds(0);
	if (grain === 'minute') { return date; }

	date.setUTCMinutes(0);
	if (grain === 'hour') { return date; }

	date.setUTCHours(0);
	if (grain === 'day') { return date; }

	if (grain === 'week') {
		date.setDate(date.getDate() - toDay(date));
		return date;
	}

	if (grain === 'fortnight') {
		week = floorDateByDay(1, new Date());
		diff = mod(14, _diffDateDays(week, date));
		date.setUTCDate(date.getUTCDate() - diff);
		return date;
	}

	date.setUTCDate(1);
	if (grain === 'month') { return date; }

	date.setUTCMonth(0);
	if (grain === 'year') { return date; }

	date.setUTCFullYear(0);
	return date;
}

function floorDateByDay(day, date) {
	var currentDay = date.getUTCDay();

	// If we are on the specified day, return this date
	if (day === currentDay) { return date; }

	var diff = currentDay - day;
	if (diff < 0) { diff = diff + 7; }
	return _addDate('-0000-00-0' + diff, date);
}

function _floorDate(grain, date) {
	// Clone date before mutating it
	date = cloneDate(date);

	// Take a day string or number, find the last matching day
	var day = typeof grain === 'number' ?
		grain :
		days[grain] ;

	return isDefined(day) ?
		floorDateByDay(day, date) :
		floorDateByGrain(grain, date) ;
}

const addDate = curry$1(function(diff, date) {
	return _addDate(diff, parseDate(date));
});

const diffDateDays = curry$1(_diffDateDays);

const floorDate = curry$1(function(token, date) {
	return _floorDate(token, parseDate(date));
});

const formatDate = curry$1(function(string, timezone, locale, date) {
	return string === 'ISO' ?
		formatDateISO(parseDate(date)) :
	timezone === 'local' ?
		formatDateLocal(string, locale, date) :
	_formatDate(string, timezone, locale, parseDate(date)) ;
});


// Time

// Decimal places to round to when comparing times
var precision = 9;
function minutesToSeconds(n) { return n * 60; }
function hoursToSeconds(n) { return n * 3600; }

function secondsToMilliseconds(n) { return n * 1000; }
function secondsToMinutes(n) { return n / 60; }
function secondsToHours(n) { return n / 3600; }
function secondsToDays(n) { return n / 86400; }
function secondsToWeeks(n) { return n / 604800; }

function prefix(n) {
	return n >= 10 ? '' : '0';
}

// Hours:   00-23 - 24 should be allowed according to spec
// Minutes: 00-59 -
// Seconds: 00-60 - 60 is allowed, denoting a leap second

//var rtime   = /^([+-])?([01]\d|2[0-3])(?::([0-5]\d)(?::([0-5]\d|60)(?:.(\d+))?)?)?$/;
//                sign   hh       mm           ss
var rtime     = /^([+-])?(\d{2,}):([0-5]\d)(?::((?:[0-5]\d|60)(?:.\d+)?))?$/;
var rtimediff = /^([+-])?(\d{2,}):(\d{2,})(?::(\d{2,}(?:.\d+)?))?$/;

var parseTime = overload(toType, {
	number:  id,
	string:  exec$1(rtime, createTime),
	default: function(object) {
		throw new Error('parseTime() does not accept objects of type ' + (typeof object));
	}
});

var parseTimeDiff = overload(toType, {
	number:  id,
	string:  exec$1(rtimediff, createTime),
	default: function(object) {
		throw new Error('parseTime() does not accept objects of type ' + (typeof object));
	}
});

var _floorTime = choose({
	week:   function(time) { return time - mod(604800, time); },
	day:    function(time) { return time - mod(86400, time); },
	hour:   function(time) { return time - mod(3600, time); },
	minute: function(time) { return time - mod(60, time); },
	second: function(time) { return time - mod(1, time); }
});

var timeFormatters = {
	'+-': function sign(time) {
		return time < 0 ? '-' : '' ;
	},

	www: function www(time) {
		time = time < 0 ? -time : time;
		var weeks = Math.floor(secondsToWeeks(time));
		return prefix(weeks) + weeks;
	},

	dd: function dd(time) {
		time = time < 0 ? -time : time;
		var days = Math.floor(secondsToDays(time));
		return prefix(days) + days;
	},

	hhh: function hhh(time) {
		time = time < 0 ? -time : time;
		var hours = Math.floor(secondsToHours(time));
		return prefix(hours) + hours;
	},

	hh: function hh(time) {
		time = time < 0 ? -time : time;
		var hours = Math.floor(secondsToHours(time % 86400));
		return prefix(hours) + hours;
	},

	mm: function mm(time) {
		time = time < 0 ? -time : time;
		var minutes = Math.floor(secondsToMinutes(time % 3600));
		return prefix(minutes) + minutes;
	},

	ss: function ss(time) {
		time = time < 0 ? -time : time;
		var seconds = Math.floor(time % 60);
		return prefix(seconds) + seconds ;
	},

	sss: function sss(time) {
		time = time < 0 ? -time : time;
		var seconds = time % 60;
		return prefix(seconds) + toMaxDecimals(precision, seconds);
	},

	ms: function ms(time) {
		time = time < 0 ? -time : time;
		var ms = Math.floor(secondsToMilliseconds(time % 1));
		return ms >= 100 ? ms :
			ms >= 10 ? '0' + ms :
			'00' + ms ;
	}
};

function createTime(match, sign, hh, mm, sss) {
	var time = hoursToSeconds(parseInt(hh, 10)) + (
		mm ? minutesToSeconds(parseInt(mm, 10)) + (
			sss ? parseFloat(sss, 10) : 0
		) : 0
	);

	return sign === '-' ? -time : time ;
}

function formatTimeString(string, time) {
	return string.replace(rtoken, function($0) {
		return timeFormatters[$0] ? timeFormatters[$0](time) : $0 ;
	}) ;
}

function _formatTimeISO(time) {
	var sign = time < 0 ? '-' : '' ;

	if (time < 0) { time = -time; }

	var hours = Math.floor(time / 3600);
	var hh = prefix(hours) + hours ;
	time = time % 3600;
	if (time === 0) { return sign + hh + ':00'; }

	var minutes = Math.floor(time / 60);
	var mm = prefix(minutes) + minutes ;
	time = time % 60;
	if (time === 0) { return sign + hh + ':' + mm; }

	var sss = prefix(time) + toMaxDecimals(precision, time);
	return sign + hh + ':' + mm + ':' + sss;
}

function toMaxDecimals(precision, n) {
	// Make some effort to keep rounding errors under control by fixing
	// decimals and lopping off trailing zeros
	return n.toFixed(precision).replace(/\.?0+$/, '');
}

const formatTime = curry$1(function(string, time) {
	return string === 'ISO' ?
		_formatTimeISO(parseTime(time)) :
		formatTimeString(string, parseTime(time)) ;
});

const addTime = curry$1(function(time1, time2) {
	return parseTime(time2) + parseTimeDiff(time1);
});

const subTime = curry$1(function(time1, time2) {
	return parseTime(time2) - parseTimeDiff(time1);
});

const diffTime = curry$1(function(time1, time2) {
	return parseTime(time1) - parseTime(time2);
});

const floorTime = curry$1(function(token, time) {
	return _floorTime(token, parseTime(time));
});

var rcomment = /\s*\/\*([\s\S]*)\*\/\s*/;

var domify = overload(toType$1, {
	'string': createArticle,

	'function': function(template, name, size) {
		return createArticle(multiline(template), name, size);
	},

	'default': function(template) {
		// WHAT WHY?
		//var nodes = typeof template.length === 'number' ? template : [template] ;
		//append(nodes);
		//return nodes;
	}
});

var browser = /firefox/i.test(navigator.userAgent) ? 'FF' :
	document.documentMode ? 'IE' :
	'standard' ;

const createSection = cache(function createSection() {
	const section = document.createElement('section');
	section.setAttribute('class', 'test-section');
	document.body.appendChild(section);
	return section;
});

function createArticle(html, name, size) {
	const section = createSection();

	const article = document.createElement('article');
	article.setAttribute('class', 'span-' + (size || 2) + '-test-article test-article');

	const title = document.createElement('h2');
	title.setAttribute('class', 'test-title');
	title.innerHTML = name;

	const div = document.createElement('div');
	div.setAttribute('class', 'test-fixture');

	div.innerHTML = html;
	article.appendChild(title);
	article.appendChild(div);
	section.appendChild(article);

	return {
		section: section,
		article: article,
		title:   title,
		fixture: div
	};
}

function multiline(fn) {
	if (typeof fn !== 'function') { throw new TypeError('multiline: expects a function.'); }
	var match = rcomment.exec(fn.toString());
	if (!match) { throw new TypeError('multiline: comment missing.'); }
	return match[1];
}

function toType$1(object) {
	return typeof object;
}

// #e2006f
// #332256

if (window.console && window.console.log) {
    window.console.log('%cFn%c          - https://github.com/stephband/fn', 'color: #de3b16; font-weight: 600;', 'color: inherit; font-weight: 400;');
}
const requestTime$1 = curry$1(requestTime, true, 2);

function not(a) { return !a; }const toFloat = parseFloat;
const and     = curry$1(function and(a, b) { return !!(a && b); });
const or      = curry$1(function or(a, b) { return a || b; });
const xor     = curry$1(function xor(a, b) { return (a || b) && (!!a !== !!b); });

const assign$3      = curry$1(Object.assign, true, 2);
const capture$1     = curry$1(capture);
const define      = curry$1(Object.defineProperties, true, 2);
const equals$1      = curry$1(equals, true);
const exec$2        = curry$1(exec);
const get$1         = curry$1(get, true);
const has$1         = curry$1(has, true);
const is          = curry$1(_is, true);
const invoke$1      = curry$1(invoke, true);
const matches$1     = curry$1(matches, true);
const parse$1       = curry$1(capture);
const set$1         = curry$1(set, true);
const toFixed$1     = curry$1(toFixed);
const getPath$1     = curry$1(getPath, true);
const setPath$1     = curry$1(setPath, true);

const by$1          = curry$1(by, true);
const byAlphabet$1  = curry$1(byAlphabet);

const ap$1          = curry$1(ap, true);
const concat$1      = curry$1(concat, true);
const contains$1    = curry$1(contains, true);
const each$1        = curry$1(each, true);
const filter$1      = curry$1(filter, true);
const find$1        = curry$1(find, true);
const insert$1      = curry$1(insert, true);
const map$1         = curry$1(map, true);
const reduce$2      = curry$1(reduce, true);
const remove$1      = curry$1(remove, true);
const rest$1        = curry$1(rest, true);
const slice$1       = curry$1(slice, true, 3);
const sort$1        = curry$1(sort, true);
const take$1        = curry$1(take, true);
const update$1      = curry$1(update, true);

const diff$2        = curry$1(diff, true);
const intersect$1   = curry$1(intersect, true);
const unite$1       = curry$1(unite, true);

const append$2      = curry$1(append$1);
const prepend$1     = curry$1(prepend);
const prepad$1      = curry$1(prepad);
const postpad$1     = curry$1(postpad);

const add$1         = curry$1(add);
const multiply$1    = curry$1(multiply);
const min$1         = curry$1(min);
const max$1         = curry$1(max);
const mod$1         = curry$1(mod);
const pow$1         = curry$1(pow);
const exp$1         = curry$1(exp);
const log$1         = curry$1(log);
const gcd$1         = curry$1(gcd);
const lcm$1         = curry$1(lcm);
const root$1        = curry$1(root);
const limit$1       = curry$1(limit);
const wrap$1        = curry$1(wrap);
const factorise$1   = curry$1(factorise);
const cubicBezier$3 = curry$1(cubicBezier);
const normalise$1   = curry$1(choose(normalise), false, 4);
const denormalise$1 = curry$1(choose(denormalise), false, 4);
const exponentialOut$1 = curry$1(exponentialOut);

const ready = new Promise(function(accept, reject) {
	function handle() {
		document.removeEventListener('DOMContentLoaded', handle);
		window.removeEventListener('load', handle);
		accept();
	}

	document.addEventListener('DOMContentLoaded', handle);
	window.addEventListener('load', handle);
});

var ready$1 = ready.then.bind(ready);

function now$1() {
   // Return DOM time in seconds
   return window.performance.now() / 1000;
}

const rules = [];
const rem = /(\d*\.?\d+)r?em/;
const rpercent = /(\d*\.?\d+)%/;

const types = {
    number: function(n) { return n; },

    function: function(fn) { return fn(); },

    string: function(string) {
        var data, n;

        data = rem.exec(string);
        if (data) {
            n = parseFloat(data[1]);
            return getFontSize() * n;
        }

        data = rpercent.exec(string);
        if (data) {
            n = parseFloat(data[1]) / 100;
            return width * n;
        }

        throw new Error('[window.breakpoint] \'' + string + '\' cannot be parsed as rem, em or %.');
    }
};

const tests = {
    minWidth: function(value)  { return width >= types[typeof value](value); },
    maxWidth: function(value)  { return width <  types[typeof value](value); },
    minHeight: function(value) { return height >= types[typeof value](value); },
    maxHeight: function(value) { return height <  types[typeof value](value); },
    minScrollTop: function(value) { return scrollTop >= types[typeof value](value); },
    maxScrollTop: function(value) { return scrollTop <  types[typeof value](value); },
    minScrollBottom: function(value) { return (scrollHeight - height - scrollTop) >= types[typeof value](value); },
    maxScrollBottom: function(value) { return (scrollHeight - height - scrollTop) <  types[typeof value](value); }
};

let width, height, scrollTop, scrollHeight, fontSize;

function getStyle(node, name) {
    return window.getComputedStyle ?
        window
        .getComputedStyle(node, null)
        .getPropertyValue(name) :
        0 ;
}

function getFontSize() {
    return fontSize ||
        (fontSize = parseFloat(getStyle(document.documentElement, "font-size"), 10));
}

function test(query) {
    var keys = Object.keys(query);
    var n = keys.length;
    var key;

    if (keys.length === 0) { return false; }

    while (n--) {
        key = keys[n];
        if (!tests[key](query[key])) { return false; }
    }

    return true;
}

function update$2() {
    var l = rules.length;
    var rule;

    // Run exiting rules
    while (l--) {
        rule = rules[l];

        if (rule.state && !test(rule.query)) {
            rule.state = false;
            rule.exit && rule.exit();
        }
    }

    l = rules.length;

    // Run entering rules
    while (l--) {
        rule = rules[l];

        if (!rule.state && test(rule.query)) {
            rule.state = true;
            rule.enter && rule.enter();
        }
    }
}

function scroll(e) {
    scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    update$2();
}

function resize(e) {
    width = window.innerWidth;
    height = window.innerHeight;
    scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
    update$2();
}

window.addEventListener('scroll', scroll);
window.addEventListener('resize', resize);

ready$1(update$2);
document.addEventListener('DOMContentLoaded', update$2);

width = window.innerWidth;
height = window.innerHeight;
scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;

var pre  = document.createElement('pre');
var text = document.createTextNode('');

pre.appendChild(text);

function escape(value) {
	text.textContent = value;
	return pre.innerHTML;
}

var mimetypes = {
	xml:  'application/xml',
	html: 'text/html',
	svg:  'image/svg+xml'
};

function parse$2(type, string) {
	if (!string) { return; }

	var mimetype = mimetypes[type];
	var xml;

	// From jQuery source...
	try {
		xml = (new window.DOMParser()).parseFromString(string, mimetype);
	} catch (e) {
		xml = undefined;
	}

	if (!xml || xml.getElementsByTagName("parsererror").length) {
		throw new Error("dom: Invalid XML: " + string);
	}

	return xml;
}

// Types

function isFragmentNode(node) {
	return node.nodeType === 11;
}

function tag(node) {
	return node.tagName && node.tagName.toLowerCase();
}

function contains$2(child, node) {
	return node.contains ?
		node.contains(child) :
	child.parentNode ?
		child.parentNode === node || contains$2(child.parentNode, node) :
	false ;
}

function attribute(name, node) {
	return node.getAttribute && node.getAttribute(name) || undefined ;
}

function find$2(selector, node) {
	return node.querySelector(selector);
}

function matches$2(selector, node) {
	return node.matches ? node.matches(selector) :
		node.matchesSelector ? node.matchesSelector(selector) :
		node.webkitMatchesSelector ? node.webkitMatchesSelector(selector) :
		node.mozMatchesSelector ? node.mozMatchesSelector(selector) :
		node.msMatchesSelector ? node.msMatchesSelector(selector) :
		node.oMatchesSelector ? node.oMatchesSelector(selector) :
		// Dumb fall back to simple tag name matching. Nigh-on useless.
		tag(node) === selector ;
}

function closest(selector, node) {
	var root = arguments[2];

	if (!node || node === document || node === root || node.nodeType === 11) { return; }

	// SVG <use> elements store their DOM reference in
	// .correspondingUseElement.
	node = node.correspondingUseElement || node ;

	return matches$2(selector, node) ?
		 node :
		 closest(selector, node.parentNode, root) ;
}

function query(selector, node) {
	return toArray$1(node.querySelectorAll(selector));
}

if (!Element.prototype.append) {
    console.warn('A polyfill for Element.append() is needed (https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/append)');
}

function append$3(target, node) {
    target.append(node);
    return node;
}

const setAttribute = overload(id, {
	html: function(name, node, content) {
		node.innerHTML = content;
	},

	children: function(name, node, content) {
		content.forEach((child) => { node.appendChild(child); });
	},

	default: function(name, node, content) {
		if (name in node) {
			node[name] = content;
		}
		else {
			node.setAttribute(name, content);
		}
	}
});

function assignAttributes(node, attributes) {
	var names = Object.keys(attributes);
	var n = names.length;

	while (n--) {
		setAttribute(names[n], node, attributes[names[n]]);
	}
}

if (!Element.prototype.prepend) {
    console.warn('A polyfill for Element.prepend() is needed (https://developer.mozilla.org/en-US/docs/Web/API/ParentNode/prepend)');
}

function prepend$2(target, node) {
    target.prepend(node);
    return node;
}

const prefixes = ['Khtml','O','Moz','Webkit','ms'];

var node = document.createElement('div');
var cache$1 = {};

function testPrefix(prop) {
    if (prop in node.style) { return prop; }

    var upper = prop.charAt(0).toUpperCase() + prop.slice(1);
    var l = prefixes.length;
    var prefixProp;

    while (l--) {
        prefixProp = prefixes[l] + upper;

        if (prefixProp in node.style) {
            return prefixProp;
        }
    }

    return false;
}

function prefix$1(prop){
    return cache$1[prop] || (cache$1[prop] = testPrefix(prop));
}

const define$1 = Object.defineProperties;

var features$1 = define$1({
	events: define$1({}, {
		fullscreenchange: {
			get: cache(function() {
				// TODO: untested event names
				return ('fullscreenElement' in document) ? 'fullscreenchange' :
				('webkitFullscreenElement' in document) ? 'webkitfullscreenchange' :
				('mozFullScreenElement' in document) ? 'mozfullscreenchange' :
				('msFullscreenElement' in document) ? 'MSFullscreenChange' :
				'fullscreenchange' ;
			}),

			enumerable: true
		},

		transitionend: {
			// Infer transitionend event from CSS transition prefix

			get: cache(function() {
				var end = {
					KhtmlTransition: false,
					OTransition: 'oTransitionEnd',
					MozTransition: 'transitionend',
					WebkitTransition: 'webkitTransitionEnd',
					msTransition: 'MSTransitionEnd',
					transition: 'transitionend'
				};

				var prefixed = prefix$1('transition');
				return prefixed && end[prefixed];
			}),

			enumerable: true
		}
	})
}, {
	inputEventsWhileDisabled: {
		// FireFox won't dispatch any events on disabled inputs:
		// https://bugzilla.mozilla.org/show_bug.cgi?id=329509

		get: cache(function() {
			var input     = document.createElement('input');
			var testEvent = Event('featuretest');
			var result    = false;

			document.body.appendChild(input);
			input.disabled = true;
			input.addEventListener('featuretest', function(e) { result = true; });
			input.dispatchEvent(testEvent);
			input.remove();

			return result;
		}),

		enumerable: true
	},

	template: {
		get: cache(function() {
			// Older browsers don't know about the content property of templates.
			return 'content' in document.createElement('template');
		}),

		enumerable: true
	},

	textareaPlaceholderSet: {
		// IE sets textarea innerHTML (but not value) to the placeholder
		// when setting the attribute and cloning and so on. The twats have
		// marked it "Won't fix":
		//
		// https://connect.microsoft.com/IE/feedback/details/781612/placeholder-text-becomes-actual-value-after-deep-clone-on-textarea

		get: cache(function() {
			var node = document.createElement('textarea');
			node.setAttribute('placeholder', '---');
			return node.innerHTML === '';
		}),

		enumerable: true
	},

	transition: {
		get: cache(function testTransition() {
			var prefixed = prefix$1('transition');
			return prefixed || false;
		}),

		enumerable: true
	},

	fullscreen: {
		get: cache(function testFullscreen() {
			var node = document.createElement('div');
			return !!(node.requestFullscreen ||
				node.webkitRequestFullscreen ||
				node.mozRequestFullScreen ||
				node.msRequestFullscreen);
		}),

		enumerable: true
	},

	// Deprecated

	transitionend: {
		get: function() {
			console.warn('dom.features.transitionend deprecated in favour of dom.features.events.transitionend.');
			return features.events.transitionend;
		},

		enumerable: true
	}
});

features$1.textareaPlaceholderSet ?

	function clone(node) {
		return node.cloneNode(true);
	} :

	function cloneWithHTML(node) {
		// IE sets textarea innerHTML to the placeholder when cloning.
		// Reset the resulting value.

		var clone     = node.cloneNode(true);
		var textareas = query('textarea', node);
		var n         = textareas.length;
		var clones;

		if (n) {
			clones = query('textarea', clone);

			while (n--) {
				clones[n].value = textareas[n].value;
			}
		}

		return clone;
	} ;

const svgNamespace = 'http://www.w3.org/2000/svg';
const testDiv      = document.createElement('div');

const constructors = {
	text: function(text) {
		return document.createTextNode(text || '');
	},

	comment: function(text) {
		return document.createComment(text || '');
	},

	fragment: function(html) {
		var fragment = document.createDocumentFragment();

		if (html) {
			testDiv.innerHTML = html;
			append(fragment, testDiv.childNodes);
			testDiv.innerHTML = '';
		}

		return fragment;
	}
};

var svgs = [
	'circle',
	'ellipse',
	'g',
	'line',
	'rect',
	//'text',
	'use',
	'path',
	'polygon',
	'polyline',
	'svg'
];

svgs.forEach(function(tag) {
	constructors[tag] = function(attributes) {
		var node = document.createElementNS(svgNamespace, tag);
		if (attributes) { setSVGAttributes(node, attributes); }
		return node;
	};
});

function setSVGAttributes(node, attributes) {
	var names = Object.keys(attributes);
	var n = names.length;

	while (n--) {
		node.setAttributeNS(null, names[n], attributes[names[n]]);
	}
}

function create$1(tag, attributes) {
	// create(type)
	// create(type, text)
	// create(type, attributes)

	let node;

	if (typeof tag === 'string') {
		if (constructors[tag]) {
			return constructors[tag](attributes);
		}

		node = document.createElement(tag);
	}
	else {
		node = document.createElement(tag.tagName);
		delete tag.tagName;
		assignAttributes(node, tag);
	}

	if (attributes) {
		if (typeof attributes === 'string') {
			node.innerHTML = attributes;
		}
		else {
			assignAttributes(node, attributes);
		}
	}

	return node;
}

// Returns a node's id, generating one if the node does not alreay have one

// DOM Mutation

function remove$2(node) {
	if (node.remove) {
		node.remove();
	}
	else {
		console.warn('deprecated: remove() no longer removes lists of nodes.');
		node.parentNode && node.parentNode.removeChild(node);
	}

	return node;
}

function before(target, node) {
	target.parentNode && target.parentNode.insertBefore(node, target);
	return node;
}

function after(target, node) {
	target.parentNode && target.parentNode.insertBefore(node, target.nextSibling);
	return node;
}

function replace(target, node) {
	before(target, node);
	remove$2(target);
	return node;
}

const classes = get$1('classList');

function addClass(string, node) {
	classes(node).add(string);
}

function removeClass(string, node) {
	classes(node).remove(string);
}

function requestFrame(n, fn) {
	// Requst frames until n is 0, then call fn
	(function frame(t) {
		return n-- ?
			requestAnimationFrame(frame) :
			fn(t);
	})();
}

function frameClass(string, node) {
	var list = classes(node);
	list.add(string);

	// Chrome (at least) requires 2 frames - I guess in the first, the
	// change is painted so we have to wait for the second to undo
	requestFrame(2, () => list.remove(string));
}

function windowBox() {
	return {
		left:   0,
		top:    0,
		right:  window.innerWidth,
		bottom: window.innerHeight,
		width:  window.innerWidth,
		height: window.innerHeight
	};
}

function box(node) {
	return node === window ?
		windowBox() :
		node.getClientRects()[0] ;
}

function offset(node1, node2) {
	var box1 = box(node1);
	var box2 = box(node2);
	return [box2.left - box1.left, box2.top - box1.top];
}

var rpx          = /px$/;
var styleParsers = {
	"transform:translateX": function(node) {
		var matrix = computedStyle('transform', node);
		if (!matrix || matrix === "none") { return 0; }
		var values = valuesFromCssFn(matrix);
		return parseFloat(values[4]);
	},

	"transform:translateY": function(node) {
		var matrix = computedStyle('transform', node);
		if (!matrix || matrix === "none") { return 0; }
		var values = valuesFromCssFn(matrix);
		return parseFloat(values[5]);
	},

	"transform:scale": function(node) {
		var matrix = computedStyle('transform', node);
		if (!matrix || matrix === "none") { return 0; }
		var values = valuesFromCssFn(matrix);
		var a = parseFloat(values[0]);
		var b = parseFloat(values[1]);
		return Math.sqrt(a * a + b * b);
	},

	"transform:rotate": function(node) {
		var matrix = computedStyle('transform', node);
		if (!matrix || matrix === "none") { return 0; }
		var values = valuesFromCssFn(matrix);
		var a = parseFloat(values[0]);
		var b = parseFloat(values[1]);
		return Math.atan2(b, a);
	}
};

function valuesFromCssFn(string) {
	return string.split('(')[1].split(')')[0].split(/\s*,\s*/);
}

function computedStyle(name, node) {
	return window.getComputedStyle ?
		window
		.getComputedStyle(node, null)
		.getPropertyValue(name) :
		0 ;
}

function style(name, node) {
    // If name corresponds to a custom property name in styleParsers...
    if (styleParsers[name]) { return styleParsers[name](node); }

    var value = computedStyle(name, node);

    // Pixel values are converted to number type
    return typeof value === 'string' && rpx.test(value) ?
        parseFloat(value) :
        value ;
}

// Units

const runit = /(\d*\.?\d+)(r?em|vw|vh)/;
//var rpercent = /(\d*\.?\d+)%/;

const units = {
	em: function(n) {
		return getFontSize$1() * n;
	},

	rem: function(n) {
		return getFontSize$1() * n;
	},

	vw: function(n) {
		return window.innerWidth * n / 100;
	},

	vh: function(n) {
		return window.innerHeight * n / 100;
	}
};

let fontSize$1;

function getFontSize$1() {
	return fontSize$1 ||
		(fontSize$1 = parseFloat(style("font-size", document.documentElement), 10));
}


const toPx = overload(toType, {
	'number': id,

	'string': function(string) {
		var data = runit.exec(string);

		if (data) {
			return units[data[2]](parseFloat(data[1]));
		}

		throw new Error('dom: "' + string + '" cannot be parsed as rem, em, vw or vh units.');
	}
});

function toRem(n) {
	return (toPx(n) / getFontSize$1()) + 'rem';
}

if (!NodeList.prototype.forEach) {
    console.warn('A polyfill for NodeList.forEach() is needed (https://developer.mozilla.org/en-US/docs/Web/API/NodeList/forEach)');
}

// DOM Fragments and Templates

function fragmentFromChildren(node) {
	var fragment = create$1('fragment');

	while (node.firstChild) {
		append$3(fragment, node.firstChild);
	}

	return fragment;
}

// Event(type)
// Event(settings, properties)

const assign$4      = Object.assign;
const CustomEvent = window.CustomEvent;
const defaults    = {
	// The event bubbles (false by default)
	// https://developer.mozilla.org/en-US/docs/Web/API/Event/Event
	bubbles: true,

	// The event may be cancelled (false by default)
	// https://developer.mozilla.org/en-US/docs/Web/API/Event/Event
	cancelable: true

	// Trigger listeners outside of a shadow root (false by default)
	// https://developer.mozilla.org/en-US/docs/Web/API/Event/composed
	//composed: false
};

function Event$1(type, options) {
	let settings;

	if (typeof type === 'object') {
		settings = assign$4({}, defaults, type);
		type = settings.type;
	}

	if (options && options.detail) {
		if (settings) {
			settings.detail = options.detail;
		}
		else {
			settings = assign$4({ detail: options.detail }, defaults);
		}
	}

	var event = new CustomEvent(type, settings || defaults);

	if (options) {
		delete options.detail;
		assign$4(event, options);
	}

	return event;
}

const assign$5  = Object.assign;
const rspaces = /\s+/;

function prefixType(type) {
	return features$1.events[type] || type ;
}

function Source(notify, stop, type, options, node) {
	const types  = type.split(rspaces).map(prefixType);
	const buffer = [];

	function update(value) {
		buffer.push(value);
		notify('push');
	}

	this.stop   = stop;
	this.types  = types;
	this.node   = node;
	this.buffer = buffer;
	this.update = update;

	types.forEach(function(type) {
		node.addEventListener(type, update, options);
	});
}

assign$5(Source.prototype, {
	shift: function shiftEvent() {
		const buffer = this.buffer;

		return buffer.shift();
	},

	stop: function stopEvent() {
		const stop   = this.stop;
		const types  = this.types;
		const node   = this.node;
		const buffer = this.buffer;
		const update = this.update;

		types.forEach(function(type) {
			node.removeEventListener(type, update);
		});

		stop(buffer.length);
	}
});

function events(type, node) {
	let options;

	if (typeof type === 'object') {
		options = type;
		type    = options.type;
	}

	return new Stream$1(function setup(notify, stop) {
		return new Source(notify, stop, type, options, node);
	});
}

function preventDefault(e) {
	e.preventDefault();
}

function isTargetEvent(e) {
	return e.target === e.currentTarget;
}



// -----------------

const A$6 = Array.prototype;
const eventsSymbol = Symbol('events');

function bindTail(fn) {
	// Takes arguments 1 and up and appends them to arguments
	// passed to fn.
	var args = A$6.slice.call(arguments, 1);
	return function() {
		A$6.push.apply(arguments, args);
		fn.apply(null, arguments);
	};
}

function on(node, type, fn, data) {
	var options;

	if (typeof type === 'object') {
		options = type;
		type    = options.type;
	}

	var types   = type.split(rspaces);
	var events  = node[eventsSymbol] || (node[eventsSymbol] = {});
	var handler = data ? bindTail(fn, data) : fn ;
	var handlers;

	var n = -1;
	while (++n < types.length) {
		type = types[n];
		handlers = events[type] || (events[type] = []);
		handlers.push([fn, handler]);
		node.addEventListener(type, handler, options);
	}

	return node;
}

function once$1(node, types, fn, data) {
	on(node, types, function once() {
		off(node, types, once);
		fn.apply(null, arguments);
	}, data);
}

function off(node, type, fn) {
	var options;

	if (typeof type === 'object') {
		options = type;
		type    = options.type;
	}

	var types   = type.split(rspaces);
	var events  = node[eventsSymbol];
	var handlers, i;

	if (!events) { return node; }

	var n = -1;
	while (n++ < types.length) {
		type = types[n];
		handlers = events[type];
		if (!handlers) { continue; }
		i = handlers.length;
		while (i--) {
			if (handlers[i][0] === fn) {
				node.removeEventListener(type, handlers[i][1]);
				handlers.splice(i, 1);
			}
		}
	}

	return node;
}

function trigger(node, type, properties) {
	// Don't cache events. It prevents you from triggering an event of a
	// given type from inside the handler of another event of that type.
	var event = Event$1(type, properties);
	node.dispatchEvent(event);
}

// trigger('type', node)

function trigger$1(type, node) {
    let properties;

    if (typeof type === 'object') {
        properties = type;
        type = properties.type;
    }

    // Don't cache events. It prevents you from triggering an event of a
	// given type from inside the handler of another event of that type.
	var event = Event$1(type, properties);
	node.dispatchEvent(event);
    return node;
}

function delegate(selector, fn) {
	// Create an event handler that looks up the ancestor tree
	// to find selector.
	return function handler(e) {
		var node = closest(selector, e.target, e.currentTarget);
		if (!node) { return; }
		e.delegateTarget = node;
		fn(e, node);
		e.delegateTarget = undefined;
	};
}

const keyStrings = {
	8:  'backspace',
	9:  'tab',
	13: 'enter',
	16: 'shift',
	17: 'ctrl',
	18: 'alt',
	27: 'escape',
	32: 'space',
	33: 'pageup',
	34: 'pagedown',
	35: 'pageright',
	36: 'pageleft',
	37: 'left',
	38: 'up',
	39: 'right',
	40: 'down',
	46: 'delete',
	48: '0',
	49: '1',
	50: '2',
	51: '3',
	52: '4',
	53: '5',
	54: '6',
	55: '7',
	56: '8',
	57: '9',
	65: 'a',
	66: 'b',
	67: 'c',
	68: 'd',
	69: 'e',
	70: 'f',
	71: 'g',
	72: 'h',
	73: 'i',
	74: 'j',
	75: 'k',
	76: 'l',
	77: 'm',
	78: 'n',
	79: 'o',
	80: 'p',
	81: 'q',
	82: 'r',
	83: 's',
	84: 't',
	85: 'u',
	86: 'v',
	87: 'w',
	88: 'x',
	89: 'y',
	90: 'z',
	// Mac Chrome left CMD
	91: 'cmd',
	// Mac Chrome right CMD
	93: 'cmd',
	186: ';',
	187: '=',
	188: ',',
	189: '-',
	190: '.',
	191: '/',
	219: '[',
	220: '\\',
	221: ']',
	222: '\'',
	// Mac FF
	224: 'cmd'
};

const keyCodes = Object.entries(keyStrings).reduce(function(object, entry) {
	object[entry[1]] = parseInt(entry[0], 10);
	return object;
}, {});

// transition(duration, fn)
//
// duration  - duration seconds
// fn        - callback that is called on animation frames with a float
//             representing progress in the range 0-1
//
// Returns a function that cancels the transition.

const performance           = window.performance;
const requestAnimationFrame$1 = window.requestAnimationFrame;
const cancelAnimationFrame$1  = window.cancelAnimationFrame;

function transition(duration, fn) {
	var t0 = performance.now();

	function frame(t1) {
		// Progress from 0-1
		var progress = (t1 - t0) / (duration * 1000);

		if (progress < 1) {
			if (progress > 0) {
				fn(progress);
			}
			id = requestAnimationFrame$1(frame);
		}
		else {
			fn(1);
		}
	}

	var id = requestAnimationFrame$1(frame);

	return function cancel() {
		cancelAnimationFrame$1(id);
	};
}

function animate(duration, transform, name, object, value) {
	// denormaliseLinear is not curried! Wrap it.
	return transition(
		duration,
		pipe(transform, (v) => linear$1(object[name], value, v), set$1(name, object))
	);
}

const define$2 = Object.defineProperties;

define$2({
    left: 0
}, {
    right:  { get: function() { return window.innerWidth; }, enumerable: true, configurable: true },
    top:    { get: function() { return style('padding-top', document.body); }, enumerable: true, configurable: true },
    bottom: { get: function() { return window.innerHeight; }, enumerable: true, configurable: true }
});

var view = document.scrollingElement;

// disableScroll(node)

if (window.console && window.console.log) {
    window.console.log('%cdom%c         – https://github.com/stephband/dom', 'color: #3a8ab0; font-weight: 600;', 'color: inherit; font-weight: 400;');
}
const parse$3 = curry$1(parse$2, true);
const contains$3 = curry$1(contains$2, true);
const attribute$1 = curry$1(attribute, true);
const find$3 = curry$1(find$2, true);
const closest$1 = curry$1(closest, true);
const matches$3 = curry$1(matches$2, true);
const query$1 = curry$1(query, true);
const assign$6  = curry$1(assignAttributes, true);
const append$4  = curry$1(append$3, true);
const prepend$3 = curry$1(prepend$2, true);
const before$1  = curry$1(before, true);
const after$1   = curry$1(after, true);
const replace$1 = curry$1(replace, true);
const addClass$1    = curry$1(addClass, true);
const removeClass$1 = curry$1(removeClass, true);
const frameClass$1  = curry$1(frameClass, true);
const offset$1 = curry$1(offset, true);
const style$1 = curry$1(style, true);
const events$1 = curry$1(events, true);

// Legacy uncurried functions

Object.assign(events$1, {
    on:      on,
    once:    once$1,
    off:     off,
    trigger: trigger
});

const on$1 = curry$1(function(type, fn, node) {
    on(node, type, fn);
    return node;
}, true);

const off$1 = curry$1(function(type, fn, node) {
    off(node, type, fn);
    return node;
}, true);
const trigger$2 = curry$1(trigger$1, true);
const delegate$1 = curry$1(delegate, true);
const animate$1 = curry$1(animate, true);
const transition$1 = curry$1(transition, true);

// Debug mode on by default
const DEBUG$2 = window.DEBUG === undefined || window.DEBUG;

// Render queue
const maxFrameDuration = 0.015;

const queue = new Set();

const addons = [];

var renderCount = 0;

var frame;


/* Console logging */

function tokenOrLabel(token) {
	return typeof token === 'string' ? token : token.label;
}

function tabulateRenderer(renderer) {
	return {
		'Label':  renderer.label,
		'Source': renderer.tokens ?
			renderer.tokens
			.filter((token) => token.label !== 'Listener')
			.map(tokenOrLabel)
			.join('') :
			renderer.path,
		'Rendered': renderer.renderedValue,
		'Total renders (accumulative)': renderer.renderCount
	};
}

function filterListener(renderer) {
	return renderer.constructor.name !== 'Listener';
}

function logRenders(tStart, tStop) {
	if (DEBUG$2) {
		console.table(
			Array.from(queue)
			.concat(addons)
			.filter(filterListener)
			.map(tabulateRenderer)
		);

		console.log('%c' + queue.size + ' cued renderer' + (queue.size === 1 ? '' : 's') + '. '
		+ addons.length + ' in-frame renderer' + (addons.length === 1 ? '' : 's') + '. '
		+ renderCount + ' DOM mutation' + (renderCount === 1 ? '' : 's') + '. %c'
		+ (tStop - tStart).toFixed(3) + 's', 'color: #6894ab; font-weight: 300;', '');

		console.groupEnd();
	}

	if ((tStop - tStart) > maxFrameDuration) {
		console.log('%c  ' + queue.size + ' cued renderer' + (queue.size === 1 ? '' : 's') + '. '
		+ addons.length + ' in-frame renderer' + (addons.length === 1 ? '' : 's') + '. '
		+ renderCount + ' DOM mutation' + (renderCount === 1 ? '' : 's') + '. %c'
		+ (tStop - tStart).toFixed(3) + 's', 'color: #d34515; font-weight: 300;', '');
	}
}


/* The meat and potatoes */

function fireEach(queue) {
	var count, renderer;

	for (renderer of queue) {
		if (DEBUG$2) {
			count = renderer.renderCount;

			if (typeof count !== 'number') {
				console.log('OIOIO', renderer);
			}
		}

		renderer.fire();

		if (DEBUG$2) {
			renderCount += (renderer.renderCount - count);
		}
	}
}

function run(time) {
	if (DEBUG$2) {
		console.groupCollapsed('%cSparky %cframe ' + (time / 1000).toFixed(3), 'color: #a3b31f; font-weight: 600;', 'color: #6894ab; font-weight: 400;');
	}

	renderCount = 0;
	addons.length = 0;

	const tStart = now$1();
	frame = true;
	fireEach(queue);
	frame = undefined;
	const tStop  = now$1();

	logRenders(tStart, tStop);
	queue.clear();
}

function cue(renderer) {
	var count;

	// Run functions cued during frame synchronously to preserve
	// inner-DOM-first order of execution during setup
	if (frame === true) {
		if (DEBUG$2) {
			if (typeof renderer.renderCount !== 'number') {
				console.warn('Sparky renderer has no property renderCount', renderer);
			}

			count = renderer.renderCount;
		}

		renderer.fire();

		if (DEBUG$2) {
			addons.push(renderer);
			renderCount += (renderer.renderCount - count);
		}

		return;
	}

	// Don't recue cued renderers.
	if (queue.has(renderer)) { return; }

	queue.add(renderer);

	if (frame === undefined) {
		frame = requestAnimationFrame(run);
	}
}

function uncue(renderer) {
	queue.delete(renderer);

	if (frame !== undefined && frame !== true && queue.size === 0) {
		//if (DEBUG) { console.log('(cancel master frame)'); }
		cancelAnimationFrame(frame);
		frame = undefined;
	}
}

const fetchDocument = cache(function fetchDocument(path) {
    return fetch(path)
        .then((response) => response.text())
        .then(parse$3('html'));
});

let scriptCount = 0;

function importDependencies(path, doc) {
    const dir = path.replace(/[^\/]+$/, '');

    // Import templates and styles

    // Is there a way to do this without importing them into the current document?
    // Is that even wise?
    // Is that just unecessary complexity?
    doc.querySelectorAll('style, template').forEach(function(node) {
        if (!node.title) { node.title = dir; }
        document.head.appendChild(document.adoptNode(node));
    });

    // Import CSS links
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(function(node) {
        if (!node.title) { node.title = dir; }
        const href = node.getAttribute('href');

        // Detect local href. Todo: very crude. Improve.
        if (/^[^\/]/.test(href)) {
            // Get rid of leading './'
            const localHref = href.replace(/^\.\//, '');
            node.setAttribute('href', dir + localHref);
        }

        document.head.appendChild(document.adoptNode(node));
    });

    // Wait for scripts to execute
    const promise = Promise.all(
        query$1('script', doc).map(toScriptPromise)
    )
    .then(() => doc);

    return DEBUG ? promise.then((object) => {
        console.log('%cSparky %cinclude', 'color: #a3b31f; font-weight: 600;', 'color: #6894ab; font-weight: 400;', path);
        return object;
    }) :
    promise ;
}

function toScriptPromise(node) {
    return new Promise(function(resolve, reject) {
        window['sparkyScriptImport' + (++scriptCount)] = resolve;

        // This method doesnt seem to run the script
        // document.head.appendChild(document.adoptNode(node));
        // Try this instead...
        const script = document.createElement('script');
        script.type = 'module';
        script.title = node.title || node.baseURL;

        // Detect script has parsed and executed
        script.textContent = node.textContent + ';window.sparkyScriptImport' + scriptCount + '();';
        document.head.appendChild(script);
    });
}

function importTemplate(src) {
    const parts = src.split('#');
    const path  = parts[0] || '';
    const id    = parts[1] || '';

    return path ?
        id ?
            fetchDocument(path)
            .then((doc) => importDependencies(path, doc))
            .then((doc) => document.getElementById(id))
            .then((template) => {
                if (!template) { throw new Error('Sparky template "' + src + '" not found'); }
                return template;
            }) :

        fetchDocument(path)
        .then((doc) => document.adoptNode(doc.body)) :

    id ?
        // If path is blank we are looking in the current document, so there
        // must be a template id (we can't import the document into itself!)
        Promise
        .resolve(document.getElementById(id))
        .then((template) => {
            if (!template) { throw new Error('Sparky template "' + src + '" not found'); }
            return template;
        }) :

    // If no path and no id
    Promise.reject(new Error('Sparky template "' + src + '" not found. URL must have a path or a hash ref')) ;
}

// Matches the arguments list in the result of fn.toString()
const rarguments = /function(?:\s+\w+)?\s*(\([\w,\s]*\))/;

var toText = overload(toType, {
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

	'symbol': function(value) {
		return value.toString();
	},

	'undefined': function() {
		return '';
	},

	'object': function(value) {
		// Don't render null
		return value ? JSON.stringify(value) : '';
	},

	'default': JSON.stringify
});

const assign$7          = Object.assign;
const parseArrayClose = capture$1(/^\]\s*/, nothing);

//                                        number                                     "string"            'string'                    null   true   false  array function(args)   string      comma
const parseParams = capture$1(/^\s*(?:(-?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?)|"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(null)|(true)|(false)|(\[)|(\w+)\(([^)]+)\)|([\w.\-#/?:\\]+))\s*(,)?\s*/, {
    // number
    1: function(params, tokens) {
        params.push(parseFloat(tokens[1]));
        return params;
    },

    // "string"
    2: function(params, tokens) {
        params.push(tokens[2]);
        return params;
    },

    // 'string'
    3: function(params, tokens) {
        params.push(tokens[3]);
        return params;
    },

    // null
    4: function(params) {
        params.push(null);
        return params;
    },

    // true
    5: function(params) {
        params.push(true);
        return params;
    },

    // false
    6: function(params) {
        params.push(false);
        return params;
    },

    // array
    7: function(params, tokens) {
        if (tokens.input[1] === ']') {
            params.push([]);
        }
        else {
            params.push(parseParams([], tokens));
        }

        parseArrayClose(null, tokens);
        return params;
    },

    // Todo: review syntax for nested functions
    // function(args)
    //8: function(params, value, result) {
    //    // Todo: recurse to parseFn for parsing inner functions
    //    value = Sparky.transforms[value].apply(null, JSON.parse('[' + result[9].replace(rsinglequotes, '"') + ']'));
    //    params.push(value);
    //    return params;
    //},

    // string
    10: function(params, tokens) {
        params.push(tokens[10]);
        return params;
    },

    // Comma terminator - more params to come
    11: function(params, tokens) {
        return parseParams(params, tokens);
    },

    catch: function(params, string) {
        // string is either the input string or a tokens object
        // from a higher level of parsing
        throw new SyntaxError('Invalid parameter "' + (string.input || string) + '"');
    }
});


/* Parse function */

const parsePipe = capture$1(/^\s*([\w-]+)\s*(:)?\s*/, {
    // Function name '...'
    1: function(fns, tokens) {
        fns.push({
            name: tokens[1],
            args: nothing
        });

        return fns;
    },

    // Params ':'
    2: function(fns, tokens) {
        fns[fns.length - 1].args = parseParams([], tokens);
        return fns;
    },

    close: capture$1(/^\s*(\|)?\s*/, {
        // More pipe '|'
        1: function(fns, tokens) {
            return parsePipe(fns, tokens);
        }
    }),

    catch: function(fns, string) {
        // string is either the input string or a tokens object
        // from a higher level of parsing
        throw new SyntaxError('Invalid pipe "' + (string.input || string) + '"');
    }
});

function Tag() {}

assign$7(Tag.prototype, {
    transform: id,

    // Tags are stored in arrays with any surrounding strings, and joined
    // on render. Array.join() causes .toString() to be called.
    toString: function toString() {
        return toText(this.valueOf());
    },

    valueOf: function valueOf() {
        // Don't pipe undefined
        return this.value === undefined ?
            undefined :
            this.transform(this.value) ;
    }
});

const parseTag = capture$1(/^\s*([\w.-]*)\s*(\|)?\s*/, {
    // Object path 'xxxx.xxx.xx-xxx'
    1: (nothing, tokens) => {
        const tag = new Tag();
        tag.path = tokens[1];
        return tag;
    },

    // Pipe '|'
    2: function(tag, tokens) {
        tag.pipe = parsePipe([], tokens);
        if (!tag.pipe) { return tag; }
        return tag;
    },

    // Tag close ']}'
    close: function(tag, tokens) {
        if (!exec$2(/^\s*\]\}/, id, tokens)) {
            throw new SyntaxError('Unclosed tag in "' + tokens.input + '"');
        }

        return tag;
    },

    // Where nothing is found, don't complain
    catch: id
});

const parseToken = capture$1(/^\s*(\{\[)/, {
    // Tag opener '{['
    1: function(nothing, tokens) {
        const tag = parseTag(null, tokens);
        tag.label = tokens.input.slice(tokens.index, tokens.index + tokens[0].length + tokens.consumed);
        return tag;
    },

    close: function(tag, tokens) {
        // Only spaces allowed til end
        if (!exec$2(/^\s*$/, id, tokens)) {
            throw new SyntaxError('Invalid characters after token (only spaces valid) "' + tokens.input + '"');
        }

        return tag;
    },

    // Where nothing is found, don't complain
    catch: id
});

const parseBoolean = capture$1(/^\s*(?:(\{\[)|$)/, {
    // Tag opener '{['
    1: function(array, tokens) {
        const tag = parseTag(null, tokens);
        tag.label = tokens.input.slice(tokens.index, tokens.index + tokens[0].length + tokens.consumed);
        array.push(tag);
        return parseBoolean(array, tokens);
    },

    // Where nothing is found, don't complain
    catch: id
});

const parseText = capture$1(/^([\S\s]*?)(?:(\{\[)|$)/, {
    // String of text, whitespace and newlines included
    1: (array, tokens) => {
        // If no tags have been found return undefined
        if (!array.length && !tokens[2]) {
            return;
        }

        // If it is not empty, push in leading text
        if (tokens[1]) {
            array.push(tokens[1]);
        }

        return array;
    },

    // Tag opener '{['
    2: (array, tokens) => {
        const tag = parseTag(null, tokens);
        tag.label = tokens.input.slice(tokens.index + tokens[1].length, tokens.index + tokens[0].length + tokens.consumed);
        array.push(tag);
        return parseText(array, tokens);
    },

    // Where nothing is found, don't complain
    catch: noop
});

var config = {
	attributeFn:      'fn',
	attributeInclude: 'include',
	attributePrefix:  ':'
};

function debug(node, scopes) {
    debugger;

    return scopes.tap((scope) => {
        console.group('Sparky fn="debug"');
        console.log('node ', node);
        console.log('scope', scope);
        debugger;
        console.groupEnd();
    });
}

const DEBUG$3 = window.DEBUG;

function MarkerNode(node, options) {
    // A text node, or comment node in DEBUG mode, for marking a
    // position in the DOM tree so it can be swapped out with some
    // content in the future.

    if (!DEBUG$3) {
        return create$1('text', '');
    }

    var attrFn      = node && node.getAttribute(options ? options.attributeFn : 'fn');
    var attrInclude = node && node.getAttribute(options ? options.attributeInclude : 'include');

    return create$1('comment',
        tag(node) +
        (attrFn ? ' ' + (options ? options.attributeFn : 'fn') + '="' + attrFn + '"' : '') +
        (attrInclude ? ' ' + (options ? options.attributeInclude : 'include') + '="' + attrInclude + '"' : '')
    );
}

/*

*/

const A$7       = Array.prototype;

const isArray = Array.isArray;
const assign$8  = Object.assign;

const $scope = Symbol('scope');


/* Renderers */

function EachChild(scope, args) {
	this.label    = 'EachChild';
	this.scope    = scope;
	this.node     = args[1];
	this.marker   = args[2];
	this.sparkies = args[3];
	this.isOption = args[4];
	this.options  = args[5];
	this.renderCount = 0;
}

assign$8(EachChild.prototype, {
	fire: function render(time) {
		this.render(this.scope);
		this.value = this.scope;
	},

	render: function render(array) {
		const node     = this.node;
		const marker   = this.marker;
		const sparkies = this.sparkies;
		const isOption = this.isOption;
		const options  = this.options;

		// Selects will lose their value if the selected option is removed
		// from the DOM, even if there is another <option> of same value
		// already in place. (Interestingly, value is not lost if the
		// selected <option> is simply moved). Make an effort to have
		// selects retain their value across scope changes.
		//
		// There is also code for something siimilar in render-token.js
		// maybe have a look and decide on what's right
//var value = isOption ? marker.parentNode.value : undefined ;

		if (!isArray(array)) {
			array = Object.entries(array).map(entryToKeyValue);
		}

		this.renderCount += reorderCache(node, array, sparkies, options);
		this.renderCount += reorderNodes(marker, array, sparkies);

		// A fudgy workaround because observe() callbacks (like this update
		// function) are not batched to ticks.
		// TODO: batch observe callbacks to ticks.
//		if (isOption && value !== undefined) {
//			marker.parentNode.value = value;
//		}
	},

	renderCount: 0
});

function EachParent(input, node, marker, sparkies, isOption, options) {
	this.label = 'EachParent';
	this.input = input;
	this.args  = arguments;
}

assign$8(EachParent.prototype, {
	fire: function render(time) {
		var scope = this.input.shift();
		if (!scope) { return; }

		const renderer = new EachChild(scope, this.args);

		this.stop();
		this.stop = observe('.', () => cue(renderer), scope);
	},

	stop: noop,

	renderCount: 0
});


/* Logic */

function createEntry(master, options) {
	const node = master.cloneNode(true);
	const fragment = document.createDocumentFragment();
	fragment.appendChild(node);

	// We treat the sparky object as a store for carrying internal data
	// like fragment and nodes, because we can
	const sparky = new Sparky(node, options);
	sparky.fragment = fragment;
	return sparky;
}

function reorderCache(master, array, sparkies, options) {
	// Reorder sparkies
	var n = -1;
	var renderCount = 0;

	while (++n < array.length) {
		const object = array[n];
		let sparky = sparkies[n];

		if (sparky && object === sparky[$scope]) {
			continue;
		}

		// Scan forward through sparkies to find the sparky that
		// corresponds to the scope object
		let i = n - 1;
		while (sparkies[++i] && sparkies[i][$scope] !== object);

		// Create a new one or splice the existing one out
		sparky = i === sparkies.length ?
			createEntry(master, options) :
			sparkies.splice(i, 1)[0];

		// Splice it into place
		sparkies.splice(n, 0, sparky);
	}

	// Reordering has pushed unused sparkies to the end of
	// sparkies collection. Go ahead and remove them.
	while (sparkies.length > array.length) {
		const sparky = sparkies.pop().stop();

		// If sparky nodes are not yet in the DOM, sparky does not have a
		// .nodes property and we may ignore it, otherwise go ahead
		// and get rid of the nodes
		if (sparky.nodes) {
			A$7.forEach.call(sparky.nodes, (node) => node.remove());
			renderCount += sparky.nodes.length;
		}
	}

	return renderCount;
}

function reorderNodes(node, array, sparkies) {
	// Reorder nodes in the DOM
	const l = sparkies.length;
	const parent = node.parentNode;

	var renderCount = 0;
	var n = -1;

	while (n < l) {
		// Note that node is null where nextSibling does not exist.
		// Passing null to insertBefore appends to the end
		node = node ? node.nextSibling : null ;

		while (++n < l && (!sparkies[n].nodes || sparkies[n].nodes[0] !== node)) {
			if (!sparkies[n][$scope]) {
				sparkies[n].push(array[n]);
				sparkies[n][$scope] = array[n];
			}

			if (sparkies[n].fragment) {
				// Cache nodes in the fragment
				sparkies[n].nodes = Array.from(sparkies[n].fragment.childNodes);

				// Stick fragment in the DOM
				parent.insertBefore(sparkies[n].fragment, node);
				sparkies[n].fragment = undefined;

				// Increment renderCount for logging
				++renderCount;
			}
			else {
				// Reorder exising nodes
				let i = -1;
				while (sparkies[n].nodes[++i]) {
					parent.insertBefore(sparkies[n].nodes[i], node);

					// Increment renderCount for logging
					++renderCount;
				}
			}
		}

		if (!sparkies[n]) { break; }
		node = last(sparkies[n].nodes);
	}

	return renderCount;
}

function eachFrame(stream, node, marker, sparkies, isOption, options) {
	const renderer = new EachParent(stream, node, marker, sparkies, isOption, options);

	function push() {
		cue(renderer);
	}

	// Support functors
	if (!stream.on) {
		push();

		return function stop() {
			renderer.stop();
			uncue(renderer);
		};
	}

	// Support streams
	stream.on('push', push);

	return function stop() {
		stream.off('push', push);
		renderer.stop();
		uncue(renderer);
	};
}

function entryToKeyValue(entry) {
	return {
		key:   entry[0],
		value: entry[1]
	};
}

function each$2(node, scopes, params, options) {
	if (isFragmentNode(node)) {
		throw new Error('Sparky.fn.each cannot be used on fragments. Yet.');
	}

	const sparkies = [];
	const marker   = MarkerNode(node);
	const isOption = tag(node) === 'option';

	// Put the marker in place and remove the node
	before$1(node, marker);

	// The master node has it's fn attribute truncated to avoid setup
	// functions being run again. Todo: This is a bit clunky - can we avoid
	// doing this by passing in the fn string in options to the child instead
	// of reparsing the fn attribute?
	if (options.fn) { node.setAttribute(options.attributeFn, options.fn); }
	else { node.removeAttribute(options.attributeFn); }

	node.remove();

	// Prevent further functions being run on current node
	options.fn = '';

	// Get the value of scopes in frames after it has changed
	var unEachFrame = eachFrame(scopes.latest().dedup(), node, marker, sparkies, isOption, options);

	scopes.done(() => {
		remove$2(marker);
		unEachFrame();
		sparkies.forEach(function(sparky) {
			sparky.stop();
		});
	});

	// Return false to prevent further processing of this Sparky
	return false;
}

function entries(node, input, params) {
    return input.map(Object.entries);
}

function get$2(node, input, params) {
    const path = params[0];
    var observable = nothing;

    return input.chain((object) => {
        observable.stop();
        observable = Observable(path, object);
        return observable;
    });
}

const DEBUG$4 = window.DEBUG;

function on$2(node, input, params) {
    const type   = params[0];
    const length = params.length - 1;

    let flag = false;
    let i = -1;
    let scope;

    const listener = (e) => {
        // Cycle through params[1] to params[-1]
        i = (i + 1) % length;

        const name = params[i + 1];

        if (DEBUG$4 && (!scope || !scope[name])) {
            console.error('Sparky scope', scope);
            throw new Error('Sparky scope has no method "' + name + '"');
        }

        scope[name](e.target.value);
    };

    return input.tap(function(object) {
        if (!flag) {
            flag = true;

            // Keep event binding out of the critical render path by
            // delaying it
            setTimeout(() => node.addEventListener(type, listener), 10);
        }

        scope = object;
    });
}

function prevent(node, input, params) {
    node.addEventListener(params[0], preventDefault);
}

function _if(node, input, params) {
    const output  = Stream.of();
    const name    = params[0];
    const marker  = MarkerNode(node);

    let visible   = false;
    let unobserve = noop;

    // Put the marker in place and remove the node
    before$1(node, marker);
    remove$2(node);

    input.each(function(scope) {
        unobserve();
        unobserve = observe(name, (value) => {
            var visibility = !!value;

            if(visibility === visible) { return; }
            visible = visibility;

            if (visible) {
                replace$1(marker, node);
                output.push(scope);
            }
            else {
                replace$1(node, marker);
                output.push(null);
            }
        }, scope);
    });

    return output;
}

const DEBUG$5 = window.DEBUG;
const fetch$1 = window.fetch;

const fetchOptions = {
    method: 'GET'
};

const cache$2     = {};

function fetchJSON(url) {
    return fetch$1(url, fetchOptions)
    .then(invoke$1('json', nothing));
}

function importScope(url, scopes) {
    fetchJSON(url)
    .then(function(data) {
        if (!data) { return; }
        cache$2[url] = data;
        scopes.push(data);
    })
    .catch(function(error) {
        console.warn('Sparky: no data found at', url);
        //throw error;
    });
}

function _import(node, stream, params) {
    var path = params[0];

    if (DEBUG$5 && !path) {
        throw new Error('Sparky: ' + Sparky.attributePrefix + 'fn="import:url" requires a url.');
    }

    var scopes = Stream$1.of();

    if (/\$\{(\w+)\}/.test(path)) {
        stream.each(function(scope) {
            var url = path.replace(/\$\{(\w+)\}/g, function($0, $1) {
                return scope[$1];
            });

            // If the resource is cached...
            if (cache$2[url]) {
                scopes.push(cache$2[url]);
            }
            else {
                importScope(url, scopes);
            }
        });

        return scopes;
    }

    // If the resource is cached, return it as a readable
    if (cache$2[path]) {
        return Fn.of(cache$2[path]);
    }

    importScope(path, scopes);
    return scopes;
}

function startOn(node, scopes, params) {
    const name = params[0];

    events$1(name, node)
    .filter(isTargetEvent)
    .each(function(e) {
        // Stop listening after first event
        this.stop();
    });
}

const map$2 = new WeakMap();

function getScope(node) {
    if (!map$2.has(node.correspondingUseElement || node)) {
        throw new Error('Sparky scope is not set on node');
        return;
    }

    return map$2.get(node);
}

function scope(node, input, params) {
    input.done(() => map$2.delete(node));
    return input.tap((scope) => {
        return map$2.set(node.correspondingUseElement || node, scope);
    });
}

var functions = {
    'debug':     debug,
    'each':      each$2,
    'entries':   entries,
    'get':       get$2,
    'if':        _if,
    'import':    _import,
    'on':        on$2,
    'prevent':   prevent,
    'start-on':  startOn,
    'scope':     scope
};

function Renderer() {
    this.renderCount = 0;
}

Object.assign(Renderer.prototype, {
    fire: function() {
        this.cued = false;
    },

    push: function(scope) {
        const tokens = this.tokens;
        let n = tokens.length;

        while (n--) {
            const token = tokens[n];

            // Ignore plain strings
            if (typeof token === 'string') { continue; }

            // Normally observe() does not fire on undefined initial values.
            // Passing in NaN as an initial value to forces the callback to
            // fire immediately whatever the initial value. It's a bit
            // smelly, but this works because even NaN !== NaN.
            token.unobserve && token.unobserve();
            token.unobserve = observe(token.path, (value) => {
                token.value = value;

                // If activeElement, token is controlled by the user
                //if (document.activeElement === this.node) { return; }
                // (Why did we replace this with the noRender flag? Because
                // we didn't know how focus on custom elements worked?)

                // If token has noRender flag set, it is being updated from
                // the input and does not need to be rendered back to the input
                if (token.noRender) { return; }

                if (this.cued) { return; }
                this.cued = true;
                cue(this);
            }, scope, NaN);
        }
    },

    stop: function stop() {
        uncue(this);

        const tokens = this.tokens;
        let n = tokens.length;
        while (n--) {
            tokens[n].unobserve && tokens[n].unobserve();
        }

        this.stop = noop;
    }
});

const assign$9 = Object.assign;

function isTruthy(token) {
	return !!token.valueOf();
}

function renderBooleanAttribute(name, node, value) {
	if (value) {
		node.setAttribute(name, name);
	}
	else {
		node.removeAttribute(name);
	}

	// Return DOM mutation count
	return 1;
}

function renderProperty(name, node, value) {
	node[name] = value;

	// Return DOM mutation count
	return 1;
}

function BooleanRenderer(tokens, node, name) {
    this.label  = 'BooleanRenderer';
	this.node   = node;
    this.name   = name;
	this.tokens = tokens;
	this.render = name in node ?
		renderProperty :
		renderBooleanAttribute ;
	this.renderCount = 0;
}

assign$9(BooleanRenderer.prototype, Renderer.prototype, {
    fire: function renderBoolean() {
        Renderer.prototype.fire.apply(this, arguments);

        const value = !!this.tokens.find(isTruthy);

        // Avoid rendering the same value twice
        if (this.renderedValue === value) { return 0; }

		// Return DOM mutation count
        this.renderCount += this.render(this.name, this.node, value);
		this.renderedValue = value;
    }
});

const assign$a = Object.assign;

// Matches anything that contains a non-space character
const rtext = /\S/;

// Matches anything with a space
const rspaces$1 = /\s+/;


function addClasses(classList, text) {
    var classes = text.trim().split(rspaces$1);
    classList.add.apply(classList, classes);

    // Return DOM mutation count
    return 1;
}

function removeClasses(classList, text) {
    var classes = text.trim().split(rspaces$1);
    classList.remove.apply(classList, classes);

    // Return DOM mutation count
    return 1;
}

function partitionByType(data, token) {
    data[typeof token].push(token);
    return data;
}

function ClassRenderer(tokens, node) {
    this.label  = 'ClassRenderer';
    this.renderCount = 0;

    const types = tokens.reduce(partitionByType, {
        string: [],
        object: []
    });

    this.tokens = types.object;
    this.classList = classes(node);

    // Overwrite the class with just the static text
    node.setAttribute('class', types.string.join(' '));
}

assign$a(ClassRenderer.prototype, Renderer.prototype, {
    fire: function renderBoolean() {
        Renderer.prototype.fire.apply(this, arguments);

        const list  = this.classList;
        const value = this.tokens.join(' ');

        // Avoid rendering the same value twice
        if (this.renderedValue === value) {
            return;
        }

        this.renderCount += this.renderedValue && rtext.test(this.renderedValue) ?
            removeClasses(list, this.renderedValue) :
            0 ;

        this.renderCount += value && rtext.test(value) ?
            addClasses(list, value) :
            0 ;

        this.renderedValue = value;
    }
});

const assign$b = Object.assign;

function StringRenderer(tokens, render, node, name) {
    this.label  = 'StringRenderer';
    this.render = render;
    this.node   = node;
    this.name   = name;
    this.tokens = tokens;
    this.renderCount = 0;
}

assign$b(StringRenderer.prototype, Renderer.prototype, {
    fire: function renderString() {
        Renderer.prototype.fire.apply(this, arguments);

        // Causes token.toString() to be called
        const value = this.tokens.join('');

        // Avoid rendering the same value twice
        if (this.renderedValue === value) { return; }

        // Return DOM mutation count
        this.renderCount += this.render(this.name, this.node, value);
        this.renderedValue = value;
    }
});

const assign$c = Object.assign;

function observeMutations(node, fn) {
    var observer = new MutationObserver(fn);
    observer.observe(node, { childList: true });
    return function unobserveMutations() {
        observer.disconnect();
    };
}

function TokenRenderer(token, render, node, name) {
    this.label  = 'TokenRenderer';
	this.renderCount = 0;
    this.render = render;
    this.node   = node;
    this.name   = name;
    this.tokens = [token];

    // Observe mutations to select children, they alter the value of
    // the select, and try to preserve the value if possible
    if (node.tagName.toLowerCase() === 'select') {
        this.unobserveMutations = observeMutations(node, () => {
            if (node.value === this.renderedValue + '') { return; }
            this.renderedValue = undefined;
            cue(this);
        });
    }
}

assign$c(TokenRenderer.prototype, Renderer.prototype, {
    fire: function renderValue() {
        Renderer.prototype.fire.apply(this, arguments);

        const token = this.tokens[0];
        const value = token.valueOf();

        // Avoid rendering the same value twice
        if (this.renderedValue === value) {
            return;
        }

        this.renderCount += this.render(this.name, this.node, value);
        this.renderedValue = value;
    },

    stop: function stop() {
        Renderer.prototype.stop.apply(this, arguments);
        this.unobserveMutations && this.unobserveMutations();
    }
});

var A$8         = Array.prototype;
var S$1         = String.prototype;

const reducers = {
	sum: add$1
};

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

const transformers = {
	add:         {
		tx: curry$1(function(a, b) { return b.add ? b.add(a) : b + a ; }),
		ix: curry$1(function(a, c) { return c.add ? c.add(-a) : c - a ; })
	},

	'add-date':  { tx: addDate,     ix: curry$1(function(d, n) { return addDate('-' + d, n); }) },
	'add-time':  { tx: addTime,     ix: subTime },
	decibels:    { tx: todB,        ix: toLevel },

	join: {
		tx: curry$1(function(string, value) {
			return A$8.join.call(value, string);
		}),

		ix: curry$1(function(string, value) {
			return S$1.split.call(value, string);
		})
	},

	'numbers-string': {
		tx: curry$1(function(string, value) {
			return A$8.join.call(value, string);
		}),

		ix: curry$1(function(string, value) {
			return S$1.split.call(value, string).map(parseFloat);
		})
	},

	multiply:    { tx: multiply$1,    ix: curry$1(function(d, n) { return n / d; }) },
	degrees:     { tx: toDeg,       ix: toRad },
	radians:     { tx: toRad,       ix: toDeg },
	pow:         { tx: pow$1,         ix: function(n) { return pow$1(1/n); } },
	exp:         { tx: exp$1,         ix: log$1 },
	log:         { tx: log$1,         ix: exp$1 },
	int:         { tx: toFixed$1(0),  ix: toInt },
	float:       { tx: toFloat,     ix: toString },
	boolean:     { tx: Boolean,     ix: toString },

	normalise:   {
		tx: curry$1(function(curve, min, max, number) {
			const name = toCamelCase(curve);
			return normalise[name](min, max, number);
		}),

		ix: curry$1(function(curve, min, max, number) {
			const name = toCamelCase(curve);
			return denormalise[name](min, max, number);
		})
	},

	denormalise:   {
		tx: curry$1(function(curve, min, max, number) {
			const name = toCamelCase(curve);
			return denormalise[name](min, max, number);
		}),

		ix: curry$1(function(curve, min, max, number) {
			const name = toCamelCase(curve);
			return normalise[name](min, max, number);
		})
	},

	floatformat: { tx: toFixed$1,     ix: curry$1(function(n, str) { return parseFloat(str); }) },
	'float-string': { tx: (value) => value + '', ix: parseFloat },
	'int-string':   { tx: (value) => value.toFixed(0), ix: toInt },

	interpolate: {
		tx: function(point) {
			var xs = A$8.map.call(arguments, get$1('0'));
			var ys = A$8.map.call(arguments, get$1('1'));

			return function(value) {
				return interpolateLinear(xs, ys, value);
			};
		},

		ix: function(point) {
			var xs = A$8.map.call(arguments, get$1('0'));
			var ys = A$8.map.call(arguments, get$1('1'));

			return function(value) {
				return interpolateLinear(ys, xs, value);
			}
		}
	},

	cartesian: { tx: toCartesian, ix: toPolar },
	polar:     { tx: toPolar, ix: toCartesian },
	deg:       { tx: toDeg, ix: toRad },
	rad:       { tx: toRad, ix: toDeg },
	level:     { tx: toLevel, ix: todB },
	px:        { tx: toPx, ix: toRem },
	rem:       { tx: toRem, ix: toPx }
};

const transforms = {

	contains:     contains$1,
	equals:       equals$1,
	escape:       escape,
	exp:          exp$1,
	formatdate:   formatDate,
	formattime:   formatTime,
	formatfloat:  toFixed$1,

	// formatfloat...
	//curry(function(n, value) {
	//	return typeof value === 'number' ? Number.prototype.toFixed.call(value, n) :
	//		!isDefined(value) ? '' :
	//		(Sparky.debug && console.warn('Sparky: filter floatformat: ' + n + ' called on non-number ' + value)) ;
	//}),

	get:          getPath$1,
	invoke:       invoke$1,
	is:           is,
	last:         last,
	limit:        limit$1,
	log:          log$1,
	max:          max$1,
	min:          min$1,
	mod:          mod$1,
	not:          not,
	percent:      multiply$1(100),

	// Strings
	append:       append$2,
	prepend:      prepend$1,
	prepad:       prepad$1,
	postpad:      postpad$1,
	slugify:      slugify,

	// root(2) - square root
	// root(3) - cubed root, etc.
	root:         root$1,

	// slugify('Howdy, Michael')
	// > 'howdy-michael'

	type:         toType,

	//toStringType: Fn.toStringType,

	// Sparky transforms

	divide: curry$1(function(n, value) {
		if (typeof value !== 'number') { return; }
		return value / n;
	}),

	'find-in': curry$1(function(path, id) {
		if (!isDefined(id)) { return; }
		var array = getPath$1(path, window);
		return array && array.find(compose(is(id), get$1('id')));
	}),

	floatformat: curry$1(function(n, value) {
		return typeof value === 'number' ? Number.prototype.toFixed.call(value, n) :
			!isDefined(value) ? '' :
			(console.warn('Sparky: filter floatformat: ' + n + ' called on non-number ' + value)) ;
	}),

	floor: Math.floor,

	"greater-than": curry$1(function(value2, value1) {
		return value1 > value2;
	}),

	invert: function(value) {
		return typeof value === 'number' ? 1 / value : !value ;
	},

	json: JSON.stringify,

	"less-than": curry$1(function(value2, value1) {
		return value1 < value2 ;
	}),

	localise: curry$1(function(digits, value) {
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

	map: function(method, params) {
		var fn;

		if (typeof params === undefined) {
			fn = parse$3(method);
			return function(array) {
				return array.map(fn);
			};
		}

		fn = ((transformers[method] && transformers[method].tx)
			|| transforms[method]).apply(null, params);

		return function(array) {
			return array && array.map(fn);
		};
	},

	filter: curry$1(function(method, args, array) {
		return array && array.map(transforms[method].apply(null,args));
	}, true),

	match: curry$1(function(regex, string) {
		regex = typeof regex === 'string' ? RegExp(regex) : regex ;
		return regex.exec(string);
	}),

	matches: curry$1(function(regex, string) {
		regex = typeof regex === 'string' ? RegExp(regex) : regex ;
		return !!regex.test(string);
	}),

	pluralise: curry$1(function(str1, str2, lang, value) {
		if (typeof value !== 'number') { return; }

		str1 = str1 || '';
		str2 = str2 || 's';

		// In French, numbers less than 2 are considered singular, where in
		// English, Italian and elsewhere only 1 is singular.
		return lang === 'fr' ?
			(value < 2 && value >= 0) ? str1 : str2 :
			value === 1 ? str1 : str2 ;
	}),

	reduce: curry$1(function(name, initialValue, array) {
		return array && array.reduce(reducers[name], initialValue || 0);
	}, true),

	replace: curry$1(function(str1, str2, value) {
		if (typeof value !== 'string') { return; }
		return value.replace(RegExp(str1, 'g'), str2);
	}),

	round: curry$1(function round(n, value) {
		return Math.round(value / n) * n;
	}),

	slice: curry$1(function(i0, i1, value) {
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
		if (typeof value === 'boolean') { value = Number(value); }
		if (typeof value === 'string') { value = parseInt(value, 10); }
		if (typeof value !== 'number' || Number.isNaN(value)) { return; }
		return arguments[value + 1];
	},

	translate: (function() {
		var warned = {};

		return function(value) {
			var translations = translations;

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

	truncatechars: curry$1(function(n, value) {
		return value.length > n ?
			value.slice(0, n) + '…' :
			value ;
	}),

	uppercase: function(value) {
		if (typeof value !== 'string') { return; }
		return String.prototype.toUpperCase.apply(value);
	},

	//urlencode
	//urlize
	//urlizetrunc
	//wordcount
	//wordwrap

	yesno: curry$1(function(truthy, falsy, value) {
		return value ? truthy : falsy ;
	})
};

const inputMap  = new WeakMap();
const changeMap = new WeakMap();

function getInvert(name) {
    return transformers[name] && transformers[name].ix;
}

function fire$1() {
    Renderer.prototype.fire.apply(this, arguments);

    // Test for undefined and if so set value on scope from the current
    // value of the node. Yes, this means the data can change unexpectedly
    // but the alternative is inputs that jump values when their scope
    // is replaced.
    if (getPath$1(this.path, this.scope) === undefined) {
        // A fudgy hack. A hacky fudge.
        this.token.noRender = true;
        this.fn();
        this.token.noRender = false;
    }
}

function Listener(node, token, eventType, read, readAttributeValue, coerce) {
    this.label = "Listener";
    this.node  = node;
    this.token = token;
    this.path  = token.path;
    this.pipe  = token.pipe;
    this.type  = eventType;
    this.renderCount = 0;
    this.read = read;
    this.readAttributeValue = readAttributeValue;
    this.coerce = coerce || id;
    this.fns   = eventType === 'input' ? inputMap :
        eventType === 'change' ? changeMap :
        undefined ;
}

Object.assign(Listener.prototype, {
    transform: id,

    set: noop,

    fire: function() {
        Renderer.prototype.fire.apply(this, arguments);

        // First render, set up reverse pipe
        if (this.pipe) {
            this.transform = pipe.apply(null,
                this.pipe
                .map((data) => {
                    const fn = getInvert(data.name);
                    if (!fn) { throw new Error('Sparky invert fn ' + data.name + '() not found.'); }
                    return data.args && data.args.length ?
                        fn.apply(null, data.args) :
                        fn ;
                })
                .reverse()
            );
        }

        // Define the event handler
        this.fn = () => {
            const value = this.coerce(this.read(this.node));
            // Allow undefined to pass through with no transform
            this.set(value !== undefined ? this.transform(value) : undefined);
        };

        // Add it to the delegate pool
        this.fns.set(this.node, this.fn);

        // Handle subsequent renders by replacing this fire method
        this.fire = fire$1;

        // Set the original value on the scope
        if (getPath$1(this.path, this.scope) === undefined) {
            // Has this element already had its value property set? Custom
            // elements may not yet have the value property
            if ('value' in this.node) {
                this.fn();
            }
            else {
                // A fudgy hack. A hacky fudge.
                this.token.noRender = true;
                this.set(this.transform(this.coerce(this.readAttributeValue(this.node))));
                this.token.noRender = false;
            }
        }
    },

    push: function(scope) {
        this.scope = scope;

        if (scope[this.path] && scope[this.path].setValueAtTime) {
            // Its an AudioParam... oooo... eeeuuuhhh...
            this.set = (value) => {
                if (value === undefined) { return; }
                Target(scope)[this.path].setValueAtTime(value, scope.context.currentTime);
            };
        }
        else {
            this.set = setPath$1(this.path, scope);
        }

        // Wait for values to have been rendered on the next frame
        // before setting up. This is so that min and max and other
        // constraints have had a chance to affect value before it is
        // read and set on scope.
        cue(this);
        return this;
    },

    stop: function() {
        this.fns.delete(this.node);
        return this;
    }
});


// Delegate input and change handlers to the document at the cost of
// one WeakMap lookup

document.addEventListener('input', function(e) {
    const fn = inputMap.get(e.target);
    if (!fn) { return; }
    fn(e.target.value);
});

document.addEventListener('change', function(e) {
    const fn = changeMap.get(e.target);
    if (!fn) { return; }
    fn(e.target.value);
});

document.addEventListener('focusout', function(e) {
    // Todo: Changes are not rendered while node is focused,
    // render them on blur
});

var config$1 = {
    default:  { attributes: ['id', 'title', 'style'], booleans: ['hidden'] },
    a:        { attributes: ['href'] },
    button:   { booleans:   ['disabled'] },
    circle:   { attributes: ['cx', 'cy', 'r', 'transform'] },
    ellipse:  { attributes: ['cx', 'cy', 'rx', 'ry', 'r', 'transform'] },
    form:     { attributes: ['method', 'action'] },
    fieldset: { booleans:   ['disabled'] },
    g:        { attributes: ['transform'] },
    img:      { attributes: ['alt']	},
    input: {
        booleans:   ['disabled', 'required'],
        attributes: ['name'],
        types: {
            button:   { attributes: ['value'] },
            checkbox: { attributes: [], booleans: ['checked'], value: 'checkbox' },
            date:     { attributes: ['min', 'max', 'step'], value: 'string' },
            hidden:   { attributes: ['value'] },
            image:    { attributes: ['src'] },
            number:   { attributes: ['min', 'max', 'step'], value: 'number' },
            radio:    { attributes: [], booleans: ['checked'], value: 'radio' },
            range:    { attributes: ['min', 'max', 'step'], value: 'number' },
            reset:    { attributes: ['value'] },
            submit:   { attributes: ['value'] },
            time:     { attributes: ['min', 'max', 'step'], value: 'string' },
            default:  { value: 'string' }
        }
    },
    label:    { attributes: ['for'] },
    line:     { attributes: ['x1', 'x2', 'y1', 'y2', 'transform'] },
    meta:     { attributes: ['content'] },
    meter:    { attributes: ['min', 'max', 'low', 'high', 'value'] },
    option:   { attributes: ['value'], booleans: ['disabled'] },
    output:   { attributes: ['for'] },
    path:     { attributes: ['d', 'transform'] },
    polygon:  { attributes: ['points', 'transform'] },
    polyline: { attributes: ['points', 'transform'] },
    progress: { attributes: ['max', 'value'] },
    rect:     { attributes: ['x', 'y', 'width', 'height', 'rx', 'ry', 'transform'] },
    select:   { attributes: ['name'], booleans: ['disabled', 'required'], types: { default: { value: 'string' }}},
    svg:      { attributes: ['viewbox'] },
    text:     { attributes: ['x', 'y', 'dx', 'dy', 'text-anchor', 'transform'] },
    textarea: { attributes: ['name'], booleans: ['disabled', 'required'], value: 'string' },
    time:     { attributes: ['datetime'] },
    use:      { attributes: ['href', 'transform', 'x', 'y'] }
};

// Debug mode on by default
const DEBUG$6 = window.DEBUG === undefined || window.DEBUG;

const A$9      = Array.prototype;
const assign$d = Object.assign;

const $cache = Symbol('cache');

const cased = {
	viewbox: 'viewBox'
};


// Helpers

const getType = get$1('type');

const getNodeType = get$1('nodeType');

const types$1 = {
	'number':     'number',
	'range':      'number'
};

function push(value, pushable) {
	pushable.push(value);
	return value;
}

function stop(object) {
	object.stop();
	return object;
}


// Pipes

// Add a global cache to transforms, soon to be known as pipes
const pipesCache = transforms[$cache] = {};

function getTransform(name) {
    return transformers[name] ?
        transformers[name].tx :
        transforms[name] ;
}

function applyTransform(data, fn) {
	return data.args && data.args.length ?
		// fn is expected to return a fn
		fn.apply(null, data.args) :
		// fn is used directly
		fn ;
}

function createPipe(array, pipes) {
    // Cache is dependent on pipes object - a new pipes object
    // results in a new cache
    const localCache = pipes
		&& (pipes[$cache] || (pipes[$cache] = {}));

    // Cache pipes for reuse by other tokens
    const key = JSON.stringify(array);

    // Check global and local pipes caches
    if (pipesCache[key]) { return pipesCache[key]; }
    if (localCache && localCache[key]) { return localCache[key]; }

	// All a bit dodgy - we cycle over transforms and switch the cache to
	// local cache if a global pipe is not found...
    var cache = pipesCache;
    const fns = array.map((data) => {
		// Look in global pipes first
		var fn = getTransform(data.name);

		if (!fn) {
			// Switch the cache, look in local pipes
			cache = localCache;
			fn = pipes[data.name];

			if (DEBUG$6 && !fn) {
				throw new Error('pipe ' + data.name + '() not found.');
			}
		}

		// Does the number of arguments supplied match the signature of the
		// transform? If not, error of the form
		// transform:arg,arg,arg takes 3 arguments, 2 given arg,arg
		if (DEBUG$6 && data.args.length !== fn.length - 1) {
			throw new Error(data.name + ':'
				+ /\(((?:(?:,\s*)?\w*)*),/.exec(fn.toString())[1].replace(/\s*/g, '')
				+ ' takes ' + (fn.length - 1) + ' arguments, '
				+ data.args.length + ' given ' + data.args);
		}

		return applyTransform(data, fn);
	});

	// Cache the result
    return (cache[key] = pipe.apply(null, fns));
}

function assignTransform(pipes, token) {
	if (token.pipe) {
		token.transform = createPipe(token.pipe, pipes);
	}
	return pipes;
}


// Read

function coerceString(value) {
	// Reject empty strings
	return value || undefined;
}

function coerceNumber(value) {
	// Reject non-number values including NaN
	value = +value;
	return value || value === 0 ? value : undefined ;
}

function readValue(node) {
	// Falsy values other than false or 0 should return undefined,
	// meaning that an empty <input> represents an undefined property
	// on scope.
	const value = node.value;
	return value || value === 0 ? value : undefined ;
}

function readCheckbox(node) {
	// Check whether value is defined to determine whether we treat
	// the input as a value matcher or as a boolean
	return isDefined(node.getAttribute('value')) ?
		// Return string or undefined
		node.checked ? node.value : undefined :
		// Return boolean
		node.checked ;
}

function readRadio(node) {
	if (!node.checked) { return; }

	return isDefined(node.getAttribute('value')) ?
		// Return value string
		node.value :
		// Return boolean
		node.checked ;
}

function readAttributeValue(node) {
	// Get original value from attributes. We cannot read properties here
	// because custom elements do not yet have their properties initialised
	return node.getAttribute('value') || undefined;
}

function readAttributeChecked(node) {
	// Get original value from attributes. We cannot read properties here
	// because custom elements do not yet have their properties initialised
	const value    = node.getAttribute('value');
	const checked  = !!node.getAttribute('checked');
	return value ? value : checked ;
}


// Render

function renderText(name, node, value) {
	node.nodeValue = value;

	// Return DOM mod count
	return 1;
}

function renderAttribute(name, node, value) {
	node.setAttribute(cased[name] || name, value);

	// Return DOM mod count
	return 1;
}

function renderProperty$1(name, node, value) {
	// Bit of an edge case, but where we have a custom element that has not
	// been upgraded yet, but it gets a property defined on its prototype when
	// it does upgrade, setting the property on the instance now will mask the
	// ultimate get/set definition on the prototype when it does arrive.
	//
	// So don't, if property is not in node. Set the attribute, it will be
	// picked up on upgrade.
	if (name in node) {
		node[name] = value;
	}
	else {
		node.setAttribute(name, value);
	}

	// Return DOM mutation count
	return 1;
}

function renderPropertyBoolean(name, node, value) {
	if (name in node) {
		node[name] = value;
	}
	else if (value) {
		node.setAttribute(name, name);
	}
	else {
		node.removeAttribute(name);
	}

	// Return DOM mutation count
	return 1;
}

function renderValue(name, node, value) {
	// Don't render into focused nodes, it makes the cursor jump to the
	// end of the field, plus we should cede control to the user anyway
	if (document.activeElement === node) {
		return 0;
	}

	value = typeof value === (types$1[node.type] || 'string') ?
		value :
		null ;

	// Avoid updating with the same value. Support values that are any
	// type as well as values that are always strings
	if (value === node.value || (value + '') === node.value) { return 0; }

	const count = renderProperty$1('value', node, value);

	// Event hook (validation in dom lib)
	trigger$2('dom-update', node);

	// Return DOM mod count
	return count;
}

function renderValueNumber(name, node, value) {
	// Don't render into focused nodes, it makes the cursor jump to the
	// end of the field, and we should cede control to the user anyway
	if (document.activeElement === node) { return 0; }

	// Be strict about type, dont render non-numbers
	value = typeof value === 'number' ? value : null ;

	// Avoid updating with the same value. Beware that node.value
	// may be a string (<input>) or number (<range-control>)
	if (value === (node.value === '' ? null : +node.value)) { return 0; }

	const count = renderProperty$1('value', node, value);

	// Event hook (validation in dom lib)
	trigger$2('dom-update', node);

	// Return DOM mod count
	return count;
}

function renderChecked(name, node, value) {
	// Where value is defined check against it, otherwise
	// value is "on", uselessly. Set checked state directly.
	const checked = isDefined(node.getAttribute('value')) ?
		value === node.value :
		value === true ;

	if (checked === node.checked) { return 0; }

	const count = renderPropertyBoolean('checked', node, checked);

	// Event hook (validation in dom lib)
	trigger$2('dom-update', node);

	// Return DOM mod count
	return count;
}


// Mount

function mountToken(source, render, renderers, options, node, name) {
	// Shortcut empty string
	if (!source) { return; }

	const token = parseToken(options.pipes, source);
	if (!token) { return; }

	// Create transform from pipe
	assignTransform(options.pipes, token);
	const renderer = new TokenRenderer(token, render, node, name);
	renderers.push(renderer);
	return renderer;
}

function mountString(source, render, renderers, options, node, name) {
	// Shortcut empty string
	if (!source) { return; }

	const tokens = parseText([], source);
	if (!tokens) { return; }

	// Create transform from pipe
	tokens.reduce(assignTransform, options.pipes);

	const renderer = new StringRenderer(tokens, render, node, name);
	renderers.push(renderer);
	return renderer;
}

function mountAttribute(name, node, renderers, options, prefixed) {
	name = cased[name] || name;

	var source = prefixed !== false && node.getAttribute(options.attributePrefix + name);

	if (source) {
		node.removeAttribute(options.attributePrefix + name);
	}
	else {
		source = node.getAttribute(name);
	}

	return mountString(source, renderAttribute, renderers, options, node, name);
}

function mountAttributes(names, node, renderers, options) {
	var name;
	var n = -1;

	while ((name = names[++n])) {
		mountAttribute(name, node, renderers, options);
	}
}

function mountBoolean(name, node, renderers, options) {
	// Look for prefixed attributes before attributes.
	//
	// In FF, the disabled attribute is set to the previous value that the
	// element had when the page is refreshed, so it contains no sparky
	// tags. The proper way to address this problem is to set
	// autocomplete="off" on the parent form or on the field.
	const prefixed = node.getAttribute(options.attributePrefix + name);

	if (prefixed) {
		node.removeAttribute(options.attributePrefix + name);
	}

	const source = prefixed || node.getAttribute(name);
	if (!source) { return; }

	const tokens = parseBoolean([], source);
	if (!tokens) { return; }

	// Create transform from pipe
	tokens.reduce(assignTransform, options.pipes);

	const renderer = new BooleanRenderer(tokens, node, name);
	renderers.push(renderer);
	return renderer;
}

function mountBooleans(names, node, renderers, options) {
	var name;
	var n = -1;

	while ((name = names[++n])) {
		mountBoolean(name, node, renderers, options);
	}
}

function mountClass(node, renderers, options) {
	const prefixed = node.getAttribute(options.attributePrefix + 'class');

	if (prefixed) {
		node.removeAttribute(options.attributePrefix + 'class');
	}

	// Are there classes?
	const source = prefixed || node.getAttribute('class');
	if (!source) { return; }

	const tokens = parseText([], source);
	if (!tokens) { return; }

	// Create transform from pipe
	tokens.reduce(assignTransform, options.pipes);

	const renderer = new ClassRenderer(tokens, node);
	renderers.push(renderer);
}

function mountValueProp(node, renderers, options, render, read, readAttribute, coerce) {
	const prefixed = node.getAttribute(options.attributePrefix + 'value');

	if (prefixed) {
		node.removeAttribute(options.attributePrefix + 'value');
	}

	const source   = prefixed || node.getAttribute('value');
	if (!source) { return; }

	const renderer = mountToken(source, render, renderers, options, node, 'value');
	if (!renderer) { return; }

	const listener = new Listener(node, renderer.tokens[0], 'input', read, readAttribute, coerce);
	if (!listener) { return; }

	// Insert the listener ahead of the renderer so that on first
	// cue the listener populates scope from the input value first
	renderers.splice(renderers.length - 1, 0, listener);
}

function mountValueChecked(node, renderers, options, render, read, readAttribute, coerce) {
	const source = node.getAttribute('value') ;
	mountString(source, renderProperty$1, renderers, options, node, 'value');

	const sourcePre = node.getAttribute(options.attributePrefix + 'value');
	const renderer = mountToken(sourcePre, render, renderers, options, node, 'value');
	if (!renderer) { return; }

	const listener = new Listener(node, renderer.tokens[0], 'change', read, readAttribute, coerce);
	if (!listener) { return; }

	// Insert the listener ahead of the renderer so that on first
	// cue the listener populates scope from the input value first
	renderers.splice(renderers.length - 1, 0, listener);
}

const mountValue = choose({
	number: function(node, renderers, options) {
		return mountValueProp(node, renderers, options, renderValueNumber, readValue, readAttributeValue, coerceNumber);
	},

	range: function(node, renderers, options) {
		return mountValueProp(node, renderers, options, renderValueNumber, readValue, readAttributeValue, coerceNumber);
	},

	checkbox: function(node, renderers, options) {
		return mountValueChecked(node, renderers, options, renderChecked, readCheckbox, readAttributeChecked);
	},

	radio: function(node, renderers, options) {
		return mountValueChecked(node, renderers, options, renderChecked, readRadio, readAttributeChecked);
	},

	default: function(node, renderers, options) {
		return mountValueProp(node, renderers, options, renderValue, readValue, readAttributeValue, coerceString);
	}
});

function mountInput(types, node, renderers, options) {
	var type    = getType(node);
	var setting = types[type] || types.default;

	if (!setting) { return; }
	if (setting.booleans)   { mountBooleans(setting.booleans, node, renderers, options); }
	if (setting.attributes) { mountAttributes(setting.attributes, node, renderers, options); }
	if (setting.value)      { mountValue(type, node, renderers, options); }
}

function mountTag(settings, node, renderers, options) {
	var name    = tag(node);
	var setting = settings[name];

	if (!setting) { return; }
	if (setting.booleans)   { mountBooleans(setting.booleans, node, renderers, options); }
	if (setting.attributes) { mountAttributes(setting.attributes, node, renderers, options); }
	if (setting.types)      { mountInput(setting.types, node, renderers, options); }
	if (setting.value)      { mountValue(setting.value, node, renderers, options); }
}

function mountCollection(children, renderers, options) {
	var n = -1;
	var child;

	while ((child = children[++n])) {
		mountNode(child, renderers, options);
	}
}

const mountNode = overload(getNodeType, {
	// element
	1: function mountElement(node, renderers, options) {
		const sparky = options.mount && options.mount(node, options);
		if (sparky) {
			renderers.push(sparky);
			return;
		}

		// Get an immutable list of children. Remember node.childNodes is
		// dynamic, and we don't want to mount elements that may be dynamically
		// inserted, so turn childNodes into an array first.
		mountCollection(Array.from(node.childNodes), renderers, options);
		mountClass(node, renderers, options);
		mountBooleans(config$1.default.booleans, node, renderers, options);
		mountAttributes(config$1.default.attributes, node, renderers, options);
		mountTag(config$1, node, renderers, options);
	},

	// text
	3: function mountText(node, renderers, options) {
		mountString(node.nodeValue, renderText, renderers, options, node);
	},

	// comment
	8: noop,

	// document
	9: function mountDocument(node, renderers, options) {
		mountCollection(A$9.slice.apply(node.childNodes), renderers, options);
	},

	// doctype
	10: noop,

	// fragment
	11: function mountFragment(node, renderers, options) {
		mountCollection(A$9.slice.apply(node.childNodes), renderers, options);
	},

	// array or array-like
	default: function mountArray(collection, renderers, options) {
		if (typeof collection.length !== 'number') {
			throw new Error('Cannot mount object. It is neither a node nor a collection.', collection);
		}

		mountCollection(collection, renderers, options);
	}
});

function Mount(node, options) {
	if (!Mount.prototype.isPrototypeOf(this)) {
        return new Mount(node, options);
    }

	const renderers = this.renderers = [];
	mountNode(node, renderers, options);
}

assign$d(Mount.prototype, {
	stop: function() {
		this.renderers.forEach(stop);
		return this;
	},

	push: function(scope) {
		// Dedup
		if (this.scope === scope) {
			return this;
		}

		// Set new scope
		this.scope = scope;
		this.renderers.reduce(push, scope);

		return this;
	}
});

// Debug mode is on by default
const DEBUG$7 = window.DEBUG === undefined || window.DEBUG;

const assign$e = Object.assign;

const captureFn = capture$1(/^\s*([\w-]+)\s*(:)?/, {
    1: function(output, tokens) {
        output.name = tokens[1];
        return output;
    },

    2: function(output, tokens) {
        output.params = parseParams([], tokens);
        return output;
    },

    close: function(output, tokens) {
        // Capture exposes consumed index as .consumed
        output.remainingString = tokens.input.slice(tokens[0].length + (tokens.consumed || 0));
        return output;
    }
});

function valueOf(object) {
    return object.valueOf();
}

function logSparky(attrIs, attrFn, attrInclude, target) {
    console.log('%cSparky%c'
        + (attrIs ? ' is="' + attrIs + '"' : '')
        + (attrFn ? ' fn="' + attrFn + '"' : '')
        + (attrInclude ? ' include="' + attrInclude + '"' : ''),
        'color: #858720; font-weight: 600;',
        'color: #6894ab; font-weight: 400;'
        //target
    );
}

function nodeToString(node) {
    return '<' +
    node.tagName.toLowerCase() +
    (['fn', 'class', 'id', 'include'].reduce((string, name) => {
        const attr = node.getAttribute(name);
        return attr ? string + ' ' + name + '="' + attr + '"' : string ;
    }, '')) +
    '/>';
}

function toObserverOrSelf(object) {
    return Observer(object) || object;
}

function replace$2(target, content) {
    target.before(content);
    target.remove();
}

function prepareInput(input, output) {
    const done = input.done;

    // Support promises and functors
    input = output.map ? output.map(toObserverOrSelf) :
        output.then ? output.then(toObserverOrSelf) :
        output ;

    // Transfer done(fn) method if new input doesnt have one
    // A bit dodge, this. Maybe we should insist that output
    // type is a stream.
    if (!input.done) {
        input.done = done;
    }

    return input;
}

function run$1(context, node, input, options) {
    var result;

    while(input && options.fn && (result = captureFn({}, options.fn))) {
        // Find Sparky function by name, looking in global functions store
        // first, then local options. This order makes it impossible to
        // overwrite built-in fns.
        const fn = functions[result.name]
            || (options.functions && options.functions[result.name]);

        if (!fn) {
            throw new Error(
                'Sparky function "'
                + result.name
                + '" not found mounting node '
                + nodeToString(node)
            );
        }

        options.fn = result.remainingString;

        if (fn.settings) {
            // Overwrite functions / pipes
            assign$e(options, fn.settings);
        }

        // Return values from Sparky functions mean -
        // stream    - use the new input stream
        // promise   - use the promise
        // undefined - use the same input streeam
        // false     - stop processing this node
        const output = fn.call(context, node, input, result.params, options);

        // Output false means stop processing the node
        if (output === false) {
            return false;
        }

        if (output && output !== input) {
            input = prepareInput(input, output);
        }
    }

    return input;
}

function mountContent(content, options) {
    options.mount = function(node, options) {
        // This is a half-assed way of preventing the root node of this
        // sparky from being remounted. Still needed?
        if (node === content) { return; }

        // Does the node have Sparkyfiable attributes?
        options.fn      = node.getAttribute(options.attributeFn) || '';
        options.include = node.getAttribute(options.attributeInclude) || '';

        if (!options.fn && !options.include) { return; }

        // Return a writeable stream. A write stream
        // must have the methods .push() and .stop().
        // Sparky is a write stream.
        return Sparky(node, options);
    };

    // Launch rendering
    return Mount(content, options);
}

function setupTarget(string, input, render, options) {
    // If there are no dynamic tokens to render, return the include
    if (!string) {
        throw new Error('Sparky attribute include cannot be empty');
    }

    const tokens = parseText([], string);

    // If there are no dynamic tokens to render, return the include
    if (!tokens) {
        return setupSrc(string, input, render, options);
    }

    // Create transform from pipe
	tokens.reduce(assignTransform, options.pipes);

    let output  = nothing;
    let stop    = noop;
    let prevSrc = null;

    function update(scope) {
        const values = tokens.map(valueOf);

        // Tokens in the include tag MUST evaluate in order that a template
        // may be rendered.
        //
        // If any tokens evaluated to undefined (which can happen frequently
        // because observe is not batched, it will attempt to update() before
        // all tokens have value) we don't want to go looking for a template.
        if (values.indexOf(undefined) !== -1) {
            if (prevSrc !== null) {
                render(null);
                prevSrc = null;
            }

            return;
        }

        // Join the tokens together
        const src = values
        .map(toText)
        .join('');

        // If template path has not changed
        if (src === prevSrc) {
            output.push(scope);
            return;
        }

        prevSrc = src;

        // Stop the previous
        output.stop();
        stop();

        // If include is empty string render nothing
        if (!src) {
            if (prevSrc !== null) {
                render(null);
                prevSrc = null;
            }

            output = nothing;
            stop = noop;
            return;
        }

        // Push scope to the template renderer
        output = Stream$1.of(scope);
        stop = setupSrc(src, output, render, options);
    }

    // Support streams and promises
    input[input.each ? 'each' : 'then'](function(scope) {
        let n = tokens.length;

        while (n--) {
            const token = tokens[n];

            // Ignore plain strings
            if (typeof token === 'string') { continue; }

            // Passing in NaN as an initial value to observe() forces the
            // callback to be called immediately. It's a bit tricksy, but this
            // works because even NaN !== NaN.
            token.unobserve && token.unobserve();
            token.unobserve = observe(token.path, (value) => {
                token.value = value;
                update(scope);
            }, scope, NaN);
        }
    });

    return () => {
        output.stop();
        stop();
    };
}

function setupSrc(src, input, firstRender, options) {
    // Strip off leading # before running the test
    const source = document.getElementById(src.replace(/^#/, ''));

    if (source) {
        const content = source.content ? source.content.cloneNode(true) :
            source instanceof SVGElement ? source.cloneNode(true) :
            undefined ;

        return setupInclude(content, input, firstRender, options);
    }

    let stopped;
    let stop = noop;

    importTemplate(src)
    .then((node) => {
        if (stopped) { return; }

        const attrFn = node.getAttribute(options.attributeFn);

        const content =
            // Support templates
            node.content ? node.content.cloneNode(true) :
            // Support SVG elements
            node instanceof SVGElement ? node.cloneNode(true) :
            // Support body elements imported from exernal documents
            fragmentFromChildren(node) ;

        stop = setupInclude(content, input, firstRender, options);
    })
    // Swallow errors – unfound templates should not stop the rendering of
    // the rest of the tree – but log them to the console as errors.
    .catch((error) => {
        console.error(error.stack);
    });

    return function() {
        stopped = true;
        stop();
        stop = noop;
    }
}

function setupInclude(content, input, firstRender, options) {
    var renderer;

    // Support streams and promises
    input[input.each ? 'each' : 'then']((scope) => {
        const first = !renderer;
        renderer = renderer || (isFragmentNode(content) ?
            mountContent(content, options) :
            new Sparky(content, options)
        );
        renderer.push(scope);
        if (first) {
            firstRender(content);
            input.done(() => renderer.stop());
        }
    });

    return function() {
        renderer && renderer.stop();
    };
}

function setupElement(target, input, options, sparky) {
    const content = target.content;
    var renderer;

    // Support streams and promises
    input[input.each ? 'each' : 'then']((scope) => {
        const init = !renderer;

        renderer = renderer || mountContent(content || target, options);
        renderer.push(scope);

        // If target is a template, replace it
        if (content && init) {
            replace$2(target, content);

            // Increment mutations for logging
            ++sparky.renderCount;
        }
    });

    return function stop() {
        renderer && renderer.stop();
    };
}

function setupTemplate(target, src, input, options, sparky) {
    const nodes = { 0: target };

    return setupTarget(src, input, (content) => {
        // Store node 0
        const node0 = nodes[0];

        // Remove nodes from 1 to last
        var n = 0;
        while (nodes[++n]) {
            nodes[n].remove();
            nodes[n] = undefined;

            // Update count for logging
            ++sparky.renderCount;
        }

        // If there is content cache new nodes
        if (content && content.childNodes && content.childNodes.length) {
            assign$e(nodes, content.childNodes);
        }

        // Otherwise content is a placemarker text node
        else {
            content = nodes[0] = target.content ?
                DEBUG$7 ?
                    create$1('comment', ' include="' + src + '" ') :
                    create$1('text', '') :
                target ;
        }

        // Replace child 0, which we avoided doing above to keep it as a
        // position marker in the DOM for exactly this reason this...
        replace$2(node0, content);

        // Update count for logging
        ++sparky.renderCount;
    }, options);
}

function setupSVG(target, src, output, options, sparky) {
    return setupTarget(src, output, (content) => {
        content.removeAttribute('id');

        replace$2(target, content);
        target = content;

        // Increment mutations for logging
        ++sparky.renderCount;
    }, options);
}

function Sparky(selector, settings) {
    if (!Sparky.prototype.isPrototypeOf(this)) {
        return new Sparky(selector, settings);
    }

    const target  = typeof selector === 'string' ?
        document.querySelector(selector) :
        selector ;

    const options = assign$e({}, config, settings);
    const attrFn = options.fn = options.fn
        || target.getAttribute(options.attributeFn)
        || '';

    const input = Stream$1.of().map(toObserverOrSelf);
    const output = run$1(null, target, input, options);

    this.label = 'Sparky';
    this.renderCount = 0;

    this.push = input.push;
    this.stop = input.stop;

    // If output is false do not go on to parse and mount content
    if (!output) { return; }

    const attrInclude = options.include
        || target.getAttribute(options.attributeInclude)
        || '';

    this.stop = function() {
        input.stop();
        output.stop();
        stop();
        return this;
    };

    if (DEBUG$7) { logSparky(options.is, attrFn, attrInclude, target); }

    // We have consumed fn and include now, we may blank them before
    // passing them on to the mounter, to protect against them being
    // used again.
    options.is      = '';
    options.fn      = '';
    options.include = '';

    var stop = attrInclude ?
        target.tagName === 'use' ?
            setupSVG(target, attrInclude, output, options, this) :
            setupTemplate(target, attrInclude, output, options, this) :
        setupElement(target, output, options, this) ;
}

// Sparky

// Sparky colour scheme
//
// #d0e84a
// #b9d819 - Principal bg colour
// #a3b31f
// #858720
// #d34515
// #915133
// #723f24
// #6894ab
// #4a6a7a
// #25343c
// #282a2b

if (window.console && window.console.log) {
    console.log('%cSparky%c      - https://github.com/cruncher/sparky', 'color: #a3b31f; font-weight: 600;', 'color: inherit; font-weight: 300;');
}

function register(name, fn, options) {
    functions[name] = fn;
    functions[name].settings = options;
}

const options$1 = { is: 'sparky' };

// Launch sparky on sparky templates. Ultimately this will be a web
// component, I guess

cue({
    label: "IsRenderer",

    fire: function() {
        const renderer = this;

        window.document
        .querySelectorAll('[is="sparky"]')
        .forEach((template) => {
            const attrFn = options$1.fn = template.getAttribute('fn');
            const sparky = new Sparky(template, options$1);

            // If there is no attribute fn, there is no way for this sparky
            // to launch as it will never get scope. Enable sparky templates
            // with just an include by passing in blank scope.
            if (!attrFn) {
                const blank = {};
                sparky.push(blank);
                renderer.renderedValue = blank;
            }
        });
    },

    renderCount: 0
});

exports.Fn = Fn;
exports.Observable = Observable;
exports.Observer = Observer;
exports.Stream = Stream$1;
exports.Target = Target;
exports.config = config;
exports.cue = cue;
exports.default = Sparky;
exports.events = events$1;
exports.functions = functions;
exports.get = get$1;
exports.getScope = getScope;
exports.id = id;
exports.mount = Mount;
exports.mountConfig = config$1;
exports.noop = noop;
exports.nothing = nothing;
exports.notify = notify$1;
exports.observe = observe;
exports.register = register;
exports.set = set$1;
exports.transformers = transformers;
exports.transforms = transforms;
exports.trigger = trigger$2;
exports.uncue = uncue;
