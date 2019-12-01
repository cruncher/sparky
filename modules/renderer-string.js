
import Renderer from './renderer.js';

const assign = Object.assign;

export default function StringRenderer(tokens, render, node, name) {
    Renderer.call(this);

    this.label  = 'StringRenderer';
    this.render = render;
    this.node   = node;
    this.name   = name;
    this.tokens = tokens;
}

assign(StringRenderer.prototype, Renderer.prototype, {
    fire: function renderString() {
        Renderer.prototype.fire.apply(this);

        // Causes token.toString() to be called
        const value = this.tokens.join('');

        // Avoid rendering the same value twice
        if (this.renderedValue === value) { return; }

        // Return DOM mutation count
        this.renderCount += this.render(this.name, this.node, value);
        this.renderedValue = value;
    }
});
