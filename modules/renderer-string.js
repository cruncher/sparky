
import Renderer from './renderer.js';

const assign = Object.assign;

export default function StringRenderer(tokens, render, node, name) {
    this.label  = 'StringRenderer';
    this.render = render;
    this.node   = node;
    this.name   = name;
    this.tokens = tokens;
    this.renderCount = 0;
}

assign(StringRenderer.prototype, Renderer.prototype, {
    fire: function renderString() {
        Renderer.prototype.fire.apply(this, arguments);

        // Causes token.toString() to be called
        const value = this.tokens.join('');

        // Avoid rendering the same value twice
        if (this.renderedValue === value) { return; }

        // Return DOM mutation count
        this.renderCount += this.render(this.name, this.node, value);
        this.renderedValue = value;
    }
});
