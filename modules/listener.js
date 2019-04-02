
import { getPath, setPath, id, noop, pipe, Target } from '../../fn/fn.js';
import { transformers } from './transforms.js';
import { cue, uncue }   from './timer.js';

const inputMap  = new WeakMap();
const changeMap = new WeakMap();

function getInvert(name) {
    return transformers[name] && transformers[name].ix;
}

function setup(object, pipeData) {
    if (pipeData) {
        object.transform = pipe.apply(null,
            pipeData
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

    // Define the event handler
    object.fn = () => {
        const value = object.read(object.node);

        // Allow undefined to pass through with no transform
        object.set(value !== undefined ? object.transform(value) : undefined);
    };

    // Add it to the delegate pool
    object.fns.set(object.node, object.fn);
}

export default function Listener(node, read, token, type) {
    this.label = "Listener";
    this.node = node;
	this.read = read;
    this.token = token;
    this.path = token.path;
    this.pipe = token.pipe;
    this.type = type;
    this.fns  = type === 'input' ? inputMap :
        type === 'change' ? changeMap :
        undefined ;

    this.originalValue = node.value;
}

Object.assign(Listener.prototype, {
    transform: id,

    set: noop,

    fire: function() {
        if (!this.fn) {
            setup(this, this.pipe);
        }

        // Test for undefined and if so set value on scope from the current
        // value of the node. Yes, this means the data can change unexpectedly
        // but the alternative are inputs that jump values when their scope
        // is replaced
        if (getPath(this.path, this.scope) === undefined) {
            // A fudgy hack. A hacky fudge.
            this.token.noRender = true;
            this.fn();
            this.token.noRender = false;
        }
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
