
import Renderer from './renderer.js';

const assign = Object.assign;

function isTruthy(token) {
	return !!token.valueOf();
}

export default function BooleanRenderer(tokens, fn, node, name) {
    this.label  = 'Boolean renderer';
	this.fn     = fn;
	this.node   = node;
    this.name   = name;
	this.tokens = tokens;
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
