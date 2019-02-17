
import { getPath, setPath, id, noop, pipe } from '../../fn/fn.js';
import { transformers } from './transforms.js';

const inputMap  = new WeakMap();
const changeMap = new WeakMap();

function getInvert(name) {
    return transformers[name] && transformers[name].ix;
}

function setup(object, pipeData) {
    //object.timerId = null;

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

    const fn = () => {
        const v1 = object.read(object.node);
        const v2 = object.transform(v1);
        // Allow setting of undefined
        object.set(v2);
    };

    object.fns.set(object.node, fn);

    // Where the initial value at path is not set, set it to
    // the <input> value
    if (getPath(object.path, object.scope) === undefined) {
        fn();
    }
}

export default function Listener(node, read, token, type) {
    this.node = node;
	this.read = read;
    this.path = token.path;
    this.type = type;
    this.fns  = type === 'input' ? inputMap :
        type === 'change' ? changeMap :
        undefined ;

    this.valueOriginal = node.value;

    // Delay setup of event listeners, keeping them away from
    // rendering for a short time
    //this.timerId = setTimeout(setup, 60, this, token.pipe);
    setup(this, token.pipe);
}

Object.assign(Listener.prototype, {
    transform: id,

    set: noop,

    push: function(scope) {
        this.set = setPath(this.path, scope);
        return this;
    },

    stop: function() {
        // If setup has not yet run, cancel it
        //if (this.timerId) {
        //    clearTimeout(this.timerId);
        //    this.timerId = null;
        //    return this;
        //}

        this.fns.delete(this.node);
        return this;
    }
});


// Delegate input and change handlers to the document at the cost of
// one WeakMap lookup

document.addEventListener('input', function(e) {
    const fn = inputMap.get(e.target);
    if (!fn) { return; }
    fn();
});

document.addEventListener('change', function(e) {
    const fn = changeMap.get(e.target);
    if (!fn) { return; }
    fn();
});

document.addEventListener('focusout', function(e) {
    // Changes are not rendered while node is focused,
    // render them on blur
});
