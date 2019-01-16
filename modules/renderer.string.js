
import { observe, remove, noop } from '../../fn/fn.js'
import { parseText }    from './parse.js';
import { cue, uncue }   from './timer.js';

const assign         = Object.assign;
const empty          = Object.freeze({});
const renderers      = [];
const removeRenderer = remove(renderers);

function addRenderer(r) {
	renderers.push(r);
}

export default function StringRenderer(source, render, data) {
    this.label  = 'String';
	this.source = source;
	this.tokens = parseText([], source);

	// If there are no dynamic tokens to render, don't return a renderer
	if (this.tokens.length === 0 || (this.tokens.length === 1 && typeof this.tokens[0] === 'string')) {
        return empty;
	}

	this.render = function() {
        this.cued = false;
        const value = this.tokens.join('');

        // Avoid rendering the same value twice
        if (this.valueRendered === value) { return; }

        render(value);
        this.valueRendered = value;
	};

	addRenderer(this);
}

assign(StringRenderer.prototype, {
	push: function(scope) {
		const tokens = this.tokens;
		let n = tokens.length;

		while (n--) {
			const token = tokens[n];

			// Ignore plain strings
			if (typeof token === 'string') { continue; }

            token.unobserve && token.unobserve();
			token.unobserve = observe(token.path, (value) => {
				token.value = value;
				if (this.cued) { return; }
				this.cued = true;
				cue(this);
			}, scope);
		}
	},

    stop: function stop() {
		//console.log('STRUCT STOP', this.token);
		uncue(this);

        const tokens = this.tokens;
		let n = tokens.length;
		while (n--) {
			if (typeof tokens[n] === 'string') { continue; }
            tokens[n].unobserve && tokens[n].unobserve();
		}

		//this.unobserveMutations && this.unobserveMutations();

        removeRenderer(this);

		this.stop = noop;
	}
});
