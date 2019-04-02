
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

export default function TokenRenderer(token, fn, node, name) {
    this.label  = 'Value renderer';
	this.mutationCount = 0;
    this.fn     = fn;
    this.node   = node;
    this.name   = name;
    this.tokens = [token];

    // Observe mutations to select children, they alter the value of
    // the select, and try to preserve the value if possible
    if (node.tagName.toLowerCase() === 'select') {
		this.unobserveMutations = observeMutations(node, () => {
            if (node.value === this.valueRendered + '') { return; }
            this.valueRendered = undefined;
			cue(this);
		});
	}
}

assign(TokenRenderer.prototype, Renderer.prototype, {
    render: function renderValue() {
        Renderer.prototype.render.apply(this, arguments);

        const token = this.tokens[0];
        const value = token.valueOf();

        // Avoid rendering the same value twice
        if (this.valueRendered === value) { return 0; }
        this.valueRendered = value;

        // Return DOM mutation count
        this.mutationCount = this.fn(this.name, this.node, value);
		return this.mutationCount;
    },

    stop: function stop() {
        Renderer.prototype.stop.apply(this, arguments);
        this.unobserveMutations && this.unobserveMutations();
    }
});
