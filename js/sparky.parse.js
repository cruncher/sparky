
// Sparky.parse()
//
// Sparky.parse(nodes, get, set, bind, unbind, create);
//
// Parses a collection of DOM nodes and all their descendants looking for
// Sparky tags. For each tag found in the DOM, the bind callback is called
// with the params (path, fn), where path is of the form 'path.to.data' and
// fn is a function to be called when the data at that path changes.

(function(window) {
	"use strict";

	var assign = Object.assign;
	var Fn     = window.Fn;
	var dom    = window.dom;
	var Sparky = window.Sparky;

	var attributes = ['href', 'title', 'id', 'style', 'src', 'alt'];

	var aliases = {
		"viewbox": "viewBox"
	};

	// Matches a sparky template tag, capturing (path, filter)
	var rtagstemplate = /({{0}})\s*([\w\-\.]+)\s*(?:\|([^\}]+))?\s*{{1}}/g;
	var rtags;

	// Matches a simple sparky template tag, capturing (path)
	var rsimpletagstemplate = /{{0}}\s*([\w\-\.\[\]]+)\s*{{1}}/g;
	var rsimpletags;

	// Matches tags plus any directly adjacent text
	var rclasstagstemplate = /[^\s]*{{0}}[^\}]+{{1}}[^\s]*/g;
	var rclasstags;

	// Matches filter string, capturing (filter name, filter parameter string)
	var rfilter = /\s*([a-zA-Z0-9_\-]+)\s*(?::(.+))?/;

	// Matches anything with a space
	var rspaces = /\s+/;

	// Matches anything that contains a non-space character
	var rtext = /\S/;

	// Matches URLs for html
	var rurlhtml = /\/\S*\.html$/;

	// Matches the arguments list in the result of a fn.toString()
	var rarguments = /function(?:\s+\w+)?\s*(\([\w,\s]*\))/;

	var filterCache = {};


	// Utility functions

	var identity  = Fn.id;
	var isDefined = Fn.isDefined;
	var toClass   = Fn.toClass;

	var slice = Function.prototype.call.bind(Array.prototype.slice);


	// DOM

	//function setAttributeSVG(node, attribute, value) {
	//	if (attribute === 'd' || attribute === "transform" || attribute === "viewBox") {
	//		node.setAttribute(attribute, value);
	//	}
	//	else if (attribute === "href") {
	//		node.setAttributeNS(Sparky.xlinkNamespace, attribute, value);
	//	}
	//	else {
	//		node.setAttributeNS(Sparky.svgNamespace, attribute, value);
	//	}
	//}

	function setAttributeHTML(node, attribute, value) {
		node.setAttribute(attribute, value);
	}

	//function toggleAttributeSVG(node, attribute, value) {
	//  if (attribute in node) { node[attribute] = !!value; }
	//  else if (value) { setAttributeSVG(node, attribute, value); }
	//  else { node.removeAttribute(attribute); }
	//}

	function toggleAttributeHTML(node, attribute, value) {
		if (attribute in node) { node[attribute] = !!value; }
		else if (value) { node.setAttribute(attribute, attribute); }
		else { node.removeAttribute(attribute); }
	}

	function addClasses(classList, text) {
		var classes = text.trim().split(rspaces);
		classList.add.apply(classList, classes);
	}

	function removeClasses(classList, text) {
		var classes = text.trim().split(rspaces);
		classList.remove.apply(classList, classes);
	}


	// Binding system

	var tags = {
		label: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttribute(node, 'for', bind, unbind, get, unobservers);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		button: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		input: function(node, bind, unbind, get, set, setup, create, unobservers) {
			var type = node.type;

			bindAttribute(node, 'value', bind, unbind, get, unobservers);
			bindAttribute(node, 'min', bind, unbind, get, unobservers);
			bindAttribute(node, 'max', bind, unbind, get, unobservers);
			bindAttribute(node, 'step', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'required', bind, unbind, get, unobservers);

			var unbindName = type === 'number' || type === 'range' ?
				// Only let numbers set the value of number and range inputs
				parseName(node, get, set, bind, unbind, floatToString, stringToFloat) :
			// Checkboxes default to value "on" when the value attribute
			// is not given. Make them behave as booleans.
			(type === 'checkbox' || type === 'radio') && !isDefined(node.getAttribute('value')) ?
				parseName(node, get, set, bind, unbind, boolToStringOn, stringOnToBool) :
				// Only let strings set the value of other inputs
				parseName(node, get, set, bind, unbind, identity, identity) ;

			if (unbindName) { unobservers.push(unbindName); }

			bindAttribute(node, 'name', bind, unbind, get, unobservers);
		},

		select: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttribute(node, 'value', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'required', bind, unbind, get, unobservers);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);

			// Only let strings set the value of selects
			var unbindName = parseName(node, get, set, bind, unbind, identity, identity);
			if (unbindName) { unobservers.push(unbindName); }

			bindAttribute(node, 'name', bind, unbind, get, unobservers);
		},

		option: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttribute(node, 'value', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		textarea: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindBooleanAttribute(node, 'disabled', bind, unbind, get, unobservers);
			bindBooleanAttribute(node, 'required', bind, unbind, get, unobservers);

			// Only let strings set the value of a textarea
			var unbindName = parseName(node, get, set, bind, unbind, identity, identity);
			if (unbindName) { unobservers.push(unbindName); }
			bindAttribute(node, 'name', bind, unbind, get, unobservers);
		},

		time: function(node, bind, unbind, get, set, setup, create, unobservers)  {
			bindAttributes(node, bind, unbind, get, unobservers, ['datetime']);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		svg: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['viewbox']);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		g: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['transform']);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		path: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['d', 'transform']);
		},

		line: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['x1', 'x2', 'y1', 'y2', 'transform']);
		},

		rect: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['x', 'y', 'width', 'height', 'rx', 'ry', 'transform']);
		},

		text: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['x', 'y', 'dx', 'dy', 'text-anchor']);
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
		},

		use: function(node, bind, unbind, get, set, setup, create, unobservers) {
			bindAttributes(node, bind, unbind, get, unobservers, ['href', 'transform']);
		},

		template: Sparky.noop,
		script: Sparky.noop
	};

	var parsers = {
		1: function domNode(node, bind, unbind, get, set, setup, create) {
			var unobservers = [];
			var tag = node.tagName.toLowerCase();

			if (Sparky.debug === 'verbose') { console.group('Sparky: dom node: ', node); }
			bindClasses(node, bind, unbind, get, unobservers);
			bindAttributes(node, bind, unbind, get, unobservers, attributes);

			// Set up special bindings for certain tags, like form inputs
			if (tags[tag]) {
				tags[tag](node, bind, unbind, get, set, setup, create, unobservers);
			}

			// Or sparkify the child nodes
			else {
				bindNodes(node, bind, unbind, get, set, setup, create, unobservers);
			}

			if (Sparky.debug === 'verbose') { console.groupEnd(); }
			return unobservers;
		},

		3: function textNode(node, bind, unbind, get, set, setup, create) {
			var unobservers = [];

			if (Sparky.debug === 'verbose') { console.group('Sparky: text node:', node); }
			observeProperties(node.nodeValue, bind, unbind, get, function(text) {
				node.nodeValue = text;
			}, unobservers);

			if (Sparky.debug === 'verbose') { console.groupEnd(); }
			return unobservers;
		},

		11: function fragmentNode(node, bind, unbind, get, set, setup, create) {
			var unobservers = [];

			if (Sparky.debug === 'verbose') { console.group('Sparky: fragment: ', node); }
			bindNodes(node, bind, unbind, get, set, setup, create, unobservers);

			if (Sparky.debug === 'verbose') { console.groupEnd(); }
			return unobservers;
		}
	};

	function bindNodes(node, bind, unbind, get, set, setup, create, unobservers) {
		// Document fragments do not have a getAttribute method.
		var id = node.getAttribute && node.getAttribute('data-template');
		var template, nodes;

		if (rurlhtml.test(id)) {
			// Todo: this is supposed to be able to fetch Sparky templates,
			// whereupon we may parse and insert them. Which implies that
			// that bit at the bottom of this function needs to be made
			// async. For now, we just assume flat html without any Sparky
			// magic.
			jQuery.ajax({
				url: id,
				dataType: 'html'
			})
			.then(function(html) {
				// Dangerous? Potentially.
				node.innerHTML = html;
			});
			
			return;
		}
		else if (isDefined(id)) {
			// Node has a data-template attribute
			template = Sparky.template(id);

			// If the template does not exist, do nothing
			if (!template) {
				Sparky.log('Sparky: template not found in DOM', node);
				return;
			}

			// childNodes is a live list, and we don't want that because we may
			// be about to modify the DOM
			nodes = slice(template.childNodes);

			// Wait for scope to become available with a self-unbinding function
			// before appending the template to the DOM. BE AWARE, here, that
			// this could throw a bug in the works: we're currently looping over
			// bindings outside of the call to bind, and inside we call unbind,
			// which modifies bindings... see? It won't bug just now, becuase
			// reverse loops, but if you change anything...
			setup(function domify() {
				dom.empty(node);
				dom.append(node, template);
			});
		}
		else {
			// childNodes is a live list, and we don't want that because we may
			// be about to modify the DOM.
			nodes = slice(node.childNodes);
		}

		var n = -1;
		var l = nodes.length;
		var child;

		// Loop forwards through the children
		while (++n < l) {
			child = nodes[n];

			// Don't bind child nodes that have their own Sparky controllers.
			if (child.getAttribute && (
				isDefined(child.getAttribute('data-fn')) ||
				isDefined(child.getAttribute('data-scope'))
			)) {
				create(child);
				//unobservers.push(sparky.destroy.bind(sparky));
			}
			else if (parsers[child.nodeType]) {
				unobservers.push.apply(unobservers, parsers[child.nodeType](child, bind, unbind, get, set, setup, create));
			}
		}
	}

	function bindClasses(node, bind, unbind, get, unobservers) {
		var classes = dom.attribute('class', node);

		// If there are no classes, go no further
		if (!classes) { return; }

		// Remove tags and store them
		rclasstags.lastIndex = 0;
		var tags = [];
		var text = classes.replace(rclasstags, function($0) {
			tags.push($0);
			return '';
		});

		// Where no tags have been found, go no further
		if (!tags.length) { return; }

		// Now that we extracted the tags, overwrite the class with remaining text
		node.setAttribute('class', text);

		// Create an update function for keeping sparky's classes up-to-date
		var classList = dom.classes(node);
		var update = function update(newText, oldText) {
			if (oldText && rtext.test(oldText)) { removeClasses(classList, oldText); }
			if (newText && rtext.test(newText)) { addClasses(classList, newText); }
		};

		if (Sparky.debug === 'verbose') { console.log('Sparky: bind class="' + classes + ' ' + tags.join(' ') + '"'); }

		observeProperties(tags.join(' '), bind, unbind, get, update, unobservers);
	}

	function bindAttributes(node, bind, unbind, get, unobservers, attributes) {
		var a = attributes.length;

		while (a--) {
			bindAttribute(node, attributes[a], bind, unbind, get, unobservers);
		}
	}

	function bindAttribute(node, attribute, bind, unbind, get, unobservers) {
		// Look for data- aliased attributes before attributes. This is
		// particularly important for the style attribute in IE, as it does not
		// return invalid CSS text content, so Sparky can't read tags in it.
		var alias = node.getAttribute('data-' + attribute) ;

		// SVG has case sensitive attributes.
		var attr = aliases[attribute] || attribute ;
		var value = alias ? alias :
		//    	isSVG ? node.getAttributeNS(Sparky.xlinkNamespace, attr) || node.getAttribute(attr) :
			node.getAttribute(attr) ;

		if (!value) { return; }
		if (alias) { node.removeAttribute('data-' + attribute); }
		if (Sparky.debug === 'verbose') { console.log('Sparky: checking ' + attr + '="' + value + '"'); }

		var update = setAttributeHTML.bind(null, node, attr) ;

		observeProperties(value, bind, unbind, get, update, unobservers);
	}

	function bindBooleanAttribute(node, attribute, bind, unbind, get, unobservers) {
		// Look for data-attributes before attributes.
		//
		// In IE, the style attribute does not return invalid CSS text content,
		// so Sparky can't read tags in it.
		//
		// In FF, the disabled attribute is set to the previous value that the
		// element had when the page is refreshed, so it contains no sparky
		// tags. The proper way to address this problem is to set
		// autocomplete="off" on the parent form or on the field.
		var alias = node.getAttribute('data-' + attribute) ;

		// SVG has case sensitive attributes.
		var attr = attribute ;
		var value = alias ? alias : node.getAttribute(attr) ;

		if (!value) { return; }
		if (alias) { node.removeAttribute('data-' + attribute); }
		if (Sparky.debug === 'verbose') { console.log('Sparky: checking ' + attr + '="' + value + '"'); }

		var update = toggleAttributeHTML.bind(null, node, attr) ;
		observeBoolean(value.trim(), bind, unbind, get, update, unobservers);
	}

	function observeBoolean(text, bind, unbind, get, fn, unobservers) {
		Sparky.rtags.lastIndex = 0;
		var tokens = Sparky.rtags.exec(text);

		if (!tokens) { return; }
		var replace = makeReplaceText(get);

		function update() {
			Sparky.rtags.lastIndex = 0;
			var value = replace.apply(null, tokens);
			fn(value);
		}

		// Live tag
		if (tokens[1].length === 2) {
			unobservers.push(observeProperties2(bind, unbind, update, [tokens[2]]));
		}
		// Dead tag
		else {
			// Scope is not available yet. We need to wait for it. Todo: This
			// should be done inside the Sparky constructor.
			window.requestAnimationFrame(update);
		}
	}

	function toFilter(filter) {
		var parts = rfilter.exec(filter);

		return {
			name: parts[1],
			fn: Sparky.filter[parts[1]],

			// Leave the first arg empty. It will be populated with the value to
			// be filtered when the filter fn is called.
			args: parts[2] && JSON.parse('["",' + parts[2].replace(/'/g, '"') + ']') || []
		};
	}

	function applyFilters(word, filterString) {
		var filters = filterCache[filterString] || (
			filterCache[filterString] = filterString.split('|').map(toFilter)
		);
		var l = filters.length;
		var n = -1;
		var args;

		// Todo: replace this mechanism with a functor.

		while (++n < l) {
			if (!isDefined(word)) { break; }

			if (!filters[n].fn) {
				throw new Error('Sparky: filter \'' + filters[n].name + '\' does not exist in Sparky.filter');
			}

			if (Sparky.debug === 'verbose') {
				console.log('Sparky: filter:', filters[n].name, 'value:', word, 'args:', filters[n].args);
			}

			args = filters[n].args;
			args[0] = word;
			word = filters[n].fn.apply(null, args);
		}

		return word;
	}

	function extractProperties(str, live, dead) {
		Sparky.rtags.lastIndex = 0;
		str.replace(Sparky.rtags, function($0, $1, $2){
			// Sort the live properties from the dead properties.
			var i;

			// If it's already in live, our work here is done
			if (live.indexOf($2) !== -1) { return; }

			// It's a live tag, so put it in live, and if it's already
			// in dead remove it from there.
			if ($1.length === 2) {
				live.push($2);
				i = dead.indexOf($2);
				if (i !== -1) { dead.splice(i, 1); }
			}

			// It's a dead tag, check if it's in dead and if not stick
			// it in there.
			else if (dead.indexOf($2) === -1) {
				dead.push($2);
			}
		});
	}

	function makeReplaceText(get) {
		return function replaceText($0, $1, $2, $3) {
			var value = $3 ? applyFilters(get($2), $3) : get($2) ;
			var type = typeof value;

			return !isDefined(value) ? '' :
				type === 'string' ? value :
				type === 'number' ? value :
				type === 'boolean' ? value :
				// Beautify the .toString() result of functions
				type === 'function' ? (value.name || 'function') + (rarguments.exec(value.toString()) || [])[1] :
				JSON.stringify(value, null, 4) ;
				// Use just the Class string in '[object Class]'
				//toClass(value) ;
		}
	}

	function makeUpdateText(text, get, fn) {
		var replaceText = makeReplaceText(get);
		var oldText;

		return function updateText() {
			Sparky.rtags.lastIndex = 0;
			var newText = text.replace(Sparky.rtags, replaceText);
			fn(newText, oldText);
			oldText = newText;
		}
	}

	function observeProperties(text, bind, unbind, get, fn, unobservers) {
		var live = [];
		var dead = [];

		// Populate live and dead property lists
		extractProperties(text, live, dead);

		if (live.length === 0 && dead.length === 0) { return; }

		var update = makeUpdateText(text, get, fn);

		if (live.length) {
			unobservers.push(observeProperties2(bind, unbind, update, live));
		}
		else {
			// Scope is not available yet. We need to wait for it. Todo: This
			// should be done inside the Sparky constructor.
			window.requestAnimationFrame(update);
		}
	}

	function observeProperties2(bind, unbind, update, properties) {
		// Observe properties that are to be live updated
		properties.forEach(function(property) {
			bind(property, update);
		});

		// Return a function that destroys live bindings
		return function destroyBinding() {
			properties.forEach(function(property) {
				// Unobserve properties
				unbind(property, update);
			});
		};
	}


	// Forms elements
	//
	// 2-way binding for form elements. HTML form elements are hard. They do
	// all sorts of strange things such as having a default value of string
	// 'on' where a value attribute is not given. This set of functions handles
	// 2-way binding between a node and an object. They are deliberately strict.

	function stringToFloat(value) {
		// coerse to number
		var n = parseFloat(value);
		return Number.isNaN(n) ? undefined :
			n ;
	}

	function stringToInt(value) {
		// coerse to number
		var n = parseFloat(value);
		return Number.isNaN(n) ? undefined :
			Math.round(n) ;
	}

	function stringToBool(value) {
		return value === 'false' ? false :
			value === '0' ? false :
			value === '' ? false :
			!!value ;
	}

	function stringOnToBool(value) {
		return value === 'on' ;
	}

	function definedToString(value) {
		return isDefined(value) ? value + '' :
			undefined ;
	}

	function floatToString(value) {
		return typeof value === 'number' ? value + '' :
			undefined ;
	}

	function intToString(value) {
		return typeof value === 'number' && value % 1 === 0 ? value + '' :
			undefined ;
	}

	function boolToString(value) {
		return typeof value === 'boolean' ? value + '' :
			typeof value === 'number' ? !!value + '' :
			undefined ;
	}

	function boolToStringOn(value) {
		return typeof value === 'boolean' || typeof value === 'number' ?
			value ? 'on' : '' :
			undefined ;
	}

	//function dispatchInputChangeEvent(node) {
	//	// FireFox won't dispatch any events on disabled inputs so we need to do
	//	// a little dance, enabling it quickly, sending the event and disabling
	//	// it again.
	//	if (!dom.features.inputEventsOnDisabled && node.disabled) {
	//		node.disabled = false;
	//
	//		// We have to wait, though. It's not clear why. This makes it async,
	//		// but let's not worry too much about that.
	//		Fn.requestTick(function() {
	//			dom.trigger('valuechange', node);
	//			node.disabled = true;
	//		});
	//	}
	//	else {
	//		dom.trigger('valuechange', node);
	//	}
	//}

	function makeUpdateInput(node, get, set, path, fn) {
		var type = node.type;
		var init = true;

		return type === 'radio' || type === 'checkbox' ?
			function updateChecked() {
				var value = fn(get(path));
				var checked;

				if (init) {
					init = false;
					if (!isDefined(value) && node.checked) {
						// Avoid setting the value from the scope on initial run
						// where there is no scope value. The change event will
						// be called and the scope updated from the default value.
						//dispatchInputChangeEvent(node);
						return;
					}
				}

				// Wait for attributes to potentially update
				checked = node.value === value;

				// Don't set checked state if it already has that state.
				if (node.checked === checked) { return; }
				node.checked = checked;
				//dispatchInputChangeEvent(node);
			} :

			function updateValue() {
				var value = fn(get(path));

				if (init) {
					init = false;
					if (!isDefined(value)) {
						// Avoid setting the value from the scope on initial run
						// where there is no scope value. The change event will be
						// called and the scope updated from the default value.
						
						// Avoid sending to selects, as we do not rely on Bolt
						// for setting state on select labels anymore...
						//if (dom.tag(node) !== "select") { dispatchInputChangeEvent(node); }
						return;
					}
				}

				// Wait for attributes and select children to potentially update
				if (typeof value === 'string') {
					// Check against the current value - resetting the same
					// string causes the cursor to jump in inputs, and we dont
					// want to send a change event where nothing changed.
					if (node.value === value) { return; }
					node.value = value;
				}
				else {
					// Be strict about setting strings on inputs
					node.value = '';
				}

				// Todo: Hackaround for Procsea: selects are being repopulated
				// after their value changes, so do everything we just did
				// AGAIN. We MUST sort out the order of child DOM render value
				// change stuff.
				if (dom.tag(node) === "select") {
					requestAnimationFrame(function() {
						if (typeof value === 'string') {
							if (node.value === value) { return; }
							node.value = value;
						}
						else {
							node.value = '';
						}
					});
				}

				// Avoid sending to selects, as we do not rely on Bolt
				// for setting state on select labels anymore...
				//if (dom.tag(node) !== "select") { dispatchInputChangeEvent(node); }
			} ;
	}

	function makeChangeListener(node, set, path, fn) {
		var type = node.type;

		return type === 'radio' ? function radioChange(e) {
				if (node.checked) {
					set(path, fn(node.value));
				}
			} :
			type === 'checkbox' ? function checkboxChange(e) {
				set(path, fn(node.checked ? node.value : undefined));
			} :
			function change(e) {
				set(path, fn(node.value));
			} ;
	}

	function bindValue(node, get, set, bind, unbind, path, to, from) {
		var update = makeUpdateInput(node, get, set, path, to);
		var change = makeChangeListener(node, set, path, from);

		node.addEventListener('change', change);
		node.addEventListener('input', change);

		// Wait for animation frame to let Sparky fill in tags in value, min
		// and max before controlling.
		var request = window.requestAnimationFrame(function() {
			request = false;

			// Where the model does not have value, set it from the node value.
			if (!isDefined(get(path))) { change(); }
		});

		bind(path, update);

		return function() {
			node.removeEventListener('change', change);
			node.removeEventListener('input', change);

			if (request) {
				window.cancelAnimationFrame(request);
			}

			unbind(path, update);
		};
	}

	function parse(nodes, get, set) {
		var results = {
			setups: [],
			bindings: [],
			nodes: []
		};

		// Todo: This is convoluted legacy crap. Sort it out.

		results.teardowns = Array.prototype.concat.apply([], nodes.map(function(node) {
			return parsers[node.nodeType](
				node,
				function bind(path, fn) {
					results.bindings.push([path, fn, Fn.Throttle(fn)]);
				},
				function unbind(fn) {
					var bindings = results.bindings;
					var n = bindings.length;
					while (n--) {
						if (bindings[n][1] === fn) {
							bindings.splice(n, 1);
							return;
						}
					}
				},
				get,
				set,
				function setup(fn) {
					results.setups.push(fn);
				},
				function create(node) {
					results.nodes.push(node);
				}
			);
		}));

		return results;
	}

	function parseName(node, get, set, bind, unbind, to, from) {
		if (Sparky.debug === "verbose" && !node.name) {
			console.warn('Sparky: Cannot bind value of node with empty name.', node);
			return;
		}

		// Search name for tags. Data bind the first live tag and remove the tag
		// parentheses to prevent this node from being name-value bound by other
		// controllers.
		// Todo: This is weird semantics: {{prop}} changes value, {{{prop}}}
		// changes name. Think about this. Hard.
		var tag, fn;

		Sparky.rtags.lastIndex = 0;
		while ((tag = Sparky.rtags.exec(node.name))) {
			if (tag[1].length === 2) {
				fn = bindValue(node, get, set, bind, unbind, tag[2], to, from);
				node.name = node.name.replace(tag[0], tag[2]);
				break;
			}
		}

		return fn;
	}


	// Set up Sparky.tags(), Sparky.rtags, Sparky.rsimpletags

	function changeTags(ropen, rclose) {
		rtags = Sparky.render(rtagstemplate, arguments);
		rsimpletags = Sparky.render(rsimpletagstemplate, arguments);
		rclasstags = Sparky.render(rclasstagstemplate, arguments);
	}

	Object.defineProperties(Sparky, {
		rtags: {
			get: function() { return rtags; },
			enumerable: true
		},

		rsimpletags: {
			get: function() { return rsimpletags; },
			enumerable: true
		}
	});

	changeTags(/\{\[{1,2}/, /\]{1,2}\}/);


	// Export

	assign(Sparky, {
		parse: parse,
		parseName: parseName,
		bindValue: bindValue,
		attributes: attributes,

		stringToInt:     stringToInt,
		stringToFloat:   stringToFloat,
		stringToBool:    stringToBool,
		stringOnToBool:  stringOnToBool,
		definedToString: definedToString,
		intToString:     intToString,
		floatToString:   floatToString,
		boolToString:    boolToString,
		boolToStringOn:  boolToStringOn,

		tags:            changeTags,
		rspaces:         rspaces
	});
})(this);
