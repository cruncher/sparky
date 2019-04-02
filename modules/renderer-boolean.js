
import Renderer from './renderer.js';

const assign = Object.assign;

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

export default function BooleanRenderer(tokens, node, name) {
    this.label  = 'Boolean renderer';
	this.node   = node;
    this.name   = name;
	this.tokens = tokens;
	this.render = name in node ?
		renderProperty :
		renderBooleanAttribute ;
	this.mutationCount = 0;
}

assign(BooleanRenderer.prototype, Renderer.prototype, {
    fire: function renderBoolean() {
        Renderer.prototype.fire.apply(this, arguments);

        const value = !!this.tokens.find(isTruthy);

        // Avoid rendering the same value twice
        if (this.valueRendered === value) { return 0; }

		// Return DOM mutation count
        this.mutationCount = this.render(this.name, this.node, value);
		this.valueRendered = value;
    }
});
