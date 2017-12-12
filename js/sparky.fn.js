
// Sparky.fn

Sparky.nodeToString = Fn.id;

(function(window) {
	var Sparky = window.Sparky;

	// Detect IE
	var isIE = !!(document.all && document.compatMode || window.navigator.msPointerEnabled);

	// Logs nodes, scopes and data.
	Sparky.fn.log = function(node, scopes) {
		var sparky = this;

		// In IE11 and probably below, and possibly Edge, who knows,
		// console.groups can arrive in really weird orders. They are not at all
		// useful for debugging as a result. Rely on console.log.

		function log(scope) {
			//console[isIE ? 'log' : 'group']('Sparky: scope ' + Sparky.nodeToString(node));
			//console.log('data ', sparky.data);
			console.log('Sparky node:', node, 'scope:', scope);
			//console.log('fn   ', node, sparky.fn);
			//console[isIE ? 'log' : 'groupEnd']('---');
		}

		//console[isIE ? 'log' : 'group']('Sparky: run   ' + Sparky.nodeToString(node));
		//console.log('data ', sparky.data);
		//console[isIE ? 'log' : 'groupEnd']('---');

		return scopes.tap(log);
	};
})(this);

(function(window) {
	"use strict";

	var assign = Object.assign;
	var dom    = window.dom;
	var Sparky = window.Sparky;

	assign(Sparky.fn, {
		"show-on-scope": function(node, scopes) {
			scopes.tap(function() {
				window.requestAnimationFrame(function() {
					dom.classes(node).remove('sparky-hidden');
				});
			});
		}
	});
})(this);

(function(window) {
	"use strict";

	var assign = Object.assign;
	var Sparky = window.Sparky;

	assign(Sparky.fn, {
		html: function(node, scopes) {
			scopes.tap(function(html) {
				node.innerHTML = html;
			});
		}
	});
})(this);

(function(window) {
	"use strict";

	var assign = Object.assign;
	var Fn = window.Fn;

	function preventDefault(e) {
		e.preventDefault();
	}

	Sparky.scope = function(node) {
		console.warn('Sparky: Sparky.scope() deprecated in favour of Sparky.getScope()')
		return Sparky.getScope(node);
	};

	Sparky.setScope = function(node, scope) {
		if (!window.jQuery) {
			throw new Error(Sparky.attributePrefix + 'fn="store-scope" requires jQuery.');
		}

		window.jQuery && jQuery.data(node, 'scope', scope);
	};

	Sparky.getScope = function(node) {
		if (!window.jQuery) {
			throw new Error(Sparky.attributePrefix + 'fn="store-scope" requires jQuery.');
		}

		return jQuery.data(node, 'scope');
	};

	function getCookie(name) {
        var cookieValue = null;
        var cookies, cookie, i;

        if (document.cookie && document.cookie !== '') {
            cookies = document.cookie.split(';');
            for (i = 0; i < cookies.length; i++) {
                cookie = cookies[i] && cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

	Object.assign(Sparky.fn, {
		"prevent": function(node, scopes, params) {
			node.addEventListener(params[0], preventDefault);
		},

		"ajax-on-submit": function(node, scopes, params) {
			var method = node.getAttribute('method') || 'POST';
			var url    = node.getAttribute('action');

			if (!Fn.isDefined(url)) {
				throw new Error('Sparky: fn ajax-on-submit requires an action="url" attribute.');
			}

			var submit;

			node.addEventListener('submit', preventDefault);

			scopes.tap(function(scope) {
				if (submit) { node.removeEventListener('submit', submit); }

				submit = function(e) {
					var url = node.getAttribute('action');

					// Axios
					axios
					.post(url, scope, {
						headers: { "X-CSRFToken": getCookie('csrftoken') }
					})
					.then(function (response) {
						console.log(response);

						if (response.data) {
							assign(scope, response.data);
						}
					})
					.catch(function (error) {
						console.log(error);
					});

					// jQuery
					//jQuery.ajax({
					//	//type: method.toLowerCase(),
					//	//url:  url,
					//	//data: JSON.stringify(scope),
					//	//dataType: 'json'
					//})
					//.then(function(value) {
					//	console.log(value);
					//});
				};

				node.addEventListener('submit', submit);
			})

			//this
			//.on('destroy', function() {
			//	node.removeEventListener('submit', submit);
			//});
		},

		"expose-scope": function(node, scopes) {
			scopes.tap(function(scope) {
				Sparky.setScope(node, scope);
			});
		}
	});
})(this);


(function() {
	"use strict";

	Sparky.fn['x-scroll-slave'] = function(node) {
		var name = node.getAttribute(Sparky.attributePrefix + 'x-scroll-master');
		var master;

		function update() {
			node.scrollLeft = master.scrollLeft;
		}

		this
		.on('dom-add', function() {
			master = document.getElementById(name);

			if (!master) {
				console.error(node);
				throw new Error('Sparky scroll-x-slave: id="' + name + '" not in the DOM.');
			}

			master.addEventListener('scroll', update);
			update();
		})
		.on('destroy', function() {
			if (!master) { return; }
			master.removeEventListener('scroll', update);
		});
	};

	Sparky.fn['y-scroll-slave'] = function(node) {
		var name = node.getAttribute(Sparky.attributePrefix + 'y-scroll-master');
		var master = document.getElementById(name);

		if (!master) {
			console.error(node);
			throw new Error('Sparky scroll-x-slave: id="' + name + '" not in the DOM.');
		}

		function update() {
			node.scrollTop = master.scrollTop;
		}

		master.addEventListener('scroll', update);
		update();

		this.on('destroy', function() {
			master.removeEventListener('scroll', update);
		});
	};
})();
