
import Renderer      from './renderer.js';

const assign = Object.assign;
const empty  = Object.freeze({});

const partitionByType = (data, token) => {
    data[typeof token].push(token);
    return data;
};

export default function ClassRenderer(node, tokens, fn) {
    this.label  = 'Class renderer';
	this.fn     = fn;
    this.tokens = tokens;

    const data = tokens.reduce(partitionByType, {
        string: [],
        object: []
    });

	// If there are no dynamic tokens to render, don't return a renderer
	if (!data.object.length) {
        return empty;
	}

    this.tokens = data.object;

    // Overwrite the class with just the static text
	node.setAttribute('class', data.string.join(' '));
}

assign(ClassRenderer.prototype, Renderer.prototype, {
    render: function renderBoolean() {
        Renderer.prototype.render.apply(this, arguments);

        const value = this.tokens.join(' ');

        // Avoid rendering the same value twice
        if (this.valueRendered === value) { return; }
        this.fn.call(null, value, this.valueRendered);
        this.valueRendered = value;
    }
});
