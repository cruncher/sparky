
import { choose, get, isDefined, noop, overload, pipe } from '../../fn/module.js';
import { tag, trigger } from '../../dom/module.js';
import { parseToken, parseText, parseBoolean } from './parse.js';
import { transformers, transforms } from './transforms.js';
import BooleanRenderer from './renderer-boolean.js';
import ClassRenderer   from './renderer-class.js';
import StringRenderer  from './renderer-string.js';
import TokenRenderer   from './renderer-token.js';
import Listener        from './listener.js';

const DEBUG = window.DEBUG === true || window.DEBUG === 'Sparky';

const A      = Array.prototype;
const assign = Object.assign;

const $cache = Symbol('cache');

const cased = {
    viewbox: 'viewBox'
};


// Helpers

const getType = get('type');

const getNodeType = get('nodeType');

const types = {
    'number':     'number',
    'range':      'number'
};

function push(value, pushable) {
    pushable.push(value);
    return value;
}

function stop(object) {
    object.stop();
    return object;
}


// Pipes

const pipesCache = transforms[$cache] = {};

function getTransform(name) {
    return transformers[name] ?
        transformers[name].tx :
        transforms[name] ;
}

export function createPipe(array, pipes) {
    // Cache is dependent on pipes object - a new pipes object
    // results in a new cache
    const localCache = pipes
        && (pipes[$cache] || (pipes[$cache] = {}));

    // Cache pipes for reuse by other tokens
    const key = JSON.stringify(array);

    // Check global and local pipes caches
    if (pipesCache[key]) { return pipesCache[key]; }
    if (localCache && localCache[key]) { return localCache[key]; }

    // All a bit dodgy - we cycle over transforms and switch the cache to
    // local cache if a global pipe is not found...
    var cache = pipesCache;
    const fns = array.map((data) => {
        // Look in global pipes first
        var fn = getTransform(data.name);

        if (!fn) {
            if (DEBUG && !pipes) {
                throw new ReferenceError('Template pipe "' + data.name + '" not found.');
            }

            // Switch the cache, look in local pipes
            cache = localCache;
            fn = pipes[data.name];

            if (DEBUG && !fn) {
                throw new ReferenceError('Template pipe "' + data.name + '" not found.');
            }
        }

        // If there are arguments apply them to fn
        return data.args && data.args.length ?
            (value) => fn(...data.args, value) :
            fn ;
    });

    // Cache the result
    return (cache[key] = pipe.apply(null, fns));
}

export function assignTransform(pipes, token) {
    if (token.pipe) {
        token.transform = createPipe(token.pipe, pipes);
    }

    return pipes;
}


// Read

function coerceString(value) {
    // Reject empty strings
    return value || undefined;
}

function coerceNumber(value) {
    // Reject non-number values including NaN
    value = +value;
    return value || value === 0 ? value : undefined ;
}

function readValue(node) {
    // Falsy values other than false or 0 should return undefined,
    // meaning that an empty <input> represents an undefined property
    // on scope.
    const value = node.value;
    return value || value === 0 ? value : undefined ;
}

function readCheckbox(node) {
    // Check whether value is defined to determine whether we treat
    // the input as a value matcher or as a boolean
    return isDefined(node.getAttribute('value')) ?
        // Return string or undefined
        node.checked ? node.value : undefined :
        // Return boolean
        node.checked ;
}

function readRadio(node) {
    if (!node.checked) { return; }

    return isDefined(node.getAttribute('value')) ?
        // Return value string
        node.value :
        // Return boolean
        node.checked ;
}

function readAttributeValue(node) {
    // Get original value from attributes. We cannot read properties here
    // because custom elements do not yet have their properties initialised
    return node.getAttribute('value') || undefined;
}

function readAttributeChecked(node) {
    // Get original value from attributes. We cannot read properties here
    // because custom elements do not yet have their properties initialised
    const value    = node.getAttribute('value');
    const checked  = !!node.getAttribute('checked');
    return value ? value : checked ;
}


// Render

