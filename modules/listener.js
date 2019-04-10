
import { getPath, setPath, id, noop, pipe, Target } from '../../fn/module.js';
import { transformers } from './transforms.js';
import { cue, uncue }   from './timer.js';

const inputMap  = new WeakMap();
const changeMap = new WeakMap();

function getInvert(name) {
    return transformers[name] && transformers[name].ix;
}

function fire() {
    // Test for undefined and if so set value on scope from the current
    // value of the node. Yes, this means the data can change unexpectedly
    // but the alternative is inputs that jump values when their scope
    // is replaced.
    if (getPath(this.path, this.scope) === undefined) {
        // A fudgy hack. A hacky fudge.
        this.token.noRender = true;
        this.fn();
        this.token.noRender = false;
    }
}

export default function Listener(node, token, eventType, read, originalValue, coerce) {
    this.label = "Listener";
    this.node  = node;
    this.token = token;
    this.path  = token.path;
    this.pipe  = token.pipe;
    this.type  = eventType;
    this.renderCount = 0;
    this.read = read;
    this.coerce = coerce || id;
    this.fns   = eventType === 'input' ? inputMap :
        eventType === 'change' ? changeMap :
        undefined ;
    this.originalValue = originalValue;
}

Object.assign(Listener.prototype, {
    transform: id,

    set: noop,

    fire: function() {
        // First render
        if (this.pipe) {
            this.transform = pipe.apply(null,
                this.pipe
                .map((data) => {
                    const fn = getInvert(data.name);
                    if (!fn) { throw new Error('Sparky invert fn ' + data.name + '() not found.'); }
                    return data.args && data.args.length ?
                        fn.apply(null, data.args) :
                        fn ;
                })
                .reverse()
            );
        }

        // Set the original value on the scope
        if (getPath(this.path, this.scope) === undefined && this.originalValue !== undefined) {
            // A fudgy hack. A hacky fudge.
            this.token.noRender = true;
            this.set(this.transform(this.coerce(this.originalValue)));
            this.token.noRender = false;
        }

        // Define the event handler
        this.fn = () => {
            const value = this.coerce(this.read(this.node));
            // Allow undefined to pass through with no transform
            this.set(value !== undefined ? this.transform(value) : undefined);
        };

        // Add it to the delegate pool
        this.fns.set(this.node, this.fn);

        // Handle subsequent renders by replacing this fire method
        this.fire = fire;
    },

    push: function(scope) {
        this.scope = scope;

        if (scope[this.path] && scope[this.path].setValueAtTime) {
            // Its an AudioParam... oooo... eeeuuuhhh...
            this.set = (value) => {
                if (value === undefined) { return; }
                Target(scope)[this.path].setValueAtTime(value, scope.context.currentTime);
            };
        }
        else {
            this.set = setPath(this.path, scope);
        }

        // Wait for values to have been rendered on the next frame
        // before setting up. This is so that min and max and other
        // constraints have had a chance to affect value before it is
        // read and set on scope.
        cue(this);
        return this;
    },

    stop: function() {
        this.fns.delete(this.node);
        return this;
    }
});


// Delegate input and change handlers to the document at the cost of
// one WeakMap lookup

document.addEventListener('input', function(e) {
    const fn = inputMap.get(e.target);
    if (!fn) { return; }
    fn(e.target.value);
});

document.addEventListener('change', function(e) {
    const fn = changeMap.get(e.target);
    if (!fn) { return; }
    fn(e.target.value);
});

document.addEventListener('focusout', function(e) {
    // Todo: Changes are not rendered while node is focused,
    // render them on blur
});
