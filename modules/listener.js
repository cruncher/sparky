
import { getPath, setPath, id, noop, pipe } from '../../fn/fn.js';
import { transformers } from './transforms.js';

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

    object.fn = () => {
        const v1 = object.read(object.node);
        if (v1 === undefined) { return; }
        const v2 = object.transform(v1);
        if (v2 === undefined) { return; }

        console.log('Sparky property set', v2);

        object.set(v2);
    };

    object.node.addEventListener(object.type, object.fn);

    console.log('Listening to', object.type, object.node.type, object.node);

    // Where the initial value of struct.path is not set, set it to
    // the value of the <input/>.
    if (getPath(object.path, object.scope) === undefined) {
        object.fn();
    }
}

export default function Listener(node, read, token, type) {
    this.node = node;
	this.read = read;
    this.path = token.path;
    this.type = type;

    // Delay setup of event listeners, keeping them away from
    // rendering for a short time
    this.timerId = setTimeout(setup, 60, this, token.pipe);
}

Object.assign(Listener.prototype, {
    transform: id,
    set:       noop,

    push: function(scope) {
        this.set = setPath(this.path, scope);
    },

    stop: function() {
        // If we are set uop with a function
        if (this.fn) {
            this.node.removeEventListener(this.type, this.fn);
        }
        // otherwise cancel setup
        else {
            clearTimeout(this.timerId);
        }

        return this;
    }
});
