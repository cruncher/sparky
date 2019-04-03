
import Renderer from './renderer.js';
import { cue, uncue }   from './timer.js';

const assign = Object.assign;

function observeMutations(node, fn) {
    var observer = new MutationObserver(fn);
    observer.observe(node, { childList: true });
    return function unobserveMutations() {
        observer.disconnect();
    };
}

export default function TokenRenderer(token, render, node, name) {
    this.label  = 'ValueRenderer';
	this.renderCount = 0;
    this.render = render;
    this.node   = node;
    this.name   = name;
    this.tokens = [token];

    // Observe mutations to select children, they alter the value of
    // the select, and try to preserve the value if possible
    if (node.tagName.toLowerCase() === 'select') {
        this.unobserveMutations = observeMutations(node, () => {
            if (node.value === this.renderedValue + '') { return; }
            this.renderedValue = undefined;
            cue(this);
        });
    }
}

assign(TokenRenderer.prototype, Renderer.prototype, {
    fire: function renderValue() {
        Renderer.prototype.fire.apply(this, arguments);

        const token = this.tokens[0];
        const value = token.valueOf();

        // Avoid rendering the same value twice
        if (this.renderedValue === value) {
            return;
        }

        this.renderCount += this.render(this.name, this.node, value);
        this.renderedValue = value;
    },

    stop: function stop() {
        Renderer.prototype.stop.apply(this, arguments);
        this.unobserveMutations && this.unobserveMutations();
    }
});
