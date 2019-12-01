
import { observe, noop } from '../../fn/module.js'
import { cue, uncue }   from './timer.js';

const assign = Object.assign;

function call(fn) {
    return fn();
}

export default function Renderer() {
    this.renderCount = 0;
}

assign(Renderer.prototype, {
    fire: function() {
        this.cued = false;
    },

    cue: function() {
        if (this.cued) { return; }
        this.cued = true;
        cue(this);
    },

    push: function(scope) {
        const renderer = this;
        const tokens = this.tokens;
        let n = tokens.length;

        while (n--) {
            const token = tokens[n];

            // Ignore plain strings
            if (typeof token === 'string') { continue; }

            token.unobservers && token.unobservers.forEach(call);
            token.unobservers.length = 0;

            // Normally observe() does not fire on undefined initial values.
            // Passing in NaN as an initial value to forces the callback to
            // fire immediately whatever the initial value. It's a bit
            // smelly, but this works because even NaN !== NaN.
            token.unobservers.push(observe(token.path, (value) => {
                token.value = value;

                // If token has noRender flag set, it is being updated from
                // the input and does not need to be rendered back to the input
                if (token.noRender) { return; }
                renderer.cue();
            }, scope, NaN));

            if (token.dynamicParams) {
                token.unobservers.push.apply(token.unobservers, token.dynamicParams.map(function(param) {
                    return observe(param.path, (value) => {
                        param.value = value;
                        if (token.noRender) { return; }
                        renderer.cue();
                    }, scope, NaN);
                }));
            }
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
