import { Observer, observe, Stream, capture, nothing, noop } from '../../fn/fn.js';
import { create, fragmentFromChildren } from '../../dom/dom.js';
import importTemplate from './import-template.js';
import { parseParams, parseText } from './parse.js';
import config    from './config.js';
import functions from './fn.js';
import mount, { assignTransform } from './mount.js';
import toText from './to-text.js';

// Debug mode is on by default
const DEBUG = window.DEBUG === undefined || window.DEBUG;

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

function valueOf(object) {
    return object.valueOf();
}

function logSparky(attrIs, attrFn, attrInclude) {
    console.log('%cSparky%c'
        + (attrIs ? ' is="' + attrIs + '"' : '')
        + (attrFn ? ' fn="' + attrFn + '"' : '')
        + (attrInclude ? ' include="' + attrInclude + '"' : ''),
        'color: #858720; font-weight: 600;',
        'color: #6894ab; font-weight: 400;'
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

function prepareInput(input, output) {
    const done = input.done;

    // Support promises and functors
    input = output.map ? output.map(toObserverOrSelf) :
        output.then ? output.then(toObserverOrSelf) :
        output ;

    // Transfer done(fn) method if new input doesnt have one
    // A bit dodge, this. Maybe we should insist that output
    // type is a stream.
    if (!input.done) {
        input.done = done;
    }

    return input;
}

function run(context, node, input, options) {
    var result;

    while(input && options.fn && (result = captureFn({}, options.fn))) {
        // Find Sparky function by name, looking in global functions store
        // first, then local options. This order makes it impossible to
        // overwrite built-in fns.
        const fn = functions[result.name]
            || (options.functions && options.functions[result.name]);

        if (!fn) {
            throw new Error(
                'Sparky function "'
                + result.name
                + '" not found mounting node '
                + nodeToString(node)
            );
        }

        options.fn = result.remainingString;

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

        // Output false means stop processing the node
        if (output === false) {
            return false;
        }

        if (output && output !== input) {
            input = prepareInput(input, output);
        }
    }

    return input;
}

function mountContent(content, options) {
    options.mount = function(node, options) {
        // This is a half-assed way of preventing the root node of this
        // sparky from being remounted. Still needed?
        if (node === content) { return; }

        // Does the node have Sparkyfiable attributes?
        options.fn      = node.getAttribute(options.attributeFn) || '';
        options.include = node.getAttribute(options.attributeInclude) || '';

        if (!options.fn && !options.include) { return; }

        // Return a writeable stream. A write stream
        // must have the methods .push() and .stop().
        // Sparky is a write stream.
        return Sparky(node, options);
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
    let prevSrc = null;

    function update(scope) {
        const values = tokens.map(valueOf);

        // Tokens in the include tag MUST evaluate in order that a template
        // may be rendered.
        //
        // If any tokens evaluated to undefined (which can happen frequently
        // because observe is not batched, it will attempt to update() before
        // all tokens have value) we don't want to go looking for a template.
        if (values.indexOf(undefined) !== -1) {
            if (prevSrc !== null) {
                render(null);
                prevSrc = null;
            }

            return;
        }

        // Join the tokens together
        const src = values
        .map(toText)
        .join('');

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
            if (prevSrc !== null) {
                render(null);
                prevSrc = null;
            }

            output = nothing;
            stop = noop;
            return;
        }

        // Push scope to the template renderer
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

        const attrFn = node.getAttribute(config.attributeFn);

        const content =
            // Support templates
            source.content ? source.content.cloneNode(true) :
            // Support SVG elements
            source instanceof SVGElement ? source.cloneNode(true) :
            // Support body elements imported from exernal documents
            fragmentFromChildren(node) ;

        stop = setupInclude(content, attrFn, input, firstRender, config);
    })
    // Swallow errors – unfound templates should not stop the rendering of
    // the rest of the tree – but log them to the console as errors.
    .catch((error) => {
        console.error(error.stack);
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

    return function() {
        renderer && renderer.stop();
    };
}

function setupElement(target, input, options, sparky) {
    const content = target.content;
    var renderer;

    // Support streams and promises
    input[input.each ? 'each' : 'then']((scope) => {
        const init = !renderer;

        renderer = renderer || mountContent(content || target, options);
        renderer.push(scope);

        // If target is a template, replace it
        if (content && init) {
            replace(target, content);

            // Increment mutations for logging
            ++sparky.mutationsCount;
        }
    });

    return function stop() {
        renderer && renderer.stop();
    };
}

function setupTemplate(target, src, input, options, sparky) {
    const nodes = { 0: target };

    return setupTarget(src, input, (content) => {
        // Store node 0
        const node0 = nodes[0];

        // Remove nodes from 1 to last
        var n = 0;
        while (nodes[++n]) {
            nodes[n].remove();
            nodes[n] = undefined;

            // Update count for logging
            ++sparky.mutationsCount;
        }

        // If there is content cache new nodes
        if (content && content.childNodes && content.childNodes.length) {
            assign(nodes, content.childNodes);
        }

        // Otherwise content is a placemarker text node
        else {
            content = nodes[0] = target.content ?
                DEBUG ?
                    create('comment', ' include="' + src + '" ') :
                    create('text', '') :
                target ;
        }

        // Replace child 0, which we avoided doing above to keep it as a
        // position marker in the DOM for exactly this reason this...
        replace(node0, content);

        // Update count for logging
        ++sparky.mutationsCount;
    }, options);
}

function setupSVG(target, src, input, options, sparky) {
    return setupTarget(src, input, (content) => {
        content.removeAttribute('id');
        replace(target, content);
        target = content;

        // Increment muitations for logging
        ++sparky.mutationsCount;
    }, options);
}

export default function Sparky(selector, settings) {
    if (!Sparky.prototype.isPrototypeOf(this)) {
        return new Sparky(selector, settings);
    }

    const target  = typeof selector === 'string' ?
        document.querySelector(selector) :
        selector ;

    const options = assign({}, config, settings);
    const attrFn  = options.fn = options.fn
        || target.getAttribute(options.attributeFn)
        || '';

    const input  = Stream.of().map(toObserverOrSelf);
    const output = run(null, target, input, options);

    var stop = noop;

    this.push = (scope) => {
        input.push(scope);
        return this;
    };

    this.stop = () => {
        input.stop();
        stop();
        return this;
    };

    this.label = 'Sparky';
    this.mutationsCount = 0;

    // If output is false do not go on to parse and mount content
    if (!output) { return; }

    const attrInclude = options.include
        || target.getAttribute(options.attributeInclude)
        || '';

    if (DEBUG) { logSparky(options.is, attrInclude, attrFn); }

    // We have consumed fn and include now, we may blank them before
    // passing them on to the mounter, to protect against them being
    // used again.
    options.fn      = '';
    options.include = '';

    stop = attrInclude ?
        target.tagName === 'use' ?
            setupSVG(target, attrInclude, output, options, this) :
            setupTemplate(target, attrInclude, output, options, this) :
        setupElement(target, output, options, this) ;
}
