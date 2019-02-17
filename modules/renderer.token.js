
import Renderer from './renderer.js';

const assign = Object.assign;

export default function ValueRenderer(token, fn, node, name) {
    this.label  = 'Token renderer';
    this.fn     = fn;
    this.node   = node;
    this.name   = name;
    this.tokens = [token];
}

assign(ValueRenderer.prototype, Renderer.prototype, {
    render: function renderString() {
        Renderer.prototype.render.apply(this, arguments);

        const token = this.tokens[0];
        const value = token.valueOf();

        // Avoid rendering the same value twice
        if (this.valueRendered === value) { return 0; }
        this.valueRendered = value;

        // Return DOM mutation count
        return this.fn(value, this.node, this.name);
    }
});
