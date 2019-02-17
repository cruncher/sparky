
import { get, isDefined, noop, overload } from '../../fn/fn.js';
import { tag, trigger } from '../../dom/dom.js';
import { parseToken, parseText, parseBoolean } from './parse.js';
import BooleanRenderer from './renderer.boolean.js';
import ClassRenderer   from './renderer.class.js';
import StringRenderer  from './renderer.string.js';
import ValueRenderer   from './renderer.value.js';
import Listener        from './listener.js';
import config          from './config-mount.js';

const DEBUG      = false;//true;

const A          = Array.prototype;
const assign     = Object.assign;

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


// Read

function readValue(node) {
	return node.value || undefined ;
}

function readValueNumber(node) {
	return node.value ? parseFloat(node.value) : undefined;
}

function readValueCheckbox(node) {
	// TODO: Why do we check attribute here?
	return isDefined(node.getAttribute('value')) ?
		node.checked ? node.value : undefined :
		node.checked ;
}

function readValueRadio(node) {
	if (!node.checked) { return; }

	return isDefined(node.getAttribute('value')) ?
		node.value :
		node.checked ;
}


// Render

function renderText(value, node) {
	node.nodeValue = value;

	// Return DOM mod count
	return 1;
}

function renderAttribute(value, node, name) {
	node.setAttribute(cased[name] || name, value);

	// Return DOM mod count
	return 1;
}

function renderProperty(value, node, name) {
	node[name] = value;

	// Return DOM mod count
	return 1;
}

function renderValue(value, node) {
	// Don't render into focused nodes
	if (document.activeElement === node) { return 0; }

	// Avoid updating with the same value as it sends the cursor to
	// the end of the field (in Chrome, at least).
	if (value === node.value) { return 0; }

	node.value = typeof value === 'string' ?
		value :
		'' ;

	// Trigger validation
	trigger('dom-update', node);

	// Return DOM mod count
	return 1;
}

function renderValueNumber(value, node) {
	// Don't render into focused nodes
	if (document.activeElement === node) { return 0; }

	// Avoid updating with the same value as it sends the cursor to
	// the end of the field (in Chrome, at least).
	if (value === parseFloat(node.value)) { return 0; }

	node.value = typeof value === 'number' && !Number.isNaN(value) ?
		value :
		'' ;

	// Trigger validation
	trigger('dom-update', node);

	// Return DOM mod count
	return 1;
}

function renderValueChecked(value, node) {
	// Where value is defined check against it, otherwise
	// value is "on", uselessly. Set checked state directly.
	node.checked = isDefined(node.getAttribute('value')) ?
		value === node.value :
		value === true ;

	// Trigger validation
	trigger('dom-update', node);

	// Return DOM mod count
	return 1;
}


// Mount

function mountToken(source, render, options, node, name) {
	// Shirtcut empty string
	if (!source) { return; }

	const token = parseToken(null, source);
	if (!token) { return; }

	const renderer = new ValueRenderer(token, render, node, name);
	options.renderers.push(renderer);
	return renderer;
}

function mountString(source, render, options, node, name) {
	// Shirtcut empty string
	if (!source) { return; }

	const tokens = parseText([], source);
	if (!tokens) { return; }

	const renderer = new StringRenderer(tokens, render, node, name);
	options.renderers.push(renderer);
	return renderer;
}

function mountAttribute(name, node, options, prefixed) {
	name = cased[name] || name;
	var source = prefixed !== false
		&& node.getAttribute(options.attributePrefix + name)
		|| node.getAttribute(name) ;

	return mountString(source, renderAttribute, options, node, name);
}

function mountAttributes(names, node, options) {
	var name;
	var n = -1;

	while ((name = names[++n])) {
		mountAttribute(name, node, options);
	}
}

function mountBoolean(name, node, options) {
	// Look for prefixed attributes before attributes.
	//
	// In FF, the disabled attribute is set to the previous value that the
	// element had when the page is refreshed, so it contains no sparky
	// tags. The proper way to address this problem is to set
	// autocomplete="off" on the parent form or on the field.
	const prefixed = node.getAttribute(options.attributePrefix + name);
	const source   = prefixed || node.getAttribute(name);
	if (!source) { return; }

	const tokens = parseBoolean([], source);
	if (!tokens) { return; }

	const renderer = new BooleanRenderer(tokens, node, name);
	options.renderers.push(renderer);
	return renderer;
}

