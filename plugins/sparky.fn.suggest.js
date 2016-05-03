(function(window) {
	var Sparky = window.Sparky;

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
			elem.trigger({ type: 'activate', relatedTarget: node });

			var buttons = elem.find('button');
			var i = 0;

			buttons.eq(i).addClass('focus');

			node.addEventListener('keydown', function key(e) {
				if (e.keyCode === 38) {
					e.preventDefault();
					console.log('UP');
					buttons.eq(i).removeClass('focus');
					i = wrap(i - 1, 0, buttons.length);
					buttons.eq(i).addClass('focus');
				}
				else if (e.keyCode === 40) {
					e.preventDefault();
					console.log('DOWN');
					buttons.eq(i).removeClass('focus');
					i = wrap(i + 1, 0, buttons.length);
					buttons.eq(i).addClass('focus');
				}
				else if (e.keyCode === 9) {
					console.log('TAB');
					Sparky.dom.trigger(buttons.eq(i)[0], 'click');
					node.removeEventListener('keydown', key);
				}
				else if (e.keyCode === 13) {
					e.preventDefault();
					console.log('RETURN');
					Sparky.dom.trigger(buttons.eq(i)[0], 'click');
					node.removeEventListener('keydown', key);
				}
			});
		});
	}

	function listen(node, fn) {
		function update(data) {
			jQuery(node).trigger('deactivate');
			fn(data);
		}

		function click(e) {
			var button = Sparky.dom.closest(e.target, '[data-fn~="scope"]', e.currentTarget);
			var object = Sparky.getScope(button);
			update(object);
		}

		function change(e) {
			if (e.target.checked) { return; }
			update(Sparky.getScope(e.target));
		}

		node.addEventListener('click', click);
		node.addEventListener('change', change);
		node.addEventListener('valuechange', change);
	}

	var request = Throttle(function request(url, tip, node) {
		jQuery
		.ajax(url)
		.then(function(data) {
			activate(Collection(data), tip, node);
		});
	}, 320);

	Sparky.fn.suggest = function(node) {
		if (Sparky.dom.tag(node) !== 'input') {
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
			console.warn('Sparky: data-fn="suggest" requires attributes data-suggest-template and data-suggest-data.', node);
			return;
		}

		// Look for a data-suggest-list attribute having a tag in it
		Sparky.rsimpletags.lastIndex = 0;
		var tag = Sparky.rsimpletags.exec(listId);
		var prop;

		if (tag) {
			if (url.length !== tag[0].length) {
				console.warn('Sparky: There is not just a simple tag in this attribute.');
				return;
			}
			prop = tag[1];
		}

		if (fn) { fn = this.data[fn]; }

		if (pattern) { pattern = RegExp(pattern); }

		var tip = Sparky(templateId);
		Sparky.dom.append(document.body, tip);

		var scope;
		this.on('scope', function(sparky, newscope) {
			scope = newscope;
		});

		listen(tip.filter(Sparky.dom.isElementNode)[0], function(data) {
			if (format) {
				node.value = Sparky.render(format, data);
				Sparky.dom.trigger(node, 'change');
			}

			if (fn) {
				fn(node, scope, data);
			}

			window.requestAnimationFrame(function() {
				// Refocus the original input
				node.focus();
			});
		});

		node.addEventListener('input', function(e) {
			var text = e.target.value;

			if (pattern && !pattern.test(text)) {
				jQuery(tip).trigger('deactivate');
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
			jQuery(tip).trigger('deactivate');
		});
	};
})(this);
