
import Renderer         from './renderer.js';
import { parseBoolean } from './parse.js';

const assign = Object.assign;
const empty  = Object.freeze({});

function isTruthy(token) {
	return !!token.valueOf();
}

export default function BooleanRenderer(source, fn, node, name) {
    this.label  = 'Boolean renderer';
	this.fn     = fn;
	this.node   = node;
    this.name   = name;
	this.tokens = parseBoolean([], source);

	// If there are no dynamic tokens to render, don't return a renderer
	if (!this.tokens.length) {
        return empty;
	}
}

assign(BooleanRenderer.prototype, Renderer.prototype, {
    render: function renderBoolean() {
        Renderer.prototype.render.apply(this, arguments);

        const value = !!this.tokens.find(isTruthy);

        // Avoid rendering the same value twice
        if (this.valueRendered === value) { return; }
        this.fn.call(null, value, this.node, this.name);
        this.valueRendered = value;
    }
});