function mountBooleans(names, node, options) {
	var name;
	var n = -1;

	while ((name = names[++n])) {
		mountBoolean(name, node, options);
	}
}

function mountClass(node, options) {
	// Are there classes?
	const source = node.getAttribute('class');
	if (!source) { return; }

	const tokens = parseText([], source);
	if (!tokens) { return; }

	const renderer = new ClassRenderer(tokens, node);
	options.renderers.push(renderer);
}

function mountValueProp(node, options, render, read) {
	var source = node.getAttribute(options.attributePrefix + 'value') || node.getAttribute('value') ;
	if (!source) { return; }

	const renderer = mountToken(source, render, options, node);
	if (!renderer) { return; }

	const listener = new Listener(node, read, renderer.tokens[0], 'input');
	if (!listener) { return; }

	options.renderers.push(listener);
}

function mountValueChecked(node, options, render, read) {
	const source = node.getAttribute('value') ;
	mountString(source, renderProperty, options, node, 'value');

	const sourcePre = node.getAttribute(options.attributePrefix + 'value');
	const renderer = mountToken(sourcePre, render, options, node);
	if (!renderer) { return; }

	const listener = new Listener(node, read, renderer.tokens[0], 'change');
	if (!listener) { return; }

	options.renderers.push(listener);
}

const mountValue = overload(getType, {
	number: function(node, options) {
		return mountValueProp(node, options, renderValueNumber, readValueNumber);
	},

	range: function(node, options) {
		return mountValueProp(node, options, renderValueNumber, readValueNumber);
	},

	checkbox: function(node, options) {
		return mountValueChecked(node, options, renderValueChecked, readValueCheckbox);
	},

	radio: function(node, options) {
		return mountValueChecked(node, options, renderValueChecked, readValueRadio);
	},

	default: function(node, options) {
		return mountValueProp(node, options, renderValue, readValue);
	}
});

function mountInput(types, node, options) {
	var type    = getType(node);
	var setting = types[type] || types.default;

	if (setting) {
		if (setting.booleans)   { mountBooleans(setting.booleans, node, options); }
		if (setting.attributes) { mountAttributes(setting.attributes, node, options); }
		if (setting.value)      { mountValue(node, options); }
	}
}

function mountTag(settings, node, options) {
	var name    = tag(node);
	var setting = settings[name];

	if (!setting) { return; }
	if (setting.booleans)   { mountBooleans(setting.booleans, node, options); }
	if (setting.attributes) { mountAttributes(setting.attributes, node, options); }
	if (setting.types)      { mountInput(setting.types, node, options); }
	if (setting.value)      { mountValue(node, options); }
}

function mountCollection(children, options, structs) {
	var n = -1;
	var child;

	while ((child = children[++n])) {
		mountNode(child, options, structs);
	}
}

const mountNode = overload(getNodeType, {
	// element
	1: function mountElement(node, options) {
		const sparky = options.mount && options.mount(node, options);
		if (sparky) {
			options.renderers.push(sparky);
			return;
		}

		// Get an immutable list of children. Remember node.childNodes is
		// dynamic, and we don't want to mount elements that may be dynamically
		// inserted later by other sparky processes, so turn childNodes into
		// an array.
		mountCollection(Array.from(node.childNodes), options);
		mountClass(node, options);
		mountBooleans(config.default.booleans, node, options);
		mountAttributes(config.default.attributes, node, options);
		mountTag(config, node, options);
	},

	// text
	3: function mountText(node, options) {
		mountString(node.nodeValue, renderText, options, node);
	},

	// comment
	8: noop,

	// document
	9: function mountDocument(node, options) {
		mountCollection(A.slice.apply(node.childNodes), options);
	},

	// doctype
	10: noop,

	// fragment
	11: function mountFragment(node, options) {
		mountCollection(A.slice.apply(node.childNodes), options);
	},

	// array or array-like
	default: function mountArray(collection, options) {
		if (typeof collection.length !== 'number') {
			throw new Error('Cannot mount object. It is neither a node nor a collection.', collection);
		}

		mountCollection(collection, options);
	}
});

export default function Mount(node, options) {
	if (!Mount.prototype.isPrototypeOf(this)) {
        return new Mount(node, options);
    }

	if (DEBUG) {
		console.groupCollapsed('mount: ', node);
	}

	this.renderers = options.renderers = [];
	if (!options.attributePrefix) { options.attributePrefix = ':'; }
	mountNode(node, options);

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
