
import Renderer from './renderer.js';

const assign = Object.assign;

export default function StringRenderer(tokens, render, node, name) {
    this.label  = 'String renderer';
    this.render = render;
    this.node   = node;
    this.name   = name;
    this.tokens = tokens;
    this.mutationCount = 0;
}

assign(StringRenderer.prototype, Renderer.prototype, {
    fire: function renderString() {
        Renderer.prototype.fire.apply(this, arguments);

        // Causes token.toString() to be called
        const value = this.tokens.join('');

        // Avoid rendering the same value twice
        if (this.valueRendered === value) { return; }

        // Return DOM mutation count
        this.mutationCount = this.render(this.name, this.node, value);
        this.valueRendered = value;
    }
});