function renderText(name, node, value) {
    node.nodeValue = value;

    // Return DOM mod count
    return 1;
}

function renderAttribute(name, node, value) {
    node.setAttribute(cased[name] || name, value);

    // Return DOM mod count
    return 1;
}

function renderProperty(name, node, value) {
    // Bit of an edge case, but where we have a custom element that has not
    // been upgraded yet, but it gets a property defined on its prototype when
    // it does upgrade, setting the property on the instance now will mask the
    // ultimate get/set definition on the prototype when it does arrive.
    //
    // So don't, if property is not in node. Set the attribute, it will be
    // picked up on upgrade.
    if (name in node) {
        node[name] = value;
    }
    else {
        node.setAttribute(name, value);
    }

    // Return DOM mutation count
    return 1;
}

function renderPropertyBoolean(name, node, value) {
    if (name in node) {
        node[name] = value;
    }
    else if (value) {
        node.setAttribute(name, name);
    }
    else {
        node.removeAttribute(name);
    }

    // Return DOM mutation count
    return 1;
}

function renderValue(name, node, value) {
    // Don't render into focused nodes, it makes the cursor jump to the
    // end of the field, plus we should cede control to the user anyway
    if (document.activeElement === node) {
        return 0;
    }

    value = typeof value === (types[node.type] || 'string') ?
        value :
        null ;

    // Avoid updating with the same value. Support values that are any
    // type as well as values that are always strings
    if (value === node.value || (value + '') === node.value) { return 0; }

    const count = renderProperty('value', node, value);

    // Event hook (validation in dom lib)
    trigger('dom-update', node);

    // Return DOM mod count
    return count;
}

function renderValueNumber(name, node, value) {
    // Don't render into focused nodes, it makes the cursor jump to the
    // end of the field, and we should cede control to the user anyway
    if (document.activeElement === node) { return 0; }

    // Be strict about type, dont render non-numbers
    value = typeof value === 'number' ? value : null ;

    // Avoid updating with the same value. Beware that node.value
    // may be a string (<input>) or number (<range-control>)
    if (value === (node.value === '' ? null : +node.value)) { return 0; }

    const count = renderProperty('value', node, value);

    // Event hook (validation in dom lib)
    trigger('dom-update', node);

    // Return DOM mod count
    return count;
}

function renderChecked(name, node, value) {
    // Where value is defined check against it, otherwise
    // value is "on", uselessly. Set checked state directly.
    const checked = isDefined(node.getAttribute('value')) ?
        value === node.value :
        value === true ;

    if (checked === node.checked) { return 0; }

    const count = renderPropertyBoolean('checked', node, checked);

    // Event hook (validation in dom lib)
    trigger('dom-update', node);

    // Return DOM mod count
    return count;
}


// Mount

function mountToken(source, render, options, node, name) {
    // Shortcut empty string
    if (!source) { return; }

    const token = parseToken(source);
    if (!token) { return; }

    // Create transform from pipe
    assignTransform(options.pipes, token);
    return new TokenRenderer(token, render, node, name);
}

function mountString(source, render, mounter, options, node, name) {
    // Shortcut empty string
    if (!source) { return; }

    const tokens = parseText([], source);
    if (!tokens) { return; }

    // Create transform from pipe
    tokens.reduce(assignTransform, options.pipes);

    const renderer = new StringRenderer(tokens, render, node, name);
    mounter.add(renderer);
}

function mountAttribute(name, node, renderers, options, prefixed) {
    name = cased[name] || name;

    var source = prefixed !== false && node.getAttribute(options.attributePrefix + name);

    if (source) {
        node.removeAttribute(options.attributePrefix + name);
    }
    else {
        source = node.getAttribute(name);
    }

    mountString(source, renderAttribute, renderers, options, node, name);
}

function mountAttributes(names, node, renderers, options) {
    var name;
    var n = -1;

    while ((name = names[++n])) {
        mountAttribute(name, node, renderers, options);
    }
}

