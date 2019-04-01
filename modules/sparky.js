import { Observer, observe, Stream, capture, nothing, noop } from '../../fn/fn.js';
import { fragmentFromChildren } from '../../dom/dom.js';
import importTemplate from './import-template.js';
import { parseParams, parseText } from './parse.js';
import config    from './config.js';
import functions from './fn.js';
import mount, { assignTransform } from './mount.js';
import { create } from '../../dom/dom.js';


const DEBUG = false;//true;

const assign = Object.assign;

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

function logSparky(attrFn, attrInclude, target, desc) {
    console.log('%cSparky%c'
        + (attrFn ? ' fn="' + attrFn + '"' : '')
        + (attrInclude ? ' include="' + attrInclude + '"' : ''),
        'color: #858720; font-weight: 600;',
        'color: #6894ab; font-weight: 400;'/*,
        target,
        desc*/
    );
}

function nodeToString(node) {
    return '<' +
    node.tagName.toLowerCase() +
    (['fn', 'class', 'id', 'include'].reduce((string, name) => {
        const attr = node.getAttribute(name);
        return attr ? string + ' ' + name + '="' + attr + '"' : string ;
    }, '')) +
    '/>';
}

function toObserverOrSelf(object) {
    return Observer(object) || object;
}

function replace(target, content) {
    target.before(content);
    target.remove();
}

function run(context, node, input, attrFn, options) {
    let result;

    while(input && attrFn && (result = captureFn({}, attrFn))) {
        // Find Sparky function by name, looking in global functions store
        // first, then local options. This order makes it impossible to
        // overwrite built-in fns.
        const fn = functions[result.name]
            || options.functions && options.functions[result.name];

        if (!fn) {
            throw new Error(
                'Sparky function "'
                + result.name
                + '" not found mounting node '
                + nodeToString(node)
            );
        }

        options.fn = attrFn = result.remainingString;

        if (fn.settings) {
            // Overwrite functions / pipes
            assign(options, fn.settings);
        }

        // Return values from Sparky functions mean -
        // stream    - use the new input stream
        // promise   - use the promise
        // undefined - use the same input streeam
        // false     - stop processing this node
        const output = fn.call(context, node, input, result.params, options);

        // Keep the options object sane, a hacky precaution aginst
        // this options object ending up being used elsewhere
        options.fn = '';

        if (output === false) {
            input = false;
        }
        else if (output && output !== input) {
            const done = input.done;

            input = output.map ? output.map(toObserverOrSelf) :
                output.then ? output.then(toObserverOrSelf) :
                output ;

            // Transfer done(fn) method if new input doesnt have one
            // A bit dodge, this. Maybe we should insist that output
            // type is a stream.
            if (!input.done) {
                input.done = done;
            }
        }
    }

    return input;
}

function mountContent(content, options) {
    options.mount = function(node, options) {
        // This is a half-assed way of preventing the root node of this
        // sparky from being remounted.
        if (node === content) { return; }

        // Does the node have Sparkyfiable attributes?
        const attrFn      = node.getAttribute(options.attributeFn);
        const attrInclude = node.getAttribute(options.attributeInclude);

        if (!attrFn && !attrInclude) { return; }

        options.fn = attrFn;
        options.include = attrInclude;
        var sparky = Sparky(node, options);

        // This is just some help for logging mounted tags
        sparky.label = 'Sparky (child)';

        // Return a writeable stream. A write stream
        // must have the methods .push() and .stop()
        // A sparky is a write stream.
        return sparky;
    };

    // Launch rendering
    return mount(content, options);
}

