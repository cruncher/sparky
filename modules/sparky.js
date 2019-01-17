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

        config.fn = attrFn = result.remainingString;

        // Return values from Sparky functions mean -
        // stream    - use the new input stream
        // undefined - use the same input streeam
        // false     - stop processing this node
        const output = fn.call(context, node, input, result.params, config);
        input = output === undefined ? input : output ;

        // Keep the config object sane, a precaution aginst
        // this config object ending up being used elsewhere
        config.fn = '';
    }

    return input;
}

var i = 0;

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
            sparky.label = 'Sparky-' + (i++) + ' (mounted)';

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

    return setupSrc(target, src, input, firstRender, config);
}

function setupSrc(target, src, input, firstRender, config) {
    const source = document.querySelector(src);

    if (source) {
        return setupInclude(target, source, input, firstRender, config);
    }

    let stopped;
    let renderer;

    importTemplate(src)
    .then((source) => {
        if (stopped) { return; }
        renderer = setupInclude(target, source, input, firstRender, config);
    })
    .catch(function(error) {
        console.log('%cSparky %ctemplate "'+ src +'" not found. Ignoring.', 'color: #915133; font-weight: 600;', 'color: #d34515; font-weight: 400;');
    });

    let value;

    return function stop() {
        stopped = true;
        renderer && renderer.stop();
    }
}

function setupInclude(target, include, input, firstRender, config) {
    const attrFn  = include.getAttribute(config.attributeFn);
    const content = include.content.cloneNode(true);

    if (attrFn) {
        input = run(null, content, input, attrFn, config);
        if (!input) {
            console.log('Stopped processing include - fn returned false', include);
            return;
        }
    }

    let renderer;

    input.each((scope) => {
        const first = !renderer;
        if (first) { renderer = mountContent(content, config); }
        renderer.push(scope);
        if (first) { firstRender(target, content); }
    });

    if (DEBUG) {
        console.log('%cSparky %cinclude', 'color: #858720; font-weight: 600;', 'color: #6894ab; font-weight: 400;', include.id);
    }

    return function() {
        renderer && renderer.stop();
    };
}

function setupTemplate(target, input, attrFn, config) {
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

function setupTemplateInclude(target, src, input, attrFn, config) {
    const children = assign({}, target.content.childNodes);

    // We assume content to be static, perhaps naively, as the include
    // template is going to overwrite it.
    if (children[0]) {
        replace(target, target.content);
    }

    return setupTarget(children[0] || target, src, input, (target, content) => {
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
    }, attrFn, config);
}

function setupElement(target, input, attrFn, config) {
    let renderer;

    input.each((scope) => {
        renderer = renderer || mountContent(target, config);
        renderer.push(scope);
    });

    return function stop() {
        renderer && renderer.stop();
    };
}

function setupElementInclude(target, src, input, attrFn, config) {
    return setupTarget(target, src, input, (target, content) => {
        target.innerHTML = '';
        target.appendChild(content);
    }, attrFn, config);
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
    const attrFn = config.fn || target.getAttribute(config.attributeFn) || '';
    const output = run(null, target, input, attrFn, config);

    this.push = (scope) => {
        input.push(toObserverOrSelf(scope));
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

    // We have consumed fn and include now, we may blank them, I think
    config.fn      = '';
    config.include = '';

    if (DEBUG) {
        console.log('%cSparky %c'
            + (attrFn ? 'fn "' + attrFn + '" ' : '')
            + (attrInclude ? 'include "' + attrInclude + '"' : ''),
            'color: #858720; font-weight: 600;',
            'color: #6894ab; font-weight: 400;',
            target
        );
    }

    const stop = target.content ?
        attrInclude ?
            setupTemplateInclude(target, attrInclude, output, attrFn, config) :
            setupTemplate(target, output, attrFn, config) :
        attrInclude ?
            setupElementInclude(target, attrInclude, output, attrFn, config) :
            setupElement(target, output, attrFn, config) ;
}
