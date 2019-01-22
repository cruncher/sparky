
import { choose, get, isDefined, nothing, noop, overload, Observable as ObservableStream, observe } from '../../fn/fn.js';
import { attribute, classes, tag, trigger } from '../../dom/dom.js';
import toRenderString from './render.js';
import Struct, { ReadableStruct } from './struct.js';
import BooleanRenderer from './renderer.boolean.js';
import ClassRenderer   from './renderer.class.js';
import StringRenderer  from './renderer.string.js';
import { cue } from './timer.js';
import bindings from './bindings.js';

const DEBUG      = false;//true;

const A          = Array.prototype;
const assign     = Object.assign;

// Matches tags plus any directly adjacent text
//var rclasstagstemplate = /[^\s]*{{0}}[^\}]+{{1}}[^\s]*/g;
//var rclasstags;

// Matches anything with a space
const rspaces = /\s+/;

// Matches empty or spaces-only string
const rempty  = /^\s*$/;

// Matches anything that contains a non-space character
const rtext = /\S/;

const settings = {
	attributePrefix: 'sparky-',
	mount:           noop,
	parse:           noop,
	transforms:      {},
	transformers:    {},
	rtoken:          /(\{\[)\s*(.*?)(?:\s*(\|.*?))?\s*(\]\})/g
};

const push = (value, pushable) => {
	pushable.push(value);
	return value;
};

// Struct value read and write

function writeValue(value) {
	var node = this.node;

	// Avoid updating with the same value as it sends the cursor to
	// the end of the field (in Chrome, at least).
	if (value === node.value) { return; }

	node.value = typeof value === 'string' ?
		value :
		'' ;

	// Trigger validation
	trigger('dom-update', node);
}

function writeValueNumber(value) {
	var node = this.node;

	// Avoid updating with the same value as it sends the cursor to
	// the end of the field (in Chrome, at least).
	if (value === parseFloat(node.value)) { return; }

	node.value = typeof value === 'number' && !Number.isNaN(value) ?
		value :
		'' ;

	// Trigger validation
	trigger('dom-update', node);
}

function writeValueRadioCheckbox(value) {
	var node = this.node;

	// Where value is defined check against it, otherwise
	// value is "on", uselessly. Set checked state directly.
	node.checked = isDefined(node.getAttribute('value')) ?
		value === node.value :
		value === true ;

	// Trigger validation
	trigger('dom-update', node);
}

function readValue() {
	var node = this.node;
	return node.value;
}

function readValueNumber() {
	var node = this.node;
	return node.value ? parseFloat(node.value) : undefined ;
}

function readValueCheckbox() {
	var node = this.node;

	// TODO: Why do we check attribute here?
	return isDefined(node.getAttribute('value')) ?
		node.checked ? node.value : undefined :
		node.checked ;
}

function readValueRadio() {
	var node = this.node;

	if (!node.checked) { return; }

	return isDefined(node.getAttribute('value')) ?
		node.value :
		node.checked ;
}


// Mount

const cased = {
	viewbox: 'viewBox'
};

const getType = get('type');


function addClasses(classList, text) {
	var classes = toRenderString(text).trim().split(rspaces);
	classList.add.apply(classList, classes);
}

function removeClasses(classList, text) {
	var classes = toRenderString(text).trim().split(rspaces);
	classList.remove.apply(classList, classes);
}

function matchToken(string, options) {
	var rtoken = options.rtoken;
	rtoken.lastIndex = 0;
	return rtoken.exec(string);
}

function writeProperty(name, node, value) {
	node[name] = value;
}

function writeAttribute(name, node, value) {
	node.setAttribute(cased[name] || name, value);
}

function writeBooleanAttr(name, node, value) {
	if (value) {
		node.setAttribute(name, name);
	}
	else {
		node.removeAttribute(name);
	}
}

function mountString(source, render, options) {
	if (!source) { return; }

	const renderer = new StringRenderer(source, render);

	// We are reduced to checking for push as constructor cant return
	// undefined. Todo: turn StringRenderer into a factory function rather
	// than a constructor so it can return undefined.
	if (!renderer.push) { return; }

	options.renderers.push(renderer);
}

function mountAttribute(name, node, options, prefixed) {
	name = cased[name] || name;
	var source = prefixed !== false
		&& node.getAttribute(options.attributePrefix + name)
		|| node.getAttribute(name) ;

	return mountString(source, (string) => node.setAttribute(cased[name] || name, string), options);
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
		(bool) => {
			node[name] = bool ;
		} :
		(bool) => {
			bool ?
				node.setAttribute(name, '') :
				node.removeAttribute(name) ;
		} ;

	const renderer = new BooleanRenderer(source, render);

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
	var string = attribute(options.attributePrefix + 'value', node)
		|| attribute('value', node) ;

	var match = matchToken(string, options);

	if (!match) { return; }

	// createStruct(node, token, path, render, pipe, type, read)
	options.createStruct(node, match[0], match[2], writeValueNumber, match[3], undefined, 'input', readValueNumber);
}