function setupTarget(string, input, render, options) {
    // If there are no dynamic tokens to render, return the include
    if (!string) {
        throw new Error('Sparky attribute include cannot be empty');
    }

    const tokens = parseText([], string);

    // If there are no dynamic tokens to render, return the include
    if (!tokens) {
        return setupSrc(string, input, render, options);
    }

    // Create transform from pipe
	tokens.reduce(assignTransform, options.pipes);

    let output  = nothing;
    let stop    = noop;
    let prevSrc;

    function update(scope) {
        const src = tokens.join('');

        // If template path has not changed
        if (src === prevSrc) {
            output.push(scope);
            return;
        }

        prevSrc = src;

        // Stop the previous
        output.stop();
        stop();

        // If include is empty string render nothing
        if (!src) {
            render(null);
            output = nothing;
            stop = noop;
            return;
        }

        output = Stream.of(scope);
        stop = setupSrc(src, output, render, options);
    }

    // Support streams and promises
    input[input.each ? 'each' : 'then'](function(scope) {
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
                token.value = value;
                update(scope);
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
        const attrFn = source.getAttribute(config.attributeFn);
        const content = source.content ? source.content.cloneNode(true) :
            source instanceof SVGElement ? source.cloneNode(true) :
            undefined ;

        return setupInclude(content, attrFn, input, firstRender, config);
    }

    let stopped;
    let stop = noop;

    importTemplate(src)
    .then((node) => {
        if (stopped) { return; }
        const attrFn   = node.getAttribute(config.attributeFn);

        const content =
            // Support templates
            source.content ? source.content.cloneNode(true) :
            // Support SVG elements
            source instanceof SVGElement ? source.cloneNode(true) :
            // Support body elements imported from exernal documents
            fragmentFromChildren(node) ;

        stop = setupInclude(content, attrFn, input, firstRender, config);
    })
    .catch(function(error) {
        console.error(error.message);
    });

    return function() {
        stopped = true;
        stop();
        stop = noop;
    }
}

function setupInclude(content, attrFn, input, firstRender, options) {
    if (attrFn) {
        input = run(null, content, input, attrFn, options);

        if (!input) {
            console.log('%cSparky %cstopped include', 'color: #858720; font-weight: 600;', 'color: #6894ab; font-weight: 400;');
            return noop;
        }
    }

    let renderer;

    // Support streams and promises
    input[input.each ? 'each' : 'then']((scope) => {
        const first = !renderer;
        renderer = renderer || mountContent(content, config);
        renderer.push(scope);
        if (first) { firstRender(content); }
    });

    if (DEBUG) {
        console.log('%cSparky %cinclude', 'color: #858720; font-weight: 600;', 'color: #6894ab; font-weight: 400;');
    }

    return function() {
        renderer && renderer.stop();
    };
}

function setupElement(target, input, options) {
    let renderer;

    // Support streams and promises
    input[input.each ? 'each' : 'then']((scope) => {
        renderer = renderer || mountContent(target, options);
        renderer.push(scope);
    });

    return function stop() {
        renderer && renderer.stop();
    };
}

function setupTemplate(target, input, config) {
    let renderer;

    // Support streams and promises
    input[input.each ? 'each' : 'then']((scope) => {
        const init = !renderer;
        renderer = renderer || mountContent(target.content, config);
        renderer.push(scope);

        if (init) {
            replace(target, target.content);

            // For logging
            ++config.mutations;
        }
    });

    return function stop() {
        renderer && renderer.stop();
    };
}

function setupElementInclude(target, src, input, config) {
    return setupTarget(src, input, (content) => {
        target.innerHTML = '';
        target.appendChild(content);

        // For logging
        config.mutations += 2;
    }, config);
}

function setupTemplateInclude(target, src, input, options) {
    const nodes = { 0: target };

    return setupTarget(src, input, (content) => {
        // Store child 0
        const target = nodes[0];

        // Remove nodes from 1 up
        var n = 0;
        while (nodes[++n]) {
            nodes[n].remove();
            nodes[n] = undefined;

            // For logging
            ++options.mutations;
        }

        // If there is content cache new nodes
        if (content && content.childNodes && content.childNodes.length) {
            assign(nodes, content.childNodes);
        }

        // Otherwise content is a placemarker text node
        else {
            content = nodes[0] = DEBUG ?
                create('comment', ' include="' + src + '" ') :
                create('text', '') ;
        }

        // Replace child 0, which we avoided doing above to keep it as a
        // position marker in the DOM for this...
        replace(target, content);

        // For logging
        ++options.mutations;
    }, options);
}

function setupSVGInclude(target, src, input, config) {
    return setupTarget(src, input, (content) => {
        content.removeAttribute('id');

        // Replace target, also neatly removes previous children[0],
        // which we avoided doing above to keep it as a position marker in
        // the DOM for this...
        replace(target, content);

        // For logging
        ++config.mutations;

        // Update target
        target = content;
    }, config);
}

export default function Sparky(selector, settings) {
    if (!Sparky.prototype.isPrototypeOf(this)) {
        return new Sparky(selector, settings);
    }

    const target = typeof selector === 'string' ?
        document.querySelector(selector) :
        selector ;

    const options = assign({}, config, settings);

    // Todo: replace with a tailored source stream rather than this
    // generic pushable stream - should not be able to push
    const input  = Stream.of().map(toObserverOrSelf);
    const attrFn = options.fn || target.getAttribute(options.attributeFn) || '';
    const output = run(null, target, input, attrFn, options);
    let stop = noop;

    this.mutations = 0;

    this.push = (scope) => {
        input.push(scope);
        return this;
    };

    this.stop = () => {
        input.stop();
        stop();
        return this;
    };

    // If output is false do not go on to parse and mount content
    if (!output) { return; }

    const attrInclude = options.include
        || target.getAttribute(options.attributeInclude)
        || '';

    // We have consumed fn and include now, we may blank them before
    // passing them on to the mounter
    options.fn      = '';
    options.include = '';

    if (DEBUG) {
        logSparky(attrFn, attrInclude, target, target.content ?
            attrInclude ? 'template include' : 'template' :
            attrInclude ? 'element include' : 'element'
        );
    }

    stop = target.content ?
            attrInclude ?
                setupTemplateInclude(target, attrInclude, output, options) :
                setupTemplate(target, output, options) :

        target.tagName === 'use' ?
            attrInclude ?
                setupSVGInclude(target, attrInclude, output, options) :
                setupElement(target, output, options) :

        attrInclude ?
            setupElementInclude(target, attrInclude, output, options) :
            setupElement(target, output, options) ;

    this.mutations = options.mutations;
}
