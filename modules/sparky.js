import { Observer, observe, Stream, capture, nothing, noop } from '../../fn/fn.js';
import importTemplate from './import-template.js';
import { parseParams, parseText } from './parse.js';
import mount from './mount.js';
import fns from './fn.js';

const DEBUG = false;//true;

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

function logSparky(attrFn, attrInclude, target) {
    console.log('%cSparky%c'
        + (attrFn ? ' fn="' + attrFn + '"' : '')
        + (attrInclude ? ' include="' + attrInclude + '"' : ''),
        'color: #858720; font-weight: 600;',
        'color: #6894ab; font-weight: 400;',
        target
    );
}

function toObserverOrSelf(object) {
    return Observer(object) || object;
}

function replace(target, content) {
    target.before(content);
    target.remove();
}

function run(context, node, input, attrFn, config) {
    let result;

    while(input && attrFn && (result = captureFn({}, attrFn))) {
        // Find the Sparky function by name
        const fn = config.functions[result.name];
        if (!fn) { throw new Error('Sparky fn "' + result.name + '" not found.'); }

        config.fn = attrFn = result.remainingString;

        // Return values from Sparky functions mean -
        // stream    - use the new input stream
        // undefined - use the same input streeam
        // false     - stop processing this node
        const output = fn.call(context, node, input, result.params, config);
        input = output === undefined ? input :
            output === input ? input :
            output && output.map(toObserverOrSelf) ;

        // Keep the config object sane, a precaution aginst
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
            const attrFn      = node.getAttribute(config.attributeFn);
            const attrInclude = node.getAttribute(config.attributeInclude);

            if (!attrFn && !attrInclude) { return; }

            var sparky = Sparky(node, assign({
                fn:      attrFn,
                include: attrInclude,
                createStruct: function(node, token, path, render, pipe, data, type, read) {
                    if (!/^\.\./.test(path)) { return; }
                    console.log('ToDo something about this');
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
            sparky.label = 'Sparky (child)';

            // Return a writeable stream. A write stream
            // must have the methods .push() and .stop()
            // A sparky is a write stream.
            return sparky;
        },

        attributeFn: config.attributeFn,
        attributeInclude: config.attributeInclude,
        createStruct: config.createStruct
    };

    // Launch rendering
    return mount(content, settings);
}

function setupTarget(src, input, render, config) {
    const tokens = parseText([], src);

    // If there are no dynamic tokens to render, return the include
    if (tokens.length === 0 || (tokens.length === 1 && typeof tokens[0] === 'string')) {
        return setupSrc(src, input, render, config);
    }

    let output  = nothing;
    let stop    = noop;
    let prevSrc;

    function update(renderedSrc, scope) {
        output.stop();
        output = Stream.of(scope);
        stop();
        stop = setupSrc(renderedSrc, output, render, config);
    }

    input.each(function(scope) {
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
                token.value = value || null;
                const src = tokens.join('');
                if (src === prevSrc) { return; }
                prevSrc = src;
                update(src, scope);
            }, scope, NaN);
        }
    });

    return () => {
        output.stop();
        stop();
    };
}

function setupSrc(src, input, firstRender, config) {
    // Strip off leading # before running the test
    const source = document.getElementById(src.replace(/^#/, ''));

    if (source) {
        return setupInclude(source, input, firstRender, config);
    }

    let stopped;
    let renderer;

    importTemplate(src)
    .catch(function(error) {
        console.log('%c'+ error.message, 'color: #d34515; font-weight: 400;');
    })
    .then((source) => {
        if (stopped) { return; }
        renderer = setupInclude(source, input, firstRender, config);
    });

    let value;

    return function stop() {
        stopped = true;
        renderer && renderer.stop();
    }
}

function setupInclude(include, input, firstRender, config) {
    const attrFn  = include.getAttribute(config.attributeFn);
    const content = include.content.cloneNode(true);

    if (attrFn) {
        input = run(null, content, input, attrFn, config);

        if (!input) {
            console.log('%cSparky %cstopped include', 'color: #858720; font-weight: 600;', 'color: #6894ab; font-weight: 400;', include.id);
            return noop;
        }
    }

    let renderer;

    input.each((scope) => {
        const first = !renderer;
        if (first) { renderer = mountContent(content, config); }
        renderer.push(scope);
        if (first) { firstRender(content); }
    });

    if (DEBUG) {
        console.log('%cSparky %cinclude', 'color: #858720; font-weight: 600;', 'color: #6894ab; font-weight: 400;', include.id);
    }

    return function() {
        renderer && renderer.stop();
    };
}

function setupElement(target, input, config) {
    let renderer;

    input.each((scope) => {
        renderer = renderer || mountContent(target, config);
        renderer.push(scope);
    });

    return function stop() {
        renderer && renderer.stop();
    };
}

function setupTemplate(target, input, config) {
    let renderer;

    input.each((scope) => {
        const init = !renderer;
        if (init) { renderer = mountContent(target.content, config); }
        renderer.push(scope);
        if (init) { replace(target, target.content); }
    });

    return function stop() {
        renderer && renderer.stop();
    };
}

function setupElementInclude(target, src, input, config) {
    return setupTarget(src, input, (content) => {
        target.innerHTML = '';
        target.appendChild(content);
    }, config);
}

function setupTemplateInclude(target, src, input, config) {
    const children = assign({}, target.content.childNodes);

    // We assume content to be static, perhaps naively, as the include
    // template is going to overwrite it.
    if (children[0]) {
        replace(target, target.content);
        target = children[0];
    }

    return setupTarget(src, input, (content) => {
        // Remove children from 1 up,
        // uncache from 0 up
        let n = -1;
        while (children[++n]) {
            // Ignore n === 0
            if (n) { children[n].remove(); }
            children[n] = undefined;
        }

        // Assign new children
        assign(children, content.childNodes);

        // Replace target, also neatly removes previous children[0],
        // which we avoided doing above to keep it as a position marker in
        // the DOM for this...
        replace(target, content);

        // Update target
        if (!children[0]) { throw new Error('No target, use marker'); }
        target = children[0];
    }, config);
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
    const input  = Stream.of().map(toObserverOrSelf);
    const attrFn = config.fn || target.getAttribute(config.attributeFn) || '';
    const output = run(null, target, input, attrFn, config);

    this.push = (scope) => {
        input.push(scope);
        return this;
    };

    this.stop = () => {
        input.stop();
        stop && stop();
        return this;
    };

    // If output is false do not go on to parse and mount content
    if (!output) { return; }

    const attrInclude = config.include || target.getAttribute(config.attributeInclude) || '';

    // We have consumed fn and include now, we may blank them before
    // passing them on to the mounter
    config.fn      = '';
    config.include = '';

    if (DEBUG) { logSparky(attrFn, attrInclude, target); }

    const stop = target.content ?
        attrInclude ?
            setupTemplateInclude(target, attrInclude, output, config) :
            setupTemplate(target, output, config) :
        attrInclude ?
            setupElementInclude(target, attrInclude, output, config) :
            setupElement(target, output, config) ;
}
