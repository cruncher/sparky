import { choose, get, id, isDefined, nothing, noop, overload, set, toType } from '../../fn/fn.js';
import { attribute, classes, tag } from '../../dom/dom.js';
import Struct from './struct.js';

const DEBUG      = false;

const A          = Array.prototype;
const assign     = Object.assign;

const ReadableStruct     = Struct.Readable;
const bind               = Struct.bind;


// Matches tags plus any directly adjacent text
//var rclasstagstemplate = /[^\s]*{{0}}[^\}]+{{1}}[^\s]*/g;
//var rclasstags;

// Matches filter string, capturing (filter name, filter parameter string)
//var rfilter = /\s*([a-zA-Z0-9_\-]+)\s*(?::(.+))?/;

// Matches anything with a space
const rspaces = /\s+/;

// Matches empty or spaces-only string
const rempty  = /^\s*$/;

// Matches anything that contains a non-space character
const rtext = /\S/;

// Matches the arguments list in the result of a fn.toString()
const rarguments = /function(?:\s+\w+)?\s*(\([\w,\s]*\))/;

const settings = {
	attributePrefix: 'sparky-',
	mount:           noop,
	parse:           noop,
	transforms:      {},
	transformers:    {},
	rtoken:          /(\{\[)\s*(.*?)(?:\s*(\|.*?))?\s*(\]\})/g
};

const bindings = {
	// All
	default:  { booleans:   ['hidden'], attributes: ['id', 'title', 'style'] },

	// HTML
	a:        { attributes: ['href'] },
	button:   { booleans:   ['disabled'] },
	form:     { attributes: ['method', 'action'] },
	fieldset: { booleans:   ['disabled'] },
	img:      { attributes: ['alt']	},
	input:    { booleans:   ['disabled', 'required'], attributes: ['name'], types: {
		button:   { attributes: ['value'] },
		checkbox: { booleans: ['checked'], value: 'checkbox' },
		date:     { attributes: ['min', 'max', 'step'], value: 'string' },
		hidden:   { attributes: ['value'] },
		image:    { attributes: ['src'] },
		number:   { attributes: ['min', 'max', 'step'], value: 'number' },
		radio:    { booleans: ['checked'], value: 'radio' },
		range:    { attributes: ['min', 'max', 'step'], value: 'number' },
		reset:    { attributes: ['value'] },
		submit:   { attributes: ['value'] },
		time:     { attributes: ['min', 'max', 'step'], value: 'string' },
		default:  { value: 'string' }
	}},
	label:    { attributes: ['for'] },
	meta:     { attributes: ['content'] },
	meter:    { attributes: ['min', 'max', 'low', 'high', 'value'] },
	option:   { booleans:   ['disabled'], attributes: ['value'] },
	output:   { attributes: ['for'] },
	progress: { attributes: ['max', 'value'] },
	select:   { booleans:   ['disabled', 'required'], attributes: ['name'], value: 'string' },
	textarea: { booleans:   ['disabled', 'required'], attributes: ['name'], value: 'string' },
	time:     { attributes: ['datetime'] },

	// SVG
	svg:      { attributes: ['viewbox'] },
	g:        { attributes: ['transform'] },
	path:     { attributes: ['d', 'transform'] },
	line:     { attributes: ['x1', 'x2', 'y1', 'y2', 'transform'] },
	rect:     { attributes: ['x', 'y', 'width', 'height', 'rx', 'ry', 'transform'] },
	text:     { attributes: ['x', 'y', 'dx', 'dy', 'text-anchor', 'transform'] },
	use:      { attributes: ['href', 'transform'] }
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
}

function writeValueNumber(value) {
	var node = this.node;

	// Avoid updating with the same value as it sends the cursor to
	// the end of the field (in Chrome, at least).
	if (value === parseFloat(node.value)) { return; }

	node.value = typeof value === 'number' && !Number.isNaN(value) ?
		value :
		'' ;
}