function mountBoolean(name, node, mounter, options) {
    // Look for prefixed attributes before attributes.
    //
    // In FF, the disabled attribute is set to the previous value that the
    // element had when the page is refreshed, so it contains no sparky
    // tags. The proper way to address this problem is to set
    // autocomplete="off" on the parent form or on the field.
    const prefixed = node.getAttribute(options.attributePrefix + name);

    if (prefixed) {
        node.removeAttribute(options.attributePrefix + name);
    }

    const source = prefixed || node.getAttribute(name);
    if (!source) { return; }

    const tokens = parseBoolean([], source);
    if (!tokens) { return; }

    // Create transform from pipe
    tokens.reduce(assignTransform, options.pipes);

    const renderer = new BooleanRenderer(tokens, node, name);
    mounter.add(renderer);
}

function mountBooleans(names, node, renderers, options) {
    var name;
    var n = -1;

    while ((name = names[++n])) {
        mountBoolean(name, node, renderers, options);
    }
}

function mountClass(node, mounter, options) {
    const prefixed = node.getAttribute(options.attributePrefix + 'class');

    if (prefixed) {
        node.removeAttribute(options.attributePrefix + 'class');
    }

    // Are there classes?
    const source = prefixed || node.getAttribute('class');
    if (!source) { return; }

    const tokens = parseText([], source);
    if (!tokens) { return; }

    // Create transform from pipe
    tokens.reduce(assignTransform, options.pipes);

    const renderer = new ClassRenderer(tokens, node);
    mounter.add(renderer);
}

function mountValueProp(node, mounter, options, render, eventType, read, readAttribute, coerce) {
    const prefixed = node.getAttribute(options.attributePrefix + 'value');

    if (prefixed) {
        node.removeAttribute(options.attributePrefix + 'value');
    }

    const source   = prefixed || node.getAttribute('value');
    const renderer = mountToken(source, render, options, node, 'value');
    if (!renderer) { return; }

    // Insert a new listener ahead of the renderer so that on first
    // cue the listener populates scope from the input value first
    const listener = new Listener(node, renderer.tokens[0], eventType, read, readAttribute, coerce);
    mounter.add(listener);
    mounter.add(renderer);
}

function mountValueChecked(node, mounter, options, render, read, readAttribute, coerce) {
    const source = node.getAttribute('value') ;
    mountString(source, renderProperty, mounter, options, node, 'value');

    const sourcePre = node.getAttribute(options.attributePrefix + 'value');
    const renderer = mountToken(sourcePre, render, options, node, 'value');
    if (!renderer) { return; }

    // Insert a new listener ahead of the renderer so that on first
    // cue the listener populates scope from the input value first
    const listener = new Listener(node, renderer.tokens[0], 'change', read, readAttribute, coerce);
    mounter.add(listener);
    mounter.add(renderer);
}

const mountValue = choose({
    number: function(node, renderers, options) {
        return mountValueProp(node, renderers, options, renderValueNumber, 'input', readValue, readAttributeValue, coerceNumber);
    },

    range: function(node, renderers, options) {
        return mountValueProp(node, renderers, options, renderValueNumber, 'input', readValue, readAttributeValue, coerceNumber);
    },

    checkbox: function(node, renderers, options) {
        return mountValueChecked(node, renderers, options, renderChecked, readCheckbox, readAttributeChecked);
    },

    radio: function(node, renderers, options) {
        return mountValueChecked(node, renderers, options, renderChecked, readRadio, readAttributeChecked);
    },

    file: function(node, renderers, options) {
        // Safari does not send input events on file inputs
        return mountValueProp(node, renderers, options, renderValue, 'change', readValue, readAttributeValue, coerceString);
    },

    default: function(node, renderers, options) {
        return mountValueProp(node, renderers, options, renderValue, 'input', readValue, readAttributeValue, coerceString);
    }
});

const kinds = {
    text: 'string',
    checkbox: 'checkbox',
    date: 'string',
    number: 'number',
    radio: 'radio',
    range: 'number',
    time: 'string',
    'select-one': 'string',
    'select-multiple': 'array',
    textarea: 'string'
};

