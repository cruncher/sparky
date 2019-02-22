
import Renderer from './renderer.js';

const assign = Object.assign;

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
        if (this.valueRendered === value) { return 0; }
        this.valueRendered = value;

        // Return DOM mutation count
        return this.fn(this.name, this.node, value);
    }
});
