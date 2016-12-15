(function(window) {
	var Fn         = window.Fn;
	var dom        = window.dom;
	var Collection = window.Collection;
	var Sparky     = window.Sparky;

	function wrap(i, min, max) {
		return i < min ? max - (min - i) :
			i >= max ? min + (i - max) :
			i ;
	}

	function Throttle(fn, time) {
		var flag = false;
		var context, args;

		function update() {
			fn.apply(context, args);
			flag = false;
		}

		return function() {
			context = this;
			args = arguments;

			if (flag) { return; }
			flag = true;

			setTimeout(update, time);
		};
	}

	function activate(data, tip, node) {
		if (!data || data.length === 0) { return; }

		tip.scope(data);

		var elem = tip.tojQuery();

		window.requestAnimationFrame(function() {
			elem.trigger({ type: 'dom-activate', relatedTarget: node });

			var buttons = elem.find('[data-fn~="scope"]');
			var i = 0;

			function mouseenter(e) {
				buttons.eq(i).removeClass('focus');
				i = buttons.index(e.currentTarget);
				buttons.eq(i).addClass('focus');
			}

			function keydown(e) {
				if (e.keyCode === 38) {
					e.preventDefault();
					buttons.eq(i).removeClass('focus');
					i = wrap(i - 1, 0, buttons.length);
					buttons.eq(i).addClass('focus');
				}
				else if (e.keyCode === 40) {
					e.preventDefault();
					buttons.eq(i).removeClass('focus');
					i = wrap(i + 1, 0, buttons.length);
					buttons.eq(i).addClass('focus');
				}
				else if (e.keyCode === 9) {
					dom.trigger('click', buttons.eq(i)[0]);
				}
				else if (e.keyCode === 13) {
					e.preventDefault();
					dom.trigger('click', buttons.eq(i)[0]);
				}
			}

			function deactivate(e) {
				buttons.eq(i).removeClass('focus');
				elem.off('dom-deactivate', deactivate);
				elem.off('mouseenter', mouseenter);
				node.removeEventListener('keydown', keydown);
			}

			buttons.eq(i).addClass('focus');
			node.addEventListener('keydown', keydown);
			elem
			.on('mouseenter', '[data-fn~="scope"]', mouseenter)
			.on('dom-deactivate', deactivate);
		});
	}

	function listen(node, fn) {
		function update(data) {
			jQuery(node).trigger('dom-deactivate');
			fn(data);
		}

		function click(e) {
			var button = dom.closest('[data-fn~="scope"]', e.target, e.currentTarget);
			var object = Sparky.getScope(button);
			update(object);
		}

		node.addEventListener('click', click);
	}

	var request = Throttle(function request(url, tip, node) {
		jQuery
		.ajax(url)
		.then(function(data) {
			activate(Collection(data), tip, node);
		});
	}, 320);

	Sparky.fn.suggest = function(node, scopes) {
		if (dom.tag(node) !== 'input') {
			console.warn('Sparky: data-fn="suggest" can only be applied to an <input>.');
			return;
		}

		var listId     = node.getAttribute('data-suggest-list');
		var type       = Fn.stringType(listId);
		var templateId = node.getAttribute('data-suggest-template');
		var format     = node.getAttribute('data-suggest-format');
		var fn         = node.getAttribute('data-suggest-fn');
		var pattern    = node.getAttribute('data-suggest-pattern');

		//console.log('Sparky.fn.suggest: node', node, 'list:', listId, 'type:', type, 'template:', templateId, 'format:', format, 'fn:', fn, 'pattern:', pattern);

		if (!templateId || !listId) {
			console.warn('Sparky: data-fn="suggest" requires attributes data-suggest-template and data-suggest-list.', node);
			return;
		}

		// Look for a data-suggest-list attribute having a tag in it
		Sparky.rsimpletags.lastIndex = 0;
		var tag = Sparky.rsimpletags.exec(listId);
		var prop;

		if (tag) {
			if (listId.length !== tag[0].length) {
				console.warn('Sparky: There is not just a simple tag in this attribute.');
				return;
			}
			prop = tag[1];
		}

		if (fn) { fn = this.data[fn]; }

		if (pattern) { pattern = RegExp(pattern); }

		var tip = Sparky(templateId);
		dom.append(document.body, tip);

		var scope;
		scopes.tap(function(newscope) {
			scope = newscope;
		});

		listen(tip.filter(dom.isElementNode)[0], function(data) {
			node.value = format ? Sparky.render(format, data) : data ;
			dom.trigger('change', node);

			// Focus the next tabbable node
			var next = jQuery(node).nextAll('input:not([disabled]):not([hidden]):not([tabindex^="-"])').first();
			window.requestAnimationFrame(function functionName() {
				next.focus();
			});

			if (fn) {
				fn(node, scope, data);
			}
		});

		node.addEventListener('input', function(e) {
			var text = e.target.value;

			if (pattern && !pattern.test(text)) {
				jQuery(tip).trigger('dom-deactivate');
				return;
			}

			if (type === 'url') {
				request(listId + text, tip, node);
			}
			else {
				activate(scope[prop], tip, node);
			}
		});

		node.addEventListener('blur', function(e) {
			jQuery(tip).trigger('dom-deactivate');
		});
	};
})(this);
