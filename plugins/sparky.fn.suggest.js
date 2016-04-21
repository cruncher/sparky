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

			node.addEventListener('keydown', function(e) {
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
				else if (e.keyCode === 13) {
					e.preventDefault();
					console.log('RETURN');
					Sparky.dom.trigger(buttons.eq(i)[0], 'click');
				}
			});
		});
	}

	var request = Throttle(function request(url, tip, node) {
		jQuery
		.ajax(url)
		.then(function(data) {
			if (!data || data.length === 0) { return; }
			tip.scope(Collection(data));

			var elem = tip.tojQuery();

			window.requestAnimationFrame(function() {
				elem.trigger({ type: 'activate', relatedTarget: node });

				var inputs = elem.find('input');

				var i = 0;

				inputs.eq(i).addClass('focus');

				node.addEventListener('keydown', function(e) {
					if (e.keyCode === 38) {
						e.preventDefault();
						console.log('UP');
						inputs.eq(i).removeClass('focus');
						i = wrap(i - 1, 0, inputs.length);
						inputs.eq(i).addClass('focus');
					}
					else if (e.keyCode === 40) {
						e.preventDefault();
						console.log('DOWN');
						inputs.eq(i).removeClass('focus');
						i = wrap(i + 1, 0, inputs.length);
						inputs.eq(i).addClass('focus');
					}
					else if (e.keyCode === 13) {
						e.preventDefault();
						console.log('RETURN');
						inputs.eq(i)[0].checked = true;
						Sparky.dom.trigger(inputs.eq(i)[0], 'valuechange');
					}
				});
			});
		});
	}, 320);

	Sparky.fn.suggest = function(node) {
		if (Sparky.dom.tag(node) !== 'input') {
			console.warn('Sparky: data-fn="suggest" can only be applied to an <input>.');
			return;
		}

		var url   = node.getAttribute('data-suggest-data');
		var id    = node.getAttribute('data-suggest-template');
		var value = node.getAttribute('data-suggest-value');
		var fn    = node.getAttribute('data-suggest-fn');
		var minlength = parseInt(node.getAttribute('data-suggest-minlength') || 1, 10);

		if (!id || !url) {
			console.warn('Sparky: data-fn="suggest" requires attributes data-suggest-template and data-suggest-data.', node);
			return;
		}

		// Look for a data-suggest attribute having a tag in it
		Sparky.rsimpletags.lastIndex = 0;
		var tag = Sparky.rsimpletags.exec(url);
		var prop;

		if (tag) {
			if (url.length !== tag[0].length) {
				console.warn('Sparky: There is not just a simple tag in this attribute.');
				return;
			}

			prop = tag[1];
		}

		if (fn) { fn = this.data[fn]; }

		var tip = Sparky(id);
		Sparky.dom.append(document.body, tip);

		var scope;
		this.on('scope', function(sparky, newscope) {
			scope = newscope;
		});

		function listen(tip) {
			function update(data) {
				jQuery(tip).trigger('deactivate');

				if (value) {
					node.value = Sparky.render(value, data);
					Sparky.dom.trigger(node, 'change');
				}

				if (fn) {
					fn(node, scope, data);
				}

				window.requestAnimationFrame(function() {
					// Refocus the original input
					node.focus();
				});
			}

			function click(e) {
				update(Sparky.getScope(e.target));
			}

			function change(e) {
				if (e.target.checked) { return; }
				update(Sparky.getScope(e.target));
			}

			tip.addEventListener('click', click);
			tip.addEventListener('change', change);
			tip.addEventListener('valuechange', change);
		}

		listen(tip.filter(Sparky.dom.isElementNode)[0]);

		node.addEventListener('input', function(e) {
			var text = e.target.value;

			if (text.length < minlength) {
				jQuery(tip).trigger('deactivate');
				return;
			}

			if (tag) {
				activate(scope[prop], tip, node);
			}
			else {
				request(url + text, tip, node);
			}
		});

		node.addEventListener('blur', function(e) {
			jQuery(tip).trigger('deactivate');
		});
	};
})(this);
