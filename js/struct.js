
import { get, id, noop, pipe, remove, getPath, setPath, Observable as ObservableStream, postpad } from '../../fn/fn.js'
import { parsePipe }    from './parse.js';
import { transformers } from './transforms.js';
import { cue, uncue }   from './frame.js';

const DEBUG      = false;
const assign     = Object.assign;


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

export default function Struct(node, token, path, render, pipe, data) {
	this.node    = node;
	this.token   = token;
	this.path    = path;
	this.render  = render;
	this.pipe    = pipe;
	this.data    = data;

	addStruct(this);
}

assign(Struct.prototype, {
	render:  noop,
	transform: id,

	stop: function stop() {
		//console.log('STRUCT STOP', this.token);

		this.unbind();
		uncue(this.cuer);
		removeStruct(this);

		this.stop   = noop;
		this.status = 'done';
	},

	start: function() {
		//console.log('STRUCT START', this.token);

		// Todo: We need rid of the leading '|' in struct.pipe
		this.transform = this.pipe ? parsePipe(this.pipe.slice(1)) : id ;
		this.originalValue = this.read ? this.read() : '' ;
		this.start  = noop;
		this.status = 'active';

		if (DEBUG) { console.log('start: ', this.token, this.originalValue); }
	},

	bind: function(scope) {
		const struct = this;

		struct.input = ObservableStream(struct.path, scope).latest();

		// Just for debugging
		struct.scope = scope;

		let flag = false;

		this.cuer = function update() {
			struct.update();
			if (flag) { return; }
			flag = true;
			struct.input.on('push', function() {
				cue(update);
			});
		};

		// Pass some information to the frame cuer for debugging
		// Todo: I think ultimately it would be better to pass entire
		// structs to the cuer, instead of trying to recreate unique functions
		// to use as identities...
		this.cuer.type = postpad('\xa0', 18, this.render.name + ':') + this.token;

		cue(this.cuer);
	},

	unbind: function() {
		//console.log('STRUCT UNBIND', this.token);

		if (DEBUG) { console.log('unbind:', this.token); }
		// Todo: only uncue on teardown
		//this.uncue();
		this.input && this.input.stop();
		this.unlisten && this.unlisten();
		this.scope = undefined;
	},

	update: function(time) {
		//console.log('STRUCT UPDATE', this.token);

		var transform = this.transform;
		var value = this.input && this.input.shift();

		if (DEBUG) { console.log('update:', this.token, value, this.originalValue); }

		if (value === undefined) {
			this.render(this.originalValue);
		}
		else {
			this.render(transform(value));
		}
	},

	reset: function(options) {
		if (this.status === 'active') {
			this.unbind();
		}
		else {
			this.start();
		}
	}
});

export function ReadableStruct(node, token, path, render, pipe, data, type, read) {
	// ReadableStruct extends Struct
	Struct.call(this, node, token, path, render, pipe, data);
	this.type = type;
	this.read = read;
}

ReadableStruct.prototype = assign(Object.create(Struct.prototype), {
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
	},

	bind: function(scope, options) {
		const struct = this;

		struct.input = ObservableStream(struct.path, scope).latest();

		// Just for debugging
		struct.scope = scope;

		const change = listen(struct, scope, options);
		let flag = false;

		this.cuer = function updateReadable() {
			struct.update();

			if (flag) { return; }
			flag = true;

			struct.input.on('push', function() {
				cue(updateReadable);
			});

			var value = getPath(struct.path, scope);

			// Where the initial value of struct.path is not set, set it to
			// the value of the <input/>.
			if (value === undefined) {
				change();
			}
		};

		// Pass some information to the frame cuer for debugging
		// Todo: I think ultimately it would be better to pass entire
		// structs to the cuer, instead of trying to recreate unique functions
		// to use as identities...
		this.cuer.type = postpad('\xa0', 18, this.render.name + ':') + this.token;

		cue(struct.cuer);
		struct.listen(change);
	}
});

function listen(struct, scope, options) {
	//console.log('listen:', postpad(' ', 28, struct.token) + ' scope:', scope);

	var set, invert;

	if (struct.path === '') { console.warn('mount: Cannot listen to path ""'); }

	set    = setPath(struct.path, scope);
	invert = InverseTransform(transformers, struct.pipe);
	return pipe(function() { return struct.read(); }, invert, set);
}

Struct.findScope = function findScope(node) {
	return get('scope', structs.find(function(struct) {
		return struct.node === node;
	}));
};
