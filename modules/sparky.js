import { Observer, Stream, capture, observe } from '../../fn/fn.js';
import Struct from './struct.js';
import importTemplate from './import-template.js';
import { parseParams as captureParams } from './parse.js';
import mount, { mountAttribute } from './mount.js';
import fns from './fn.js';

const DEBUG = true;

const assign = Object.assign;

const defaults = {
    attributeFn: 'fn',
    attributeTemplate: 'template',
    functions: fns
};

const captureFn = capture(/^\s*([\w-]+)\s*(:)?/, {
    1: function(output, tokens) {
        output.name = tokens[1];
        return output;
    },

    2: function(output, tokens) {
        output.params = captureParams([], tokens);
        return output;
    },

    close: function(output, tokens) {
        // Capture exposes consumed index as .consumed
        output.remainingString = tokens.input.slice(tokens[0].length + (tokens.consumed || 0));
        return output;
    }
});


function toObserverOrSelf(object) {
    return Observer(object) || object;
}

function firstRenderTemplate(target, content) {
    // Wait for target to be put in the DOM
    // Todo: only really needed to support fn each with templates...
    // Can we make each better?
    //Promise.resolve()
    //.then(function() {
        target.before(content);
        target.remove();
    //});
}

function firstRenderElement(target, content) {
    target.innerHTML = '';
    target.appendChild(content);
}

function run(context, node, input, attr, config) {
    let result;

    while(input && attr && (result = captureFn({}, attr))) {
        // Find the Sparky function by name
        const fn = config.functions[result.name];
        if (!fn) { throw new Error('Sparky fn "' + result.name + '" not found.'); }

        attr = result.remainingString;
        config.fn = attr;

        // Return values from Sparky functions mean -
        // stream    - use the new input stream
        // undefined - use the same input streeam
        // false     - stop processing this node
        const output = fn.call(context, node, input, result.params, config);
        input = output === undefined ? input : output ;

        // Keep the config object sane. This is a precaution aginst
        // this config object ending up being used elsewhere
        config.fn = '';
    }

    return input;
}

function mountContent(content, config) {
    const settings = {
        mount: function(node, options) {
            // This is a half-assed way of preventing the root node of this
            // sparky from being remounted.
            if (node === content) { return; }

            // Does the node have Sparkyfiable attributes?
            const fns = node.getAttribute(config.attributeFn);
            const src = node.getAttribute(config.attributeTemplate);
            if (!fns && !src) { return; }

            var sparky = Sparky(node, assign({
                fn: fns,
                createStruct: function(node, token, path, render, pipe, data, type, read) {
                    if (!/^\.\./.test(path)) { return; }

                    path = path.slice(2);
                    const struct = options.createStruct(node, token, path, render, pipe, data, type, read);

                    return {
                        stop: function() {
                            struct.stop();
                        }
                    };
                }
            }, config));

            // This is just some help for logging mounted tags
            sparky.token = fns;
            sparky.path  = '';

            // Return a writeable stream. A write stream
            // must have the methods .push() and .stop()
            // A sparky is a write stream.
            return sparky;
        }
    };

    // TEMP: Find a better way to pass these in
    //settings.attributePrefix = Sparky.attributePrefix;
    //settings.transforms      = Sparky.transforms;
    //settings.transformers    = Sparky.transformers;
    //options && (settings.createStruct = options.createStruct);

    // Launch rendering
    return mount(content, settings);
}

function setupTarget(target, input, fn, config) {
    const structs = [];
    const firstRender = target.content || target.tagName.toLowerCase() === 'render' ?
        firstRenderTemplate :
        firstRenderElement ;

    input = run(null, target, input, fn, config);
    if (!input) { return; }

    let renderer;

    // Mount the target src attribute with an overidden render fn
    mountAttribute(config.attributeTemplate, target, {
        createStruct: function(node, token, path, render, pipe, data) {
            const struct = new Struct(node, token, path, (src) => {
                renderer = setupSrc(target, src, input, firstRender, config);
            }, pipe, data);
            structs.push(struct);
            return struct;
        }
    });

    // If src attribute is not dependent on scope, render the
    // target right away
    if (!structs.length) {
        return setupSrc(target, target.getAttribute(config.attributeTemplate), input, firstRender, config);
    }
    else {
        const input2 = Stream.of();

        input.each((scope) => {
            structs.reduce(function push(scope, struct) {
console.log(struct);
                struct.render(scope);
                return scope;
            });

            input2.push(scope);
        });

        input = input2;

        return {
            stop: function() {
                renderer && renderer.stop();
                return this;
            }
        };
    }
}

function setupSrc(target, src, input, onFirstRender, config) {
    const source = document.querySelector(src);

    if (source) {
        return setupSource(target, source, input, onFirstRender, config);
    }

    let stopped;
    let renderer;

    importTemplate(src)
    .then((source) => {
        if (stopped) { return; }
        renderer = setupSource(target, source, input, onFirstRender, config);
    });

    return {
        stop: function() {
            stopped = true;
            renderer && renderer.stop();
        }
    };
}

function setupSource(target, source, input, onFirstRender, config) {
    const fn       = source.getAttribute(config.attributeFn);
    const content  = source.content.cloneNode(true);

    let count = 0;
    let renderer;

    input = run(null, content, input, fn, config);
    if (!input) { return; }

    input.each((scope) => {
        if (!count) {
            renderer = mountContent(content, config);
        }
        renderer.push(scope);
        if (!count) {
            if (DEBUG) {
                console.log('%cSparky %crender', 'color: #a3b31f; font-weight: 600;', 'color: #6894ab; font-weight: 400;', target, document.body.contains(target));
            }
            onFirstRender(target, content);
        }
        ++count;
    });

    return {
        stop: function() {
            renderer && renderer.stop();
        }
    };
}

function setupTemplate(target, input, fn, config) {
    const content = target.content;

    let count = 0;
    let renderer;

    input = run(null, content, input, fn, config);
    if (!input) { return; }

    input.each((scope) => {
        if (!count) {
            renderer = mountContent(content, config);
        }
        renderer.push(scope);
        if (!count) {
            firstRenderTemplate(target, content);
        }
        ++count;
    });
}

function setupElement(target, input, fn, config) {
    let count = 0;
    let renderer;

    input = run(null, target, input, fn, config);
    if (!input) { return; }

    input.each((scope) => {
        if (!count++) {
            renderer = mountContent(target, config);
        }
        renderer.push(scope);
    });
}

export default function Sparky(selector, options) {
    if (!Sparky.prototype.isPrototypeOf(this)) {
        return new Sparky(selector, options);
    }

    const target = typeof selector === 'string' ?
        document.querySelector(selector) :
        selector ;

    const config = assign({}, options, defaults);

    // Todo: replace with a tailored source stream rather than this
    // generic pushable stream - should not be able to push
    const input = Stream.of();
    const fn    = config.fn || target.getAttribute(config.attributeFn) || '';
    const src   = target.getAttribute(config.attributeTemplate) ;

    if (DEBUG) {
        console.log('%cSparky', 'color: #a3b31f; font-weight: 600;', target);
    }

    const renderer = src ? setupTarget(target, input, fn, config) :
        target.content ? setupTemplate(target, input, fn, config) :
        setupElement(target, input, fn, config) ;

    this.render = (object) => {
        input.push(toObserverOrSelf(object));
        return this;
    };

    this.stop = () => {
        renderer && renderer.stop();
        return this;
    };
}

Object.assign(Sparky.prototype, {
    push: function() {
        console.trace('Sparky.push is now Sparky.render');
        return this.render.apply(this, arguments);
    }
});
