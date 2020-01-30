(function(window) {
	"use strict";

	var debug  = true;
	var dom    = window.dom;
	var Sparky = window.Sparky;

	var on       = dom.events.on;
	var off      = dom.events.off;
	var delegate = dom.delegate;
	var identify = dom.identify;

	function dragstartButton(e) {
		var data = {
			"Text":             identify(e.target),
			"text/plain":       identify(e.target),
			//"application/json": JSON.stringify({})
		};

		var mimetype;

		// Wait for the next frame before setting the dragged flag. The dragged
		// flag is pretty much purely for style, and if it is styled immediately
		// the dragged icon also gets teh ghosted style, which we don't want.
		//window.requestAnimationFrame(function() {
		//
		//});

		for (mimetype in data){
			// IE only accepts the types "URL" and "Text". Other types throw errors.
			try {
				e.dataTransfer.setData(mimetype, data[mimetype]);
			}
			catch(e) {
				if (debug) { console.warn('[drag data] mimetype: ' + mimetype + ' Can\'t be set.'); }
			}
		}
	}

	function dragendButton(e) {
		jQuery('.dropzone').remove();
		jQuery('.dragover').removeClass('dragover');
	}

	Sparky.fn['data-on-drag'] = function(node, scopes, params) {
		var name = params[0];

console.log('DATA ON DRAG', node);

		var dragstart = delegate('[draggable]', dragstartButton);
		var dragend   = delegate('[draggable]', dragendButton);

		//.on('selectstart', '.node-button', cache, selectstartIE9)
		on(node, 'dragstart', dragstart);
		//.on('drag', '.node-button', cache, dragButton)
		on(node, 'dragend', dragend);

		this.then(function() {
			off(node, 'dragstart', dragstart);
			off(node, 'dragend', dragend);
		});

		//doc
		//.on('dragenter', scope, dragenterDoc)

		// node is never removed, so we dont worry about destroy.
		//this.on('destroy', function() {});
	};
})(window);
