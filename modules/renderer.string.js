
import Renderer       from './renderer.js';
import { parseText }  from './parse.js';

const assign = Object.assign;
const empty  = Object.freeze({});

export default function StringRenderer(tokens, fn, node, name) {
    this.label  = 'String renderer';
    this.fn     = fn;
    this.node   = node;
    this.name   = name;
    this.tokens = tokens;
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
