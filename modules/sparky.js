import { Observer, observe, Stream, capture, nothing } from '../../fn/module.js';
import { before, create, fragmentFromChildren, isFragmentNode } from '../../dom/module.js';
import importTemplate from './import-template.js';
import { parseParams, parseText } from './parse.js';
import config    from './config.js';
import { functions } from './functions.js';
import Mount, { assignTransform } from './mount.js';
import toText from './to-text.js';
import { logNode, nodeToString } from './log.js';
import set from '../../fn/modules/set.js';
import BooleanRenderer from './renderer-boolean.js';

const DEBUG = window.DEBUG === true || window.DEBUG === 'Sparky';

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

function toObserverOrSelf(object) {
    return Observer(object) || object;
}

function replace(target, content) {
    before(target, content);
    //target.before(content);
    target.remove();
}

function prepareInput(input, output) {
    // Support promises and streams
    const stream = output.then ?
        new Stream(function(push, stop) {
            output
            .then(push)
            .catch(stop);
            return { stop };
        }) :
        output ;

    input.done(() => stream.stop());

    // Make sure the next fn gets an observable
    return stream.map(toObserverOrSelf);
}

function run(context, node, input, options) {
    var result;

    while(input && options.fn && (result = captureFn({}, options.fn))) {
        // Find Sparky function by name, looking in global functions
        // first, then local options. This order makes it impossible to
        // overwrite built-in fns.
        const fn = functions[result.name] || (options.functions && options.functions[result.name]);

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
        const output = fn.call(input, node, result.params, options) ;

        // Output false means stop processing the node
        if (output === false) {
            return false;
        }

        // If output is defined and different from input
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

        // Return a writeable stream. A writeable stream
        // must have the methods .push() and .stop().
        // A Sparky() is a write stream.
        return Sparky(node, options);
    };

    // Launch rendering
    return new Mount(content, options);
}

function setupTarget(input, render, options) {
    const src = options.include;

    // If there are no dynamic tokens to render, return the include
    if (!src) {
        throw new Error('Sparky attribute include cannot be empty');
    }

    const tokens = parseText([], src);

    // Reset options.include, it's done its job for now
    options.include = '';

    // If there are no dynamic tokens to render, return the include
    if (!tokens) {
        return setupSrc(src, input, render, options);
    }

    // Create transform from pipe
	tokens.reduce(assignTransform, options.pipes);

    let output  = nothing;
    //let stop    = noop;
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
        //stop();

        // If include is empty string render nothing
        if (!src) {
            if (prevSrc !== null) {
                render(null);
                prevSrc = null;
            }

            output = nothing;
            //stop = noop;
            return;
        }

        // Push scope to the template renderer
        output = Stream.of(scope);
        setupSrc(src, output, render, options);
    }

    input
    .each(function(scope) {
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
    })
    .done(() => {
        output.stop();
        //stop();
    });
}

