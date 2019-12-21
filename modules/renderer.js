
import { noop, observe } from '../../fn/module.js'
import { cue, uncue }   from './timer.js';
import { isValue }   from './value.js';

const assign  = Object.assign;

function call(fn) {
    return fn();
}

function observeThing(renderer, token, object, scope, log) {
    // Normally observe() does not fire on undefined initial values.
    // Passing in NaN as an initial value to forces the callback to
    // fire immediately whatever the initial value. It's a bit
    // smelly, but this works because even NaN !== NaN.
    token.unobservers.push(
        observe(object.path, (value) => {
            object.value = value;

            // If token has noRender flag set, it is being updated from
            // the input and does not need to be rendered back to the input
            if (token.noRender) { return; }
            renderer.cue();
        }, scope, NaN)
    );
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
        const tokens = this.tokens;
        let n = tokens.length;

        // Todo: keep a renderer-level cache of paths to avoid creating duplicate observers??
        //if (!renderer.paths) {
        //    renderer.paths = {};
        //}

        while (n--) {
            const token = tokens[n];

            // Ignore plain strings
            if (typeof token === 'string') { continue; }

            // Empty or initialise unobservers
            if (token.unobservers) {
                token.unobservers.forEach(call);
                token.unobservers.length = 0;
            }
            else {
                token.unobservers = [];
            }

            observeThing(this, token, token, scope);

            let p = token.pipe && token.pipe.length;
            while (p--) {
                let args = token.pipe[p].args;
                if (!args.length) { continue; }

                // Look for dynamic value objects
                args = args.filter(isValue);
                if (!args.length) { continue; }

                args.forEach((param) => observeThing(this, token, param, scope, console.log));
            }
        }
    },

    stop: function stop() {
        uncue(this);

        const tokens = this.tokens;
        let n = tokens.length;

        while (n--) {
            const token = tokens[n];

            if (token.unobservers) {
                token.unobservers.forEach(call);
                token.unobservers.length = 0;
            }
        }

        this.stop = noop;
    }
});
