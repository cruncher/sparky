
import { get, isDefined, noop, overload, pipe } from '../../fn/fn.js';
import { tag, trigger } from '../../dom/dom.js';
import { parseToken, parseText, parseBoolean } from './parse.js';
import BooleanRenderer from './renderer-boolean.js';
import ClassRenderer   from './renderer-class.js';
import StringRenderer  from './renderer-string.js';
import TokenRenderer   from './renderer-token.js';
import Listener        from './listener.js';
import config          from './config-mount.js';
import { transformers, transforms } from './transforms.js';

const DEBUG  = false;//true;

const A      = Array.prototype;
const assign = Object.assign;

const $cache = Symbol('cache');

const cased = {
	viewbox: 'viewBox'
};


// Helpers

const push = (value, pushable) => {
	pushable.push(value);
	return value;
};

const stop = (object) => object.stop();

const getType = get('type');

const getNodeType = get('nodeType');

const types = {
	'number':     'number',
	'range':      'number'
};



// Pipes

// Add a global cache to transforms, soon to be known as pipes
const pipesCache = transforms[$cache] = {};

function getTransform(name) {
    return transformers[name] ?
        transformers[name].tx :
        transforms[name] ;
}

function applyTransform(data, fn) {
	return data.args && data.args.length ?
		// fn is expected to return a fn
		fn.apply(null, data.args) :
		// fn is used directly
		fn ;
}

function createPipe(array, pipes) {
	console.log('D', array, pipes)
    // Cache is dependent on pipes object - a new pipes object
    // results in a new cache
    const localCache = pipes && (pipes[$cache] || (pipes[$cache] = {}));

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
			// Switch the cache, look in local pipes
			cache = localCache;
			fn = pipes[data.name];

			if (!fn) {
				throw new Error('fn ' + data.name + '() not found.');
			}
		}

		return applyTransform(data, fn);
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

function readValueString(node) {
	return node.value || undefined ;
}

function readValueNumber(node) {
	return +(node.value);
}

function readValueCheckbox(node) {
	// Check whether value is defined to determine whether we treat
	// the input as a value matcher or as a boolean
	return isDefined(node.getAttribute('value')) ?
		// Return string or undefined
		node.checked ? node.value : undefined :
		// Return boolean
		node.checked ;
}

