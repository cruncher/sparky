
import { choose, get, id, isDefined, nothing, noop, overload, postpad, toType, Observable as ObservableStream, observe } from '../../fn/fn.js';
import { attribute, classes, tag, trigger } from '../../dom/dom.js';
import { default as Struct, ReadableStruct } from './struct.js';
import { cue } from './timer.js';

const DEBUG      = true;//false;

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
	input:    {
		booleans:   ['disabled', 'required'],
		attributes: ['name'],
		types: {
			button:   { attributes: ['value'] },
			checkbox: { attributes: [], booleans: ['checked'], value: 'checkbox' },
			date:     { attributes: ['min', 'max', 'step'], value: 'string' },
			hidden:   { attributes: ['value'] },
			image:    { attributes: ['src'] },
			number:   { attributes: ['min', 'max', 'step'], value: 'number' },
			radio:    { attributes: [], booleans: ['checked'], value: 'radio' },
			range:    { attributes: ['min', 'max', 'step'], value: 'number' },
			reset:    { attributes: ['value'] },
			submit:   { attributes: ['value'] },
			time:     { attributes: ['min', 'max', 'step'], value: 'string' },
			default:  { value: 'string' }
		}
	},
	label:    { attributes: ['for'] },
	meta:     { attributes: ['content'] },
	meter:    { attributes: ['min', 'max', 'low', 'high', 'value'] },
	option:   { attributes: ['value'], booleans: ['disabled'] },
	output:   { attributes: ['for'] },
	progress: { attributes: ['max', 'value'] },
	select:   { attributes: ['name'], booleans: ['disabled', 'required'], value: 'string' },
	textarea: { attributes: ['name'], booleans: ['disabled', 'required'], value: 'string' },
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

	'symbol': function(value) {
		return value.toString();
	},

	'undefined': function() {
		return '';
	},

	'object': function(value) {
		// Don't render null
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

function renderString(value) {
	this.data.values[this.data.i] = toRenderString(value);
	this.data.write(this.data.name, this.node, this.data.values.join(''));
}

function mountStringToken(name, node, write, strings, options, match) {
	var i = strings.length;
	strings.push('');

	// new Struct(node, token, path, render)
	options.createStruct(node, match[0], match[2], renderString, match[3], {
		i:      i,
		values: strings,
		name:   name,
		write:  write
	});
}

function mountString(name, node, string, render, options) {
	var rtoken  = options.rtoken || settings.rtoken;
	var i       = rtoken.lastIndex = 0;
	var match   = rtoken.exec(string);

	if (!match) { return; }

	var strings = [];

	while (match) {
		if (match.index > i) {
			strings.push(string.slice(i, match.index));
		}

		mountStringToken(name, node, render, strings, options, match);
		i = rtoken.lastIndex;
		match = rtoken.exec(string);
	}

	if (string.length > i) {
		strings.push(string.slice(i));
	}
}

export function mountAttribute(name, node, options, prefixed) {
	name = cased[name] || name;
	var text = prefixed !== false
		&& node.getAttribute(options.attributePrefix + name)
		|| node.getAttribute(name) ;

	return text && mountString(name, node, text, writeAttribute, options);
}

function mountAttributes(names, node, options) {
	var name;
	var n = -1;

	while (name = names[++n]) {
		mountAttribute(name, node, options);
	}
}

function renderBoolean(value) {
	this.data.values[this.data.i] = value;
	this.data.write(this.data.name, this.node, !!this.data.values.find(isTruthy));
}

function mountBooleanToken(name, node, write, values, options, match) {
	var i = values.length;
	values.push(false);

	options.createStruct(node, match[0], match[2], renderBoolean, match[3], {
		i:      i,
		values: values,
		name:   name,
		write:  write
	});
}

export function mountBoolean(name, node, options) {
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

	var write = name in node ?
		writeProperty :
		writeBooleanAttr ;

	// Where the unprefixed attribute is populated, Return the property to
	// the default value.
	if (!prefixed) {
		write(name, node, nothing);
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

		mountBooleanToken(name, node, write, values, options, match);
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

function mountBooleans(names, node, options) {
	var name;
	var n = -1;

	while (name = names[++n]) {
		mountBoolean(name, node, options);
	}
}

function renderClass(string) {
	if (this.data.previous && rtext.test(this.data.previous)) {
		removeClasses(this.data.classes, this.data.previous);
	}

	if (string && rtext.test(string)) {
		addClasses(this.data.classes, string);
	}

	this.data.previous = string;
}

export function mountClass(node, options) {
	var rtoken = options.rtoken;
	var attr   = attribute('class', node);

	// If there are no classes, go no further
	if (!attr) { return; }

	var cls = classes(node);

	// Extract the tags
	var text = attr.replace(rtoken, function($0, $1, $2, $3, $4) {
		options.createStruct(node, $0, $2, renderClass, $3, {
			previous: '',
			classes:  cls
		});
		return '';
	});

	// Overwrite the class with remaining text
	node.setAttribute('class', text);
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
	var n = -1;
	var child, struct;

	while (child = children[++n]) {
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
		const struct = options.mount(node, options);
		if (struct) {
			structs.push(struct);
			return;
		}

		// Get an immutable list of children. We don't want to mount
		// elements that may be dynamically inserted later by other sparky
		// processes. Remember node.childNodes is dynamic.
		mountCollection(Array.from(node.childNodes), options, structs);
		mountClass(node, options);
		mountBooleans(bindings.default.booleans, node, options);
		mountAttributes(bindings.default.attributes, node, options);
		mountTag(bindings, node, options);
	},

	// text
	3: function mountText(node, options) {
		mountString('nodeValue', node, node.nodeValue, writeProperty, options);
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
	default: function mountArray(node, options) {
		if (typeof node.length !== 'number') {
			throw new Error('Cannot mount object. It is neither a node nor a collection.', node);
		}

		mountCollection(node, options);
	}
});


/* Bind Sparky streams */

function eachFrame(sparky) {
	const input = sparky.input;

	let unobserve = noop;

	sparky.name = 'Sparky';

	sparky.fire = function update(time) {
		var scope = input.shift();
		// Todo: shouldnt need this line - observe(undefined) shouldnt call fn
		if (scope === undefined) { return; }

		function render(time) {
			sparky.push(scope);
		}

		unobserve();
		unobserve = observe('.', function() {
			cue({ name: 'Sparky push', fire: render });
		}, scope);
	}

	cue(sparky);

	input.on('push', function() {
		cue(sparky);
	});
}

function bind(struct, scope, options) {
	struct.input = ObservableStream(struct.path, scope).latest();

	// Just for debugging
	struct.scope = scope;

	// if struct is a Sparky
	eachFrame(struct);
}

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

	mountNode(node, options, structs);

	if (DEBUG) {
		console.groupEnd();
		console.table(structs, ['token']);
	}

	// Return a read-only stream
	return {
		stop: function stop() {
			structs.forEach(function(struct) {
				struct.stop();
			});
		},

		push: function push(scope) {
			//if (DEBUG) { console.log('mount: push(scope)', scope); }
			if (old === scope) { return; }
			old = scope;

			// Setup structs on the first scope push, unbind them on
			// later pushes with reset()
			structs.forEach(function(struct) {
				struct.reset && struct.reset(options);
			});

			structs.forEach(function(struct) {
				if (struct.bind) {
					struct.bind(scope, options);
				}
				else {
					bind(struct, scope, options);
				}
			});
		}
	}
}

// Expose a way to get scopes from node for event delegation and debugging

mount.getScope = function getScope(node) {
	var scope = Struct.findScope(node);
	return scope === undefined && node.parentNode ?
		getScope(node.parentNode) :
		scope ;
};