function mountTag2(node, name, renderers, options, setting) {
    if (setting.booleans)   { mountBooleans(setting.booleans, node, renderers, options); }
    if (setting.attributes) { mountAttributes(setting.attributes, node, renderers, options); }

    var type = getType(node);
    if (!type) { return; }

    var typeSetting = setting.types && setting.types[type];
    if (typeSetting) {
        if (typeSetting.booleans) { mountBooleans(typeSetting.booleans, node, renderers, options); }
        if (typeSetting.attributes) { mountAttributes(typeSetting.attributes, node, renderers, options); }
    }

    if (kinds[type]) { mountValue(kinds[type], node, renderers, options); }
}

function mountTag(settings, node, name, renderers, options) {
    var setting = settings[name];
    if (!setting) { return; }

    // Custom element names contain a '-', wait until they are upgraded
    if (/-/.test(name)) {
        window
        .customElements
        .whenDefined(name)
        .then(() => {
            mountTag2(node, name, renderers, options, setting);
        });
    }

    // Otherwise mount directly
    else {
        mountTag2(node, name, renderers, options, setting);
    }
}

function mountCollection(children, renderers, options, level) {
    var n = -1;
    var child;

    while ((child = children[++n])) {
        mountNode(child, renderers, options, level);
    }
}

const mountNode = overload(getNodeType, {
    // element
    1: function mountElement(node, mounter, options, level) {
        // Avoid remounting the node we are already trying to mount
        if (level !== 0) {
            const sparky = options.mount && options.mount(node, options);

            if (sparky) {
                mounter.add(sparky);
                return;
            }
        }

        // Ignore SVG <defs>, which we consider as equivalent to the inert
        // content of HTML <template>
        var name = tag(node);
        if (name === 'defs') {
            return;
        }

        // Get an immutable list of children. Remember node.childNodes is
        // dynamic, and we don't want to mount elements that may be dynamically
        // inserted during mounting, so turn childNodes into an array first.
        mountCollection(Array.from(node.childNodes), mounter, options, ++level);
        mountClass(node, mounter, options);

        options.parse.default
        && options.parse.default.booleans
        && mountBooleans(options.parse.default.booleans, node, mounter, options);

        options.parse.default
        && options.parse.default.attributes
        && mountAttributes(options.parse.default.attributes, node, mounter, options);

        mountTag(options.parse, node, name, mounter, options);
    },

    // text
    3: function mountText(node, renderers, options) {
        mountString(node.nodeValue, renderText, renderers, options, node);
    },

    // comment
    8: noop,

    // document
    9: function mountDocument(node, renderers, options, level) {
        mountCollection(A.slice.apply(node.childNodes), renderers, options, ++level);
    },

    // doctype
    10: noop,

    // fragment
    11: function mountFragment(node, renderers, options, level) {
        mountCollection(A.slice.apply(node.childNodes), renderers, options, ++level);
    },

    default: function(node) {
        throw new TypeError('mountNode(node) node is not a mountable Node');
    }
});


/**
Mount(node, options)

`const mount = Mount(node, options);`

A mount is a pushable stream. Push an object of data to render the templated
node on the next animation frame.

```
mount.push(data);
```
*/

export default function Mount(node, options) {
    if (!Mount.prototype.isPrototypeOf(this)) {
        return new Mount(node, options);
    }

    this.renderers = [];

    // mountNode(node, renderers, options, level)
    mountNode(node, this, options, 0);
}

assign(Mount.prototype, {
    stop: function() {
        this.renderers.forEach(stop);
        return this;
    },

    push: function(scope) {
        // Dedup
        if (this.scope === scope) {
            return this;
        }

        // Set new scope
        this.scope = scope;
        this.renderers.reduce(push, scope);
        return this;
    },

    add: function(renderer) {
        this.renderers.push(renderer);
        if (this.scope !== undefined) {
            renderer.push(this.scope);
        }
    }
});
