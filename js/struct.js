
import { get, id, noop, pipe, remove, getPath, setPath, Stream, Observable as ObservableStream } from '../../fn/fn.js'
import { parsePipe }    from './parse.js';
import { transformers } from './transforms.js';
import { cue, uncue }   from './frame.js';

const DEBUG      = false;

const Observable = window.Observable;
const assign     = Object.assign;
const observe    = Observable.observe;


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

const structs = [];

const removeStruct = remove(structs);

function addStruct(struct) {
	structs.push(struct);
}

export default function Struct(node, token, path, render, pipe, options) {
	//console.log('token: ', postpad(' ', 28, token) + ' node: ', node);

	// Todo: implement struct overide (for parent scope structs)
	if (options && options.struct) {
		const struct = options.struct(node, token, path, render, pipe);
		if (struct) { return struct; }
	}

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

	setup: function(options) {
		var struct = this;

		// Todo: We need rid of the leading '|' in struct.pipe
		struct.transform = struct.pipe ? parsePipe(struct.pipe.slice(1)) : id ;
		struct.originalValue = struct.read ? struct.read() : '' ;
		if (DEBUG) { console.log('setup: ', struct.token, struct.originalValue); }
	},

	teardown: function() {
		var struct = this;

		if (DEBUG) { console.log('teardown', struct.token); }
		unbind(struct);
		struct.stop();
	},

	unbind: function() {
		var struct = this;

		if (DEBUG) { console.log('unbind:', struct.token); }
		// Todo: only uncue on teardown
		//struct.uncue();
		struct.input && struct.input.stop();
		struct.unlisten && struct.unlisten();
		struct.scope = undefined;
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

	var input = struct.input = ObservableStream(struct.path, scope).latest();

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
	invert = InverseTransform(transformers, struct.pipe);
	return pipe(function() { return struct.read(); }, invert, set);
}

Struct.Readable = ReadableStruct;
Struct.bind     = bind;
Struct.listen   = listen;

Struct.findScope = function findScope(node) {
	return get('scope', structs.find(function(struct) {
		return struct.node === node;
	}));
};