function setupSrc(src, input, firstRender, options) {
    // Strip off leading # before running the test
    const source = document.getElementById(src.replace(/^#/, ''));

    if (source) {
        const content = source.content ? source.content.cloneNode(true) :
            source instanceof SVGElement ? source.cloneNode(true) :
            undefined ;

        return setupInclude(content, input, firstRender, options);
    }

    importTemplate(src)
    .then((node) => {
        if (input.status === 'done') { return; }

        const content =
            // Support templates
            node.content ? node.content.cloneNode(true) :
            // Support SVG elements
            node instanceof SVGElement ? node.cloneNode(true) :
            // Support body elements imported from exernal documents
            fragmentFromChildren(node) ;

        setupInclude(content, input, firstRender, options);
    })
    // Swallow errors – unfound templates should not stop the rendering of
    // the rest of the tree – but log them to the console as errors.
    .catch((error) => {
        console.error(error.stack);
    });
}

function setupInclude(content, input, firstRender, options) {
    var renderer;

    input.each((scope) => {
        if (renderer) {
            return renderer.push(scope);
        }

        renderer = isFragmentNode(content) ?
            mountContent(content, options) :
            new Sparky(content, options) ;

        input.done(() => renderer.stop());
        renderer.push(scope);
        firstRender(content);
    });
}

function setupElement(target, input, options, sparky) {
    const content = target.content;
    var renderer;

    input.each((scope) => {
        if (renderer) {
            return renderer.push(scope);
        }

        renderer = mountContent(content || target, options);
        input.done(() => renderer.stop());
        renderer.push(scope);

        // If target is a template, replace it
        if (content) {
            replace(target, content);

            // Increment mutations for logging
            ++sparky.renderCount;
        }
    });
}

function setupTemplate(target, input, options, sparky) {
    const src   = options.include;
    const nodes = { 0: target };

    return setupTarget(input, (content) => {
        // Store node 0
        const node0 = nodes[0];

        // Remove nodes from 1 to last
        var n = 0;
        while (nodes[++n]) {
            nodes[n].remove();
            nodes[n] = undefined;

            // Update count for logging
            ++sparky.renderCount;
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
        ++sparky.renderCount;
    }, options);
}

function setupSVG(target, input, options, sparky) {
    return setupTarget(input, (content) => {
        content.removeAttribute('id');

        replace(target, content);
        target = content;

        // Increment mutations for logging
        ++sparky.renderCount;
    }, options);
}

function makeLabel(target, options) {
    return '<'
        + (target.tagName ? target.tagName.toLowerCase() : '')
        + (options.fn ? ' fn="' + options.fn + '">' : '>');
}

/*
Sparky(nodeOrSelector)

Mounts any element as a template and returns a pushable stream. Push an object
to the stream to have it rendered by the template:

```html
<div id="title-div">
    I am {[title]}.
</div>
```
```
import Sparky from '/sparky/module.js';

// Mount the <div>
const sparky = Sparky('#title-div');

// Render it by pushing in an object
sparky.push({ title: 'rendered' });
```

Results in:

```html
<div id="title-div">
    I am rendered.
</div>
```
*/



/*
include()

Templates may include other templates. Define the `include` attribute
as an href to a template:

```html
<template id="i-am-title">
    I am {[title]}.
</template>

<template is="sparky-template" fn="fetch:package.json" include="#i-am-title"></template>

I am Sparky.
```

Templates may be composed of includes:

```html
<template id="i-am-title">
    I am {[title]}.
</template>

<template is="sparky-template" fn="fetch:package.json">
    <template include="#i-am-title"></template>
    <template include="#i-am-title"></template>
</template>

I am Sparky.
I am Sparky.
```
*/

export default function Sparky(selector, settings) {
    if (!Sparky.prototype.isPrototypeOf(this)) {
        return new Sparky(selector, settings);
    }

    const target = typeof selector === 'string' ?
        document.querySelector(selector) :
        selector ;

    const options = assign({}, config, settings);

    // Todo: attrFn is just for logging later on... get rid of, maybe?
    options.fn = options.fn
        || target.getAttribute(options.attributeFn)
        || '';

    // Keep hold of attrFn for debugging
    //if (DEBUG) { var attrFn = options.fn; }

    this.label = makeLabel(target, options);
    this.renderCount = 0;

    const input = Stream.of().map(toObserverOrSelf);
    const output = run(null, target, input, options);

    this.push = function push() {
        input.push(arguments[arguments.length - 1]);
        return this;
    };

    this.stop = function() {
        input.stop();
        return this;
    };

    // If output is false do not go on to parse and mount content,
    // a fn is signalling that it will take over. fn="each" does this,
    // for example, replacing the original node and Sparky with duplicates.
    if (!output) { return; }

    // We have consumed fn lets make sure it's really empty
    options.fn = '';
    options.include = options.include
        || target.getAttribute(options.attributeInclude)
        || '';

    //if (DEBUG) { logNode(target, attrFn, options.include); }

    options.include ?
        target.tagName === 'use' ?
            setupSVG(target, output, options, this) :
        setupTemplate(target, output, options, this) :
    setupElement(target, output, options, this) ;
}
