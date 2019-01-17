import { Observer, Stream, capture, nothing } from '../../fn/fn.js';
import StringRenderer from './renderer.string.js';
import importTemplate from './import-template.js';
import { parseParams } from './parse.js';
import mount from './mount.js';
import fns from './fn.js';

const DEBUG = true;

const assign = Object.assign;

const defaults = {
    attributeFn:      'fn',
    attributeInclude: 'include',
    functions:        fns
};

const captureFn = capture(/^\s*([\w-]+)\s*(:)?/, {
    1: function(output, tokens) {
        output.name = tokens[1];
        return output;
    },

    2: function(output, tokens) {
        output.params = parseParams([], tokens);
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

function replace(target, content) {
    target.before(content);
    target.remove();
}

function firstRenderElement(target, content) {
    target.innerHTML = '';
    target.appendChild(content);
}

function run(context, node, input, attrFn, config) {
    let result;

    while(input && attrFn && (result = captureFn({}, attrFn))) {
        // Find the Sparky function by name
        const fn = config.functions[result.name];
        if (!fn) { throw new Error('Sparky fn "' + result.name + '" not found.'); }

        config.fns = attrFn = result.remainingString;

        // Return values from Sparky functions mean -
        // stream    - use the new input stream
        // undefined - use the same input streeam
        // false     - stop processing this node
        const output = fn.call(context, node, input, result.params, config);
        input = output === undefined ? input : output ;

        // Keep the config object sane, a precaution aginst
        // this config object ending up being used elsewhere
        config.fns = '';
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
            const src = node.getAttribute(config.attributeInclude);
            if (!fns && !src) { return; }

            var sparky = Sparky(node, assign({
                fns: fns,
                src: src,
                createStruct: function(node, token, path, render, pipe, data, type, read) {
                    if (!/^\.\./.test(path)) { return; }
                    console.log('Do something about this');
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
            sparky.label = 'Sparky';

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

function setupTarget(target, src, input, firstRender, attrFn, config) {
    const renderer = new StringRenderer(src, (string) => {
        console.log('Dynamic include', src);
        setupSrc(target, string, input, firstRender, config)
    });

    // Constructors (StringRenderer) cannot return undefined or null, but
    // returns an empty object if no tags were found. Check for .push().
    if (renderer && renderer.push) {
        input = input.tap((scope) => renderer.push(scope));
        return renderer;
    }

    console.log('Static include', target);
    return setupSrc(target, src, input, firstRender, config);
}

function setupSrc(target, src, input, onFirstRender, config) {
    const source = document.querySelector(src);

    if (source) {
console.log('Include "' + src + '" found in document', input.label);
        return setupInclude(target, source, input, onFirstRender, config);
    }
/*
    let stopped;
    let renderer;

    importTemplate(src)
    .then((source) => {
        if (stopped) { return; }
        renderer = setupInclude(target, source, input, onFirstRender, config);
    })
    .catch(function(error) {
        console.log('%cSparky %ctemplate "'+ src +'" not found. Ignoring.', 'color: #915133; font-weight: 600;', 'color: #d34515; font-weight: 400;');
    });

    let value;

    return {
        push: function(scope) {
            value = scope;
            renderer && renderer.push(scope);
        },

        stop: function() {
            stopped = true;
            renderer && renderer.stop();
        }
    };
*/
}

function setupInclude(target, include, input, firstRender, config) {
    const attrFn  = include.getAttribute(config.attributeFn);
    const content = include.content.cloneNode(true);

    let count = 0;
    let renderer;

    input = run(null, content, input, attrFn, config);
    if (!input) { return; }

    console.log('setupInclude', input);

    input.each((scope) => {
        if (!count) {
            renderer = mountContent(content, config);
        }
        renderer.push(scope);
        if (!count) {
            if (DEBUG) {
                console.log('%cSparky %crender', 'color: #a3b31f; font-weight: 600;', 'color: #6894ab; font-weight: 400;', target, document.body.contains(target));
            }
            firstRender(target, content);
        }
        ++count;
    });

    return {
        stop: function() {
            renderer && renderer.stop();
        }
    };
}

function setupTemplateInclude(target, src, input, attrFn, config) {
    const children = assign({}, target.content.childNodes);

    // We assume content to be static, perhaps naively, as the include
    // template is going to overwrite it.
    if (children[0]) {
        replace(target, target.content);
    }

    return setupTarget(children[0] || target, src, input, (target, content) => {
        // Remove children from 1 up - target may be child 0
        let n = 0;
        while (children[++n]) {
            children[n].remove();
            children[n] = undefined;
        }

        // Assign new children
        assign(children, content.childNodes);

        // Replace target
        replace(target, content);
    }, attrFn, config);
}

function setupTemplate(target, input, attrFn, config) {
    let renderer;
console.log('1 Register consumer', input.label);
    input.each((scope) => {
        const init = !renderer;
        if (init) { renderer = mountContent(target.content, config); }
console.log('1 Consume input:', input.label, renderer, scope);
        renderer.push(scope);
        if (init) { replace(target, target.content); }
    });

    return function stop() {
        renderer && renderer.stop();
    };
}

function setupElement(target, input, attrFn, config) {
    let renderer;
console.log('2 Register consumer', input.label);
    input.each((scope) => {
console.log('2 Consume input:', input.label, scope);
        renderer = renderer || mountContent(target, config);
        renderer.push(scope);
    });

    return function stop() {
        renderer && renderer.stop();
    };
}

function setupElementInclude(target, src, input, attrFn, config) {

    return setupTarget(target, src, input, firstRenderElement, attrFn, config);
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
    const input  = Stream.of();
    input.label = 'root';
    const attrFn = config.fns || target.getAttribute(config.attributeFn) || '';
    const output = run(null, target, input, attrFn, config);

    if (DEBUG) {
        console.log('%cSparky', 'color: #a3b31f; font-weight: 600;', target, output === input ? 'parent scopes' : 'new scopes');
    }

    // If output is false cancel setup
    if (!output) { return; }

    const attrInclude = config.fns || target.getAttribute(config.attributeInclude) || '';
    const stop = target.content ?
        attrInclude ?
            setupTemplateInclude(target, attrInclude, output, attrFn, config) :
            setupTemplate(target, output, attrFn, config) :
        attrInclude ?
            setupElementInclude(target, attrInclude, output, attrFn, config) :
            setupElement(target, output, attrFn, config) ;

    this.render = (object) => {
        input.push(toObserverOrSelf(object));
        return this;
    };

    this.stop = () => {
        stop && stop();
        return this;
    };
}

Object.assign(Sparky.prototype, {
    push: function() {
        console.trace('Sparky.push is now Sparky.render');
        return this.render.apply(this, arguments);
    }
});
