
import Renderer       from './renderer.js';
import { parseText }  from './parse.js';

const assign = Object.assign;
const empty  = Object.freeze({});

export default function StringRenderer(source, fn, node, name) {
    this.label  = 'String renderer';
    this.fn     = fn;
    this.node   = node;
    this.name   = name;
    this.tokens = parseText([], source);

    // If there are no dynamic tokens to render, don't return a renderer
    if (this.tokens.length === 0 || (this.tokens.length === 1 && typeof this.tokens[0] === 'string')) {
        return empty;
    }
}

assign(StringRenderer.prototype, Renderer.prototype, {
    render: function renderString() {
        Renderer.prototype.render.apply(this, arguments);

        // Causes token.toString() to be called
        const value = this.tokens.join('');

        // Avoid rendering the same value twice
        if (this.valueRendered === value) { return; }

        this.fn.call(null, value, this.node, this.name);
        this.valueRendered = value;
    }
});