function mountValueString(node, options) {
	var string = attribute(options.attributePrefix + 'value', node)
		|| attribute('value', node) ;
	var match = matchToken(string, options);
	if (!match) { return; }

	// createStruct(node, token, path, render, pipe, type, read)
	options.createStruct(node, match[0], match[2], writeValue, match[3], undefined, 'input', readValue);
}

function mountValueCheckbox(node, options) {
	var string = attribute(options.attributePrefix + 'value', node);
	var match  = matchToken(string, options);
	if (!match) { return; }

	// createStruct(node, token, path, render, pipe, type, read)
	options.createStruct(node, match[0], match[2], writeValueRadioCheckbox, match[3], undefined, 'change', readValueCheckbox);
}

function mountValueRadio(node, options) {
	var string = attribute(options.attributePrefix + 'value', node);
	var match  = matchToken(string, options);
	if (!match) { return; }

	// createStruct(node, token, path, render, pipe, type, read)
	options.createStruct(node, match[0], match[2], writeValueRadioCheckbox, match[3], undefined, 'change', readValueRadio);
}

function mountInput(types, node, options) {
	var type    = getType(node);
	var setting = types[type] || types.default;

	if (setting) {
		if (setting.booleans)   { mountBooleans(setting.booleans, node, options); }
		if (setting.attributes) { mountAttributes(setting.attributes, node, options); }
		if (setting.value) {
			if (setting.value === 'radio' || setting.value === 'checkbox') {
				mountAttribute('value', node, options, false);
			}

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
	let n = -1;
	let child;

	while ((child = children[++n])) {
		//struct = options.mount(child, options);
		//if (struct) {
		//	structs.push(struct);
		//}
		//else {
			mountNode(child, options, structs) ;
		//}
	}
}

const mountValue = choose({
	string:   mountValueString,
	number:   mountValueNumber,
	checkbox: mountValueCheckbox,
	radio:    mountValueRadio
});

const mountNode  = overload(get('nodeType'), {
	// element
	1: function mountElement(node, options, structs) {
		const sparky = options.mount(node, options);
		if (sparky) {
			options.renderers.push(sparky);
			return;
		}

		// Get an immutable list of children. Remember node.childNodes is
		// dynamic, and we don't want to mount elements that may be dynamically
		// inserted later by other sparky processes, so turn childNodes into
		// an array.
		mountCollection(Array.from(node.childNodes), options, structs);
		mountClass(node, options);
		mountBooleans(bindings.default.booleans, node, options);
		mountAttributes(bindings.default.attributes, node, options);
		mountTag(bindings, node, options);
	},

	// text
	3: function mountText(node, options) {
		mountString(node.nodeValue, (string) => node.nodeValue = string, options);
	},

	// comment
	8: noop,

	// document
	9: function mountDocument(node, options, structs) {
		mountCollection(A.slice.apply(node.childNodes), options, structs);
	},

	// doctype
	10: noop,

	// fragment
	11: function mountFragment(node, options, structs) {
		mountCollection(A.slice.apply(node.childNodes), options, structs);
	},

	// array or array-like
	default: function mountArray(collection, options) {
		if (typeof collection.length !== 'number') {
			throw new Error('Cannot mount object. It is neither a node nor a collection.', collection);
		}

		mountCollection(collection, options);
	}
});

export { bindings as settings };

export default function mount(node, overrides) {
	if (DEBUG) { console.groupCollapsed('mount: ', node); }

	var structs = [];
	var options = assign({}, settings, overrides);
	var old;

	options.createStruct = function createStruct(node, token, path, render, pipe, data, type, read) {
		const struct = (
			overrides && overrides.createStruct && overrides.createStruct(node, token, path, render, pipe, data, type, read)
		) || (
			type ?
				new ReadableStruct(node, token, path, render, pipe, data, type, read) :
				new Struct(node, token, path, render, pipe, data)
		);

		structs.push(struct);

		// If structs have already been started, start this one too
		if (old) {
			struct.reset && struct.reset(options);
			struct.bind(old, options);
		}

		return struct;
	};

	// Renderers is the new hotness. We should be able to replace structs
	// entirely with renderers.
	const renderers = options.renderers = [];

	mountNode(node, options, structs);

	if (DEBUG) {
		console.groupEnd();
		console.table(structs, ['token']);
	}

	// Return a read-only stream-like
	return {
		stop: function stop() {
			structs.forEach(function(struct) {
				struct.stop();
			});

			renderers.forEach((renderer) => renderer.stop());
		},

		push: function(scope) {
			// Render scoped attributes before any value bindings
			renderers.reduce(push, scope);

			//if (DEBUG) { console.log('mount: push(scope)', scope); }
			if (old === scope) { return; }
			old = scope;

			// Setup structs on the first scope push, unbind them on
			// later pushes with reset()
			structs.forEach(function(struct) {
				struct.reset(options);
			});

			structs.forEach(function(struct) {
				struct.bind(scope, options);
			});
		}
	};
}

// Expose a way to get scopes from node for event delegation and debugging

mount.getScope = function getScope(node) {
	var scope = Struct.findScope(node);
	return scope === undefined && node.parentNode ?
		getScope(node.parentNode) :
		scope ;
};
