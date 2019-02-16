function observeMutations(node, fn) {
	var observer = new MutationObserver(fn);
	observer.observe(node, { childList: true });
	return function unobserveMutations() {
		observer.disconnect();
	};
}

export function ReadableStruct(node, token, path, render, pipe, type, read) {
	// ReadableStruct extends Struct
	Struct.call(this, node, token, path, render, pipe);
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








import { rest }       from '../../fn/fn.js';
import Renderer       from './renderer.js';
import { parseText }  from './parse.js';

const assign = Object.assign;
const empty  = Object.freeze({});

export default function StringRenderer(source, fn, data) {
    this.label  = 'String renderer';
    this.fn     = fn;
    this.tokens = parseText([], source);
    this.data   = data;

    // If there are no dynamic tokens to render, don't return a renderer
    if (this.tokens.length === 0 || (this.tokens.length === 1 && typeof this.tokens[0] === 'string')) {
        return empty;
    }
}

assign(StringRenderer.prototype, Renderer.prototype, {
    render: function renderString() {
        Renderer.prototype.render.apply(this, arguments);

        const value = this.tokens.join('');

        // Avoid rendering the same value twice
        if (this.valueRendered === value) { return; }

        this.fn.call(null, value, this.data);
        this.valueRendered = value;
    }
});