function readValueRadio(node) {
	if (!node.checked) { return; }

	return isDefined(node.getAttribute('value')) ?
		// Return value string
		node.value :
		// Return boolean
		node.checked ;
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

function mountToken(source, render, renderers, options, node, name) {
	// Shirtcut empty string
	if (!source) { return; }

	const token = parseToken(options.pipes, source);
	if (!token) { return; }

	// Create transform from pipe
	assignTransform(options.pipes, token);

	const renderer = new TokenRenderer(token, render, node, name);
	renderers.push(renderer);
	return renderer;
}

function mountString(source, render, renderers, options, node, name) {
	// Shortcut empty string
	if (!source) { return; }

	const tokens = parseText([], source);
	if (!tokens) { return; }

	// Create transform from pipe
	tokens.reduce(assignTransform, options.pipes);

	const renderer = new StringRenderer(tokens, render, node, name);
	renderers.push(renderer);
	return renderer;
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

	return mountString(source, renderAttribute, renderers, options, node, name);
}

function mountAttributes(names, node, renderers, options) {
	var name;
	var n = -1;

	while ((name = names[++n])) {
		mountAttribute(name, node, renderers, options);
	}
}

function mountBoolean(name, node, renderers, options) {
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
	renderers.push(renderer);
	return renderer;
}

function mountBooleans(names, node, renderers, options) {
	var name;
	var n = -1;

	while ((name = names[++n])) {
		mountBoolean(name, node, renderers, options);
	}
}

function mountClass(node, renderers, options) {
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
	renderers.push(renderer);
}

function mountValueProp(node, renderers, options, render, read) {
	const prefixed = node.getAttribute(options.attributePrefix + 'value');

	if (prefixed) {
		node.removeAttribute(options.attributePrefix + 'value');
	}

	const source   = prefixed || node.getAttribute('value');
	if (!source) { return; }

	const renderer = mountToken(source, render, renderers, options, node, 'value');
	if (!renderer) { return; }

	const listener = new Listener(node, read, renderer.tokens[0], 'input');
	if (!listener) { return; }

	renderers.push(listener);
}

function mountValueChecked(node, renderers, options, render, read) {
	const source = node.getAttribute('value') ;
	mountString(source, renderProperty, renderers, options, node, 'value');

	const sourcePre = node.getAttribute(options.attributePrefix + 'value');
	const renderer = mountToken(sourcePre, render, renderers, options, node, 'value');
	if (!renderer) { return; }

	const listener = new Listener(node, read, renderer.tokens[0], 'change');
	if (!listener) { return; }

	renderers.push(listener);
}

const mountValue = overload(getType, {
	number: function(node, renderers, options) {
		return mountValueProp(node, renderers, options, renderValue, readValueNumber);
	},

	range: function(node, renderers, options) {
		return mountValueProp(node, renderers, options, renderValue, readValueNumber);
	},

	checkbox: function(node, renderers, options) {
		return mountValueChecked(node, renderers, options, renderChecked, readValueCheckbox);
	},

	radio: function(node, renderers, options) {
		return mountValueChecked(node, renderers, options, renderChecked, readValueRadio);
	},

	default: function(node, renderers, options) {
		return mountValueProp(node, renderers, options, renderValue, readValueString);
	}
});

function mountInput(types, node, renderers, options) {
	var type    = getType(node);
	var setting = types[type] || types.default;

	if (setting) {
		if (setting.booleans)   { mountBooleans(setting.booleans, node, renderers, options); }
		if (setting.attributes) { mountAttributes(setting.attributes, node, renderers, options); }
		if (setting.value)      { mountValue(node, renderers, options); }
	}
}

function mountTag(settings, node, renderers, options) {
	var name    = tag(node);
	var setting = settings[name];

	if (!setting) { return; }
	if (setting.booleans)   { mountBooleans(setting.booleans, node, renderers, options); }
	if (setting.attributes) { mountAttributes(setting.attributes, node, renderers, options); }
	if (setting.types)      { mountInput(setting.types, node, renderers, options); }
	if (setting.value)      { mountValue(node, renderers, options); }
}

function mountCollection(children, renderers, options) {
	var n = -1;
	var child;

	while ((child = children[++n])) {
		mountNode(child, renderers, options);
	}
}

const mountNode = overload(getNodeType, {
	// element
	1: function mountElement(node, renderers, options) {
		const sparky = options.mount && options.mount(node, options);
		if (sparky) {
			renderers.push(sparky);
			return;
		}

		// Get an immutable list of children. Remember node.childNodes is
		// dynamic, and we don't want to mount elements that may be dynamically
		// inserted, so turn childNodes into an array first.
		mountCollection(Array.from(node.childNodes), renderers, options);
		mountClass(node, renderers, options);
		mountBooleans(config.default.booleans, node, renderers, options);
		mountAttributes(config.default.attributes, node, renderers, options);
		mountTag(config, node, renderers, options);
	},

	// text
	3: function mountText(node, renderers, options) {
		mountString(node.nodeValue, renderText, renderers, options, node);
	},

	// comment
	8: noop,

	// document
	9: function mountDocument(node, renderers, options) {
		mountCollection(A.slice.apply(node.childNodes), renderers, options);
	},

	// doctype
	10: noop,

	// fragment
	11: function mountFragment(node, renderers, options) {
		mountCollection(A.slice.apply(node.childNodes), renderers, options);
	},

	// array or array-like
	default: function mountArray(collection, renderers, options) {
		if (typeof collection.length !== 'number') {
			throw new Error('Cannot mount object. It is neither a node nor a collection.', collection);
		}

		mountCollection(collection, renderers, options);
	}
});

export default function Mount(node, options) {
	if (!Mount.prototype.isPrototypeOf(this)) {
        return new Mount(node, options);
    }

	if (DEBUG) {
		console.groupCollapsed('mount: ', node);
	}

	const renderers = this.renderers = [];
	if (!options.attributePrefix) { options.attributePrefix = ':'; }
	mountNode(node, renderers, options);

	if (DEBUG) {
		console.groupEnd();
		console.table(this.renderers, ['token']);
	}
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
	}
});
