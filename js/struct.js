
import { get, id, noop, pipe, remove, getPath, setPath, Observable as ObservableStream, postpad } from '../../fn/fn.js'
import { isTextNode }   from '../../dom/dom.js';
import { parsePipe }    from './parse.js';
import { transformers } from './transforms.js';
import { cue, uncue }   from './timer.js';

const DEBUG      = false;
const assign     = Object.assign;


// Transforms

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


// Struct pool

const structs      = [];
const removeStruct = remove(structs);
const addStruct    = (struct) => structs.push(struct);


// Struct

function fireStruct() {
	const struct = this;

	Struct.prototype.fire.apply(this);

	this.input.on('push', function() {
		// If this is a value we want to pause updates while the input
		// is being used. Check whether it's focused.
		if (struct.data.name === "value" && struct.node === document.activeElement) {
			return;
		}

		//if (struct.status === 'paused') { return; }
		cue(struct);
	});

	delete this.fire;
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
	render:    noop,
	transform: id,

	stop: function stop() {
		//console.log('STRUCT STOP', this.token);

		this.unbind();
		uncue(this);
		this.unobserveMutations && this.unobserveMutations();
		removeStruct(this);

		this.stop   = noop;
		this.status = 'done';
	},

	start: function() {
		// Todo: We need rid of the leading '|' in struct.pipe
		this.transform = this.pipe ? parsePipe(this.pipe.slice(1)) : id ;
		this.originalValue = this.read ? this.read() : '' ;
		this.start  = noop;
		this.status = 'active';

		// If this is a value we want to pause updates while the input is being
		// used.
		//if (this.data.name === 'value') {
		//	this.node.addEventListener('mousedown', function(e) {
		//		struct.status = 'paused';
		//	});
		//
		//	this.node.addEventListener('mouseup', function(e) {
		//		struct.status = 'active';
		//	});
		//}

		if (DEBUG) { console.log('start: ', this.token, this.originalValue); }
	},

	bind: function(scope) {
		this.input = ObservableStream(this.path, scope).latest();
		this.scope = scope;
		this.fire  = fireStruct;
		cue(this);
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

	fire: function() {
		//console.log('STRUCT UPDATE', this.token);

		var transform = this.transform;

		// Does this give us null for non-values? Surely it doesnt spit out undefined.
		var value = this.input && this.input.shift();

		if (DEBUG) { console.log('update:', this.token, value, this.originalValue); }

		//try {
		if (value === undefined) {
			this.render(this.renderedValue || this.originalValue);
		}
		else if (value === null) {
			this.render(value);
		}
		else {
			this.renderedValue = transform(value);
			this.render(this.renderedValue);
		}
		//}
		//catch(e) {
		//	console.log('%cSparky%c Error rendering ' + this.token + ' in', 'color: #a3b31f; font-weight: 600;', 'color: #d34515; font-weight: 300;', isTextNode(this.node) ? this.node.parentNode : this.node);
		//	console.error(e);
		//}
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

function observeMutations(node, fn) {
	// Todo: This is only here to observe mutations to the content of select
	// nodes. Is there a better, internal, way to do it?
	var observer = new MutationObserver(fn);
	observer.observe(node, { childList: true });
	return function unobserveMutations() {
		observer.disconnect();
	};
}

export function ReadableStruct(node, token, path, render, pipe, data, type, read) {
	// ReadableStruct extends Struct
	Struct.call(this, node, token, path, render, pipe, data);
	this.type = type;
	this.read = read;

	var struct = this;

	if (node.tagName.toLowerCase() === 'select') {
		this.unobserveMutations = observeMutations(node, function() {
			cue(struct);
		});
	}
}

function fireReadable() {
	const struct = this;

	ReadableStruct.prototype.fire.apply(this);

	this.input.on('push', function() {
		cue(struct);
	});

	var value = getPath(this.path, this.scope);

	// Where the initial value of struct.path is not set, set it to
	// the value of the <input/>.
	if (value === undefined) {
		this.change();
	}

	delete this.fire;
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
		this.input  = ObservableStream(this.path, scope).latest();
		this.scope  = scope;
		this.change = listen(this, scope, options);
		this.fire   = fireReadable;
		cue(this);
		this.listen(this.change);
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
