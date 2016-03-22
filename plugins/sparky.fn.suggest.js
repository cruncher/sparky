(function(window) {
	var Sparky = window.Sparky;

	function wrap(i, min, max) {
		return i < min ? max - (min - i) :
			i >= max ? min + (i - max) :
			i ;
	}

	Sparky.fn.suggest = function(node) {
		if (Sparky.dom.tag(node) !== 'input') {
			console.warn('Sparky: data-fn="suggest" can only be applied to an <input>.');
			return;
		}

		var id = node.getAttribute('data-suggest-template');
		var url = node.getAttribute('data-suggest-url');

		if (!id || !url) {
			console.warn('Sparky: data-fn="suggest" requires attributes data-suggest-template and data-suggest-url.', node);
			return;
		}

		var tip = Sparky(id);

		var scope;

		function listen(tip) {
			function update(value) {
				node.value = value;
				jQuery(tip).trigger('deactivate');
				Sparky.dom.trigger(node, 'valuechange');
				window.requestAnimationFrame(function() {
					// Refocus the original input
					node.focus();
				});
			}

			function change(e) {
				if (!e.target.checked) { return; }
				update(e.target.value);
			}

			tip.addEventListener('change', change);
			tip.addEventListener('valuechange', change);
		}

		Sparky.dom.append(document.body, tip);

		listen(tip.filter(Sparky.dom.isElementNode)[0]);

		node.addEventListener('input', function(e) {
			var text = e.target.value;

			jQuery
			.ajax(url + text)
			.then(function(data) {
				if (!data || data.length === 0) { return; }
				tip.scope(Collection(data));

				var elem = tip.tojQuery();

				window.requestAnimationFrame(function() {
					elem.trigger({ type: 'activate', relatedTarget: node });

					var inputs = elem.find('input');

					var i = 0;

					inputs.eq(i).addClass('focus');

					console.log(i, inputs.eq(i)[0]);

					node.addEventListener('keydown', function(e) {
						e.preventDefault();

						if (e.keyCode === 38) {
							console.log('UP');
							inputs.eq(i).removeClass('focus');
							i = wrap(i - 1, 0, inputs.length);
							inputs.eq(i).addClass('focus');
						}
						else if (e.keyCode === 40) {
							console.log('DOWN');
							inputs.eq(i).removeClass('focus');
							i = wrap(i + 1, 0, inputs.length);
							inputs.eq(i).addClass('focus');
						}
						else if (e.keyCode === 13) {
							console.log('RETURN');
							inputs.eq(i)[0].checked = true;
							Sparky.dom.trigger(inputs.eq(i)[0], 'valuechange');
						}
					});
				});
			});
		});

		this.on('scope', function(sparky, newscope) {
			scope = newscope;
		});

		node.addEventListener('blur', function(e) {
			jQuery(tip).trigger('deactivate');
		});
	};
})(this);
