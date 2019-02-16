
import { choose, get, isDefined, noop, overload } from '../../fn/fn.js';
import { attribute, classes, tag, trigger } from '../../dom/dom.js';
import toRenderString  from './render.js';
import BooleanRenderer from './renderer.boolean.js';
import ClassRenderer   from './renderer.class.js';
import StringRenderer  from './renderer.string.js';
import Listener        from './listener.js';
import bindings        from './bindings.js';

const DEBUG      = false;//true;

const A          = Array.prototype;
const assign     = Object.assign;

// Matches anything with a space
const rspaces = /\s+/;

// Matches anything that contains a non-space character
const rtext = /\S/;

const cased = {
	viewbox: 'viewBox'
};

const settings = {
	attributePrefix: 'sparky-',
	mount:           noop,
	parse:           noop,
	transforms:      {},
	transformers:    {},
	rtoken:          /(\{\[)\s*(.*?)(?:\s*(\|.*?))?\s*(\]\})/g
};


// Helpers

const push = (value, pushable) => {
	pushable.push(value);
	return value;
};

const stop = (object) => object.stop();

const getType = get('type');


// Read

function readValue(node) {
	return node.value;
}

function readValueNumber(node) {
	return node.value && parseFloat(node.value) || undefined;
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

function addClasses(classList, text) {
	var classes = toRenderString(text).trim().split(rspaces);
	classList.add.apply(classList, classes);
}

function removeClasses(classList, text) {
	var classes = toRenderString(text).trim().split(rspaces);
	classList.remove.apply(classList, classes);
}

function renderText(value, node) {
	node.nodeValue = value;
}

function renderAttribute(value, node, name) {
	node.setAttribute(cased[name] || name, value);
}

function renderBooleanAttribute(value, node, name) {
	if (value) {
		node.setAttribute(name, name);
	}
	else {
		node.removeAttribute(name);
	}
}

function renderProperty(value, node, name) {
	node[name] = value;
}

function renderValue(value, node) {
	// Avoid updating with the same value as it sends the cursor to
	// the end of the field (in Chrome, at least).
	if (value === node.value) { return; }

	node.value = typeof value === 'string' ?
		value :
		'' ;

	// Trigger validation
	trigger('dom-update', node);
}

function renderValueNumber(value, node) {
	// Avoid updating with the same value as it sends the cursor to
	// the end of the field (in Chrome, at least).
	if (value === parseFloat(node.value)) { return; }

	node.value = typeof value === 'number' && !Number.isNaN(value) ?
		value :
		'' ;

	// Trigger validation
	trigger('dom-update', node);
}

function renderValueRadioCheckbox(value, node) {
	// Where value is defined check against it, otherwise
	// value is "on", uselessly. Set checked state directly.
	node.checked = isDefined(node.getAttribute('value')) ?
		value === node.value :
		value === true ;

	// Trigger validation
	trigger('dom-update', node);
}


// Mount

function mountString(source, render, options, node, name) {
	if (!source) { return; }

	const renderer = new StringRenderer(source, render, node, name);

	// We are reduced to checking for push as constructor cant return
	// undefined. Todo: turn StringRenderer into a factory function rather
	// than a constructor so it can return undefined?
	if (!renderer.push) { return; }

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

	const render = name in node ?
		renderProperty :
		renderBooleanAttribute ;

	const renderer = new BooleanRenderer(source, render, node, name);

	// We are reduced to checking for push as constructor cant return
	// undefined. Todo: turn BooleanRenderer into a factory function rather
	// than a constructor so it can return undefined.
	if (!renderer.push) { return; }

	options.renderers.push(renderer);

	/* Not sure what for ?
		if (string.length > i) {
			value = string.slice(i);
			if (!rempty.test(value)) {
				values.push(value);
			}
		}
	*/
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
	const source = attribute('class', node);
	if (!source) { return; }

	const list = classes(node);
	const renderer = new ClassRenderer(node, source, (string, current) => {
		current && rtext.test(current) && removeClasses(list, current);
		string && rtext.test(string) && addClasses(list, string);
	});

	// We are reduced to checking for push as constructor cant return
	// undefined. Todo: turn BooleanRenderer into a factory function rather
	// than a constructor so it can return undefined.
	if (!renderer || !renderer.push) { return; }

	options.renderers.push(renderer);
}

function mountValueNumber(node, options) {
	var source = node.getAttribute(options.attributePrefix + 'value') || node.getAttribute('value') ;
	if (!source) { return; }

	const renderer = mountString(source, renderValueNumber, options, node);
	if (!renderer) { return; }

	const listener = new Listener(node, readValueNumber, renderer.tokens[0], 'input');
	if (!listener) { return; }

	options.renderers.push(listener);
}

function mountValueString(node, options) {
	var source = node.getAttribute(options.attributePrefix + 'value') || node.getAttribute('value') ;
	if (!source) { return; }

	const renderer = mountString(source, renderValue, options, node);
	if (!renderer) { return; }

	const listener = new Listener(node, readValue, renderer.tokens[0], 'input');
	if (!listener) { return; }

	options.renderers.push(listener);

	/*
	var struct = this;

	if (node.tagName.toLowerCase() === 'select') {
		this.unobserveMutations = observeMutations(node, function() {
			cue(struct);
		});
	}
    */
}

function mountValueCheckbox(node, options) {
	var sourcePrefixed = node.getAttribute(options.attributePrefix + 'value') ;
	var source         = node.getAttribute('value') ;
	if (!(source || sourcePrefixed)) { return; }

	const renderer = mountString(source || sourcePrefixed, renderValueRadioCheckbox, options, node);
	if (!renderer) { return; }

	const listener = new Listener(node, readValueCheckbox, renderer.tokens[0], 'change');
	if (!listener) { return; }

	options.renderers.push(listener);
}

function mountValueRadio(node, options) {
	var sourcePrefixed = node.getAttribute(options.attributePrefix + 'value') ;
	var source         = node.getAttribute('value') ;
	if (!(source || sourcePrefixed)) { return; }

	const renderer = mountString(source || sourcePrefixed, renderValueRadioCheckbox, options, node);
	if (!renderer) { return; }

	const listener = new Listener(node, readValueRadio, renderer.tokens[0], 'change');
	if (!listener) { return; }

	options.renderers.push(listener);
}

const mountValue = choose({
	string:   mountValueString,
	number:   mountValueNumber,
	checkbox: mountValueCheckbox,
	radio:    mountValueRadio
});

function mountInput(types, node, options) {
	var type    = getType(node);
	var setting = types[type] || types.default;

	if (setting) {
		if (setting.booleans)   { mountBooleans(setting.booleans, node, options); }
		if (setting.attributes) { mountAttributes(setting.attributes, node, options); }
		if (setting.value) {
			mountValue(setting.value, node, options);
		}
	}
}

function mountTag(settings, node, options) {
	var name    = tag(node);
	var setting = settings[name];

	if (!setting) { return; }
	if (setting.booleans) { mountBooleans(setting.booleans, node, options); }
	if (setting.attributes) { mountAttributes(setting.attributes, node, options); }
	if (setting.types) { mountInput(setting.types, node, options); }
	if (setting.value) { mountValue(setting.value, node, options); }
}

function mountCollection(children, options, structs) {
	var n = -1;
	var child;

	while ((child = children[++n])) {
		mountNode(child, options, structs);
	}
}

const mountNode  = overload(get('nodeType'), {
	// element
	1: function mountElement(node, options) {
		const sparky = options.mount(node, options);
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
		mountBooleans(bindings.default.booleans, node, options);
		mountAttributes(bindings.default.attributes, node, options);
		mountTag(bindings, node, options);
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

function Mount(node, options) {
	if (DEBUG) {
		console.groupCollapsed('mount: ', node);
	}

	options = assign({}, settings, options);
	this.renderers = options.renderers = [];
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
		if (this.scope === scope) {
			return this;
		}

		this.scope = scope;
		this.renderers.reduce(push, scope);

		return this;
	}
});

export default function mount(node, options) {
	return new Mount(node, options);
}

export { bindings as settings };
