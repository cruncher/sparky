
import { observe, noop } from '../../fn/fn.js'
import { cue, uncue }   from './timer.js';

export default function Renderer() {
    this.mutationCount = 0;
}

Object.assign(Renderer.prototype, {
    render: function() {
        this.cued = false;
        return this.mutationCount;
    },

    push: function(scope) {
        const tokens = this.tokens;
        let n = tokens.length;

        while (n--) {
            const token = tokens[n];

            // Ignore plain strings
            if (typeof token === 'string') { continue; }

            // Passing in NaN as an initial value to observe() forces the
            // callback to be called immediately. It's a bit tricksy, but this
            // works because even NaN !== NaN.
            token.unobserve && token.unobserve();
            token.unobserve = observe(token.path, (value) => {
                token.value = value;

                // If token has noRender flag set, it is being updated from
                // an input and does not need to be rendered back to the input
                if (token.noRender) { return; }
                if (this.cued) { return; }
                this.cued = true;
                cue(this);
            }, scope, NaN);
        }
    },

    stop: function stop() {
        uncue(this);

        const tokens = this.tokens;
        let n = tokens.length;
        while (n--) {
            tokens[n].unobserve && tokens[n].unobserve();
        }

        this.stop = noop;
    }
});