function writeValueRadioCheckbox(value) {
	var node = this.node;

	// Where value is defined check against it, otherwise
	// value is "on", uselessly. Set checked state directly.
	node.checked = isDefined(node.getAttribute('value')) ?
		value === node.value :
		value === true ;
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

const toRenderString = overload(toType, {
	'boolean': function(value) {
		return value + '';
	},

	'function': function(value) {
		// Print function and parameters
		return (value.name || 'function')
			+ (rarguments.exec(value.toString()) || [])[1];
	},

	'number': function(value) {
		// Convert NaN to empty string and Infinity to ∞ symbol
		return Number.isNaN(value) ? '' :
			Number.isFinite(value) ? value + '' :
			value < 0 ? '-∞' : '∞';
	},

	'string': id,

	'symbol': function(value) { return value.toString(); },

	'undefined': function() { return ''; },

	'object': function(value) {
		return value ? JSON.stringify(value) : '';
	},

	'default': JSON.stringify
});

function addClasses(classList, text) {
	var classes = toRenderString(text).trim().split(rspaces);
	classList.add.apply(classList, classes);
}

function removeClasses(classList, text) {
	var classes = toRenderString(text).trim().split(rspaces);
	classList.remove.apply(classList, classes);
}

function isTruthy(value) {
	return !!value;
}

function matchToken(string, options) {
	var rtoken = options.rtoken;
	rtoken.lastIndex = 0;
	return rtoken.exec(string);
}

function mountStringToken(node, render, strings, structs, match) {
	var i = strings.length;
	strings.push('');

	// new Struct(node, token, path, render)
	structs.push(new Struct(node, match[0], match[2], function renderText(value) {
		strings[i] = toRenderString(value);
		render(strings);
	}, match[3]));
}

function mountString(node, string, render, options, structs) {
	var rtoken  = options.rtoken;
	var i       = rtoken.lastIndex = 0;
	var match   = rtoken.exec(string);

	if (!match) { return; }

	var strings = [];
	var renderStrings = function(strings) {
		render(strings.join(''));
	};

	while (match) {
		if (match.index > i) {
			strings.push(string.slice(i, match.index));
		}

		mountStringToken(node, renderStrings, strings, structs, match);
		i = rtoken.lastIndex;
		match = rtoken.exec(string);
	}

	if (string.length > i) {
		strings.push(string.slice(i));
	}
}

function mountAttribute(name, node, options, structs, prefixed) {
	name = cased[name] || name;
	var text = prefixed !== false
	&& node.getAttribute(options.attributePrefix + name)
	|| node.getAttribute(name) ;

	return text && mountString(node, text, function render(value) {
		node.setAttribute(cased[name] || name, value);
	}, options, structs);
}

function mountAttributes(names, node, options, structs) {
	var name;

	while (name = names.shift()) {
		mountAttribute(name, node, options, structs);
	}
}

function renderBoolean(name, node) {
	return name in node ?

	// Assume attribute is also a boolean property
	function renderBoolean(values) {
		node[name] = !!values.find(isTruthy);
	} :

	// Attribute is not also a boolean property
	function renderBoolean(values) {
		if (values.find(isTruthy)) {
			node.setAttribute(name, name);
		}
		else {
			node.removeAttribute(name);
		}
	} ;
}

function mountBooleanToken(node, render, values, structs, match) {
	var i = values.length;
	values.push(false);

	structs.push(new Struct(node, match[0], match[2], function(value) {
		values[i] = value;
		render(values);
	}, match[3]));
}

function mountBoolean(name, node, options, structs) {
	// Look for prefixed attributes before attributes.
	//
	// In FF, the disabled attribute is set to the previous value that the
	// element had when the page is refreshed, so it contains no sparky
	// tags. The proper way to address this problem is to set
	// autocomplete="off" on the parent form or on the field.

	var prefixed = node.getAttribute(options.attributePrefix + name);
	var string   = prefixed || node.getAttribute(name);

	// Fast out
	if (!string) { return; }

	var rtoken  = options.rtoken;
	var i       = rtoken.lastIndex = 0;
	var match   = rtoken.exec(string);

	// Fast out
	if (!match) { return; }

	var render = renderBoolean(name, node);

	// Where the unprefixed attribute is populated, Return the property to
	// the default value.
	if (!prefixed) {
		render(nothing);
	}

	var values = [];
	var value;

	while (match) {
		if (match.index > i) {
			value = string.slice(i, match.index);
			if (!rempty.test(value)) {
				values.push(value);
			}
		}

		mountBooleanToken(node, render, values, structs, match);
		i     = rtoken.lastIndex;
		match = rtoken.exec(string);
	}

	if (string.length > i) {
		value = string.slice(i);
		if (!rempty.test(value)) {
			values.push(value);
		}
	}
}

function mountBooleans(names, node, options, structs) {
	var name;

	while (name = names.shift()) {
		mountBoolean(name, node, options, structs);
	}
}

function mountClass(node, options, structs) {
	var rtoken = options.rtoken;
	var attr   = attribute('class', node);

	// If there are no classes, go no further
	if (!attr) { return; }

	var cls = classes(node);

	// Extract the tags and overwrite the class with remaining text
	var text = attr.replace(rtoken, function($0, $1, $2, $3, $4) {
		var prev    = '';

		structs.push(new Struct(node, $0, $2, function render(string) {
			if (prev && rtext.test(prev)) { removeClasses(cls, prev); }
			if (string && rtext.test(string)) { addClasses(cls, string); }
			prev = string;
		}, $3));

		return '';
	});

	node.setAttribute('class', text);
}

function mountValueNumber(node, options, structs) {
	var string = attribute(options.attributePrefix + 'value', node)
		|| attribute('value', node) ;

	var match = matchToken(string, options);

	if (!match) { return; }

	// ReadableStruct(node, token, path, render, type, read, pipe)
	structs.push(new ReadableStruct(node, match[0], match[2], writeValueNumber, 'input', readValueNumber, match[3]));
}

function mountValueString(node, options, structs) {
	var string = attribute(options.attributePrefix + 'value', node)
		|| attribute('value', node) ;
	var match = matchToken(string, options);
	if (!match) { return; }

	// new Struct (node, token, path, render, type, read, pipe)
	structs.push(new ReadableStruct(node, match[0], match[2], writeValue, 'input', readValue, match[3]));
}

function mountValueCheckbox(node, options, structs) {
	var string = attribute(options.attributePrefix + 'value', node);
	var match  = matchToken(string, options);
	if (!match) { return; }

	// new Struct (node, token, path, render, type, read, pipe)
	structs.push(new ReadableStruct(node, match[0], match[2], writeValueRadioCheckbox, 'change', readValueCheckbox, match[3]));
}

function mountValueRadio(node, options, structs) {
	var string = attribute(options.attributePrefix + 'value', node);
	var match  = matchToken(string, options);
	if (!match) { return; }

	// new Struct (node, token, path, render, type, read, pipe)
	structs.push(new ReadableStruct(node, match[0], match[2], writeValueRadioCheckbox, 'change', readValueRadio, match[3]));
}

function mountInput(node, options, structs) {
	var type    = getType(node);
	var setting = bindings.input.types[type];

	if (setting) {
		if (setting.booleans)   { mountBooleans(setting.booleans, node, options, structs); }
		if (setting.attributes) { mountAttributes(setting.attributes, node, options, structs); }
		if (setting.value) {
			if (setting.value === 'radio' || setting.value === 'checkbox') {
				mountAttribute('value', node, options, structs, false);
			}

			mountValue(settings.value, node, options, structs);
		}
	}
}

function mountTag(settings, node, options, structs) {
	var name    = tag(node);
	var setting = settings[name];

	if (!setting) { return; }
	if (setting.booleans) { mountBooleans(setting.booleans, node, options, structs); }
	if (setting.attributes) { mountAttributes(setting.attributes, node, options, structs); }
	if (setting.types) { mountInput(node, options, structs); }
	if (setting.value) { mountValue(setting.value, node, options, structs); }
}

function mountCollection(children, options, structs) {
	var n = -1;
	var child;

	while (child = children[++n]) {
		options.mount(child, options, structs) ||
		mountNode(child, options, structs) ;
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
		// Get an immutable list of children. We don't want to mount
		// elements that may be dynamically inserted by other sparky
		// processes. Remember node.childNodes is dynamic.
		var children = A.slice.apply(node.childNodes);
		var n = -1;
		var child;

		while (child = children[++n]) {
			options.mount(child, options, structs) ||
			mountNode(child, options, structs) ;
		}

		// This costs us, needlessly creating a struct for every element
		//mountScope(node, options, structs);
		mountClass(node, options, structs);
		mountBoolean(bindings.default.booleans[0], node, options, structs);
		mountAttributes(bindings.default.attributes, node, options, structs);
		mountTag(bindings, node, options, structs);
	},

	// text
	3: function mountText(node, options, structs) {
		mountString(node, node.nodeValue, set('nodeValue', node), options, structs);
	},

	// comment
	8: noop,

	// document
	9: function mountDocument(node, options, structs) {
		var children = A.slice.apply(node.childNodes);
		var n = -1;
		var child;

		while (child = children[++n]) {
			options.mount(child, options, structs) ||
			mountNode(child, options, structs) ;
		}
	},

	// doctype
	10: noop,

	// fragment
	11: function mountFragment(node, options, structs) {
		mountCollection(node.childNodes, options, structs);
	},

	default: function(node, options, structs) {
		if (typeof node.length !== 'number') {
			throw new Error('Cannot mount object. It is neither a node nor a collection.', node);
		}

		mountCollection(node, options, structs);
	}
});

