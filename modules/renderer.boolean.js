
import Renderer from './renderer.js';

const assign = Object.assign;

function isTruthy(token) {
	return !!token.valueOf();
}

function renderBooleanAttribute(value, node, name) {
	if (value) {
		node.setAttribute(name, name);
	}
	else {
		node.removeAttribute(name);
	}

	// Return DOM mod count
	return 1;
}

function renderProperty(value, node, name) {
	node[name] = value;

	// Return DOM mod count
	return 1;
}

export default function BooleanRenderer(tokens, node, name) {
    this.label  = 'Boolean renderer';
	this.node   = node;
    this.name   = name;
	this.tokens = tokens;

	this.fn = name in node ?
		renderProperty :
		renderBooleanAttribute ;
}

assign(BooleanRenderer.prototype, Renderer.prototype, {
    render: function renderBoolean() {
        Renderer.prototype.render.apply(this, arguments);

        const value = !!this.tokens.find(isTruthy);

        // Avoid rendering the same value twice
        if (this.valueRendered === value) { return 0; }
		this.valueRendered = value;

		// Return DOM mutation count
        return this.fn.call(null, value, this.node, this.name);
    }
});