function setupStructs(structs, options) {
	structs.forEach(function(struct) {
		// Set up structs to be pushable. Renderers already have
		// a push method and should not be throttled.
		if (struct.setup) { struct.setup(options); }
	});
}

function unbindStructs(structs) {
	structs.forEach(function(struct) {
		struct.unbind();
	});
}

export { bindings as settings };

export default function mount(node, options) {
	if (DEBUG) {
		console.groupCollapsed('mount: ', node);
	}

	options = assign({}, settings, options);

	var structs = [];
	mountNode(node, options, structs);

	if (DEBUG) { console.groupEnd(); }

	var fn = setupStructs;
	var old;

	// Return a read-only stream
	return {
		shift: noop,

		stop: function stop() {
			structs.forEach(function(struct) {
				struct.teardown();
			});
		},

		push: function push(scope) {
			//if (DEBUG) { console.log('mount: push(scope)', scope); }
			if (old === scope) { return; }
			old = scope;

			// Setup structs on the first scope push, unbind them on
			// later pushes
			fn(structs, options);
			fn = unbindStructs;

			structs.forEach(function(struct) {
				bind(struct, scope, options);
			});
		}
	}
};

// Expose a way to get scopes from node for event delegation and debugging

mount.getScope = function getScope(node) {
	var scope = Struct.findScope(node);
	return scope === undefined && node.parentNode ?
		getScope(node.parentNode) :
		scope ;
};
