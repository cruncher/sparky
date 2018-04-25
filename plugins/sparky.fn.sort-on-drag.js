(function(window) {
	"use strict";

    var dom    = window.dom;
	var Sparky = window.Sparky;

    var on             = dom.events.on;
    var off            = dom.events.off;
    var delegate       = dom.delegate;
	var after          = dom.after;
    var classes        = dom.classes;
    var preventDefault = dom.preventDefault;
	var query          = dom.query;
	var remove         = dom.remove;

	var overnode;
	var dropzone;
	var dropzones = [];

	function createDropzoneElement() {
		var node = dom.create('div', '', { class: 'dropzone', style: 'width: 20px; height: 20px; box-shadow: 0 0 0 2px black;' });
		return node;
	}

	function insertDropZones(node) {
		var blocks = query('[draggable]', node);
		var n = blocks.length;
		var dropzone, block;

		if (dropzones.length) {
			console.warn('dropzones shouldnt really be populated at this point.');
		}

		dropzones.length = blocks.length;

		while (n--) {
			block = blocks[n];
			dropzone = dropzones[n] = createDropzoneElement();
			after(block, dropzone);
		}
	}

	function hasData(e) {
		var types = e.dataTransfer.types;
		return types.length !== 0;
	}

	function dragenter(e) {
		if (!hasData(e)) { return; }
		e.preventDefault();

		if (overnode && overnode === e.currentTarget) { return; }

		overnode && classes(overnode).remove('dragover');
		overnode = e.currentTarget;
		classes(overnode).add('dragover');
		insertDropZones(overnode);
	}

	function drop(e, data) {
		var id = e.dataTransfer.getData('Text');
		var i0 = data.ids.indexOf(id);

		// Stop the browser from doing something defaulty like trying to
		// display the dragged thing in a new window.
		e.preventDefault();

		// This should not be possible, as we have already dragovered here.
		if (!overnode) { return; }

		classes(overnode).remove('dragover');
		overnode = undefined;

		var i1 = -1;

		if (dropzone) {
			// Work out insert point for the plug
			i1 = dropzones.indexOf(dropzone);
			dropzone = undefined;
		}

		dropzones.forEach(remove);
		dropzones.length = 0;

		// Has the index actually changed?
		if (i1 === i0) { return; }

		console.log('Sparky|sort-on-drag: item dragged from index ' + i0 + ' to index ' + i1);

		// This is where we call the app logic
		data.fn(i0, i1);
	}

	function dragenterDoc(e) {
		if (!overnode) { return; }
		if (overnode === e.target || overnode.contains(e.target)) { return; }

		var dropzonesClone;

		classes(overnode).remove('dragover');
		overnode = undefined;

		if (dropzone) {
			// Remove dropzones from overnode after a transition

			classes(dropzone).remove('dragover');
			dropzonesClone = dropzones.slice(0);
			dropzones.length = 0;

			// Wait till animation finishes

			dropzone.addEventListener('transitionend', function(e) {
				dropzonesClone.forEach(remove);
				dropzonesClone.length = 0;
			});
		}
		else {
			// Or remove them immediately

			dropzones.forEach(remove);
			dropzones.length = 0;
		}
	}

	function dragenterZone(e) {
		if (!hasData(e)) { return; }
		if (e.defaultPrevented) { return; }

		e.preventDefault();

		if (dropzone) {
			if (dropzone === e.delegateTarget) { return; }
			classes(dropzone).remove('dragover');
		}

		dropzone = e.delegateTarget;
		classes(dropzone).add('dragover');
	}

    on(document, 'dragenter', dragenterDoc);

	Sparky.fn['sort-on-drag'] = function(node, scopes, params) {
        var delegateDragEnter = delegate('.dropzone', dragenterZone);
		var ids = [];
		var scope;

		function updateIds() {
			ids.length = 0;
			ids.push.apply(ids, dom
				.children(node)
				.filter(dom.matches('[draggable]'))
				.map(dom.identify)
			);
		}

		function bind(ids) {
			on(node, 'dragenter', delegateDragEnter);
			on(node, 'dragenter', dragenter);
			on(node, 'dragover',  preventDefault);
			on(node, 'drop', drop, {
				ids: ids,
				fn: function(i0, i1) {
					if (!scope) { return; }
					// Shuffle the item into it's new position in the array
					ids.splice(i1, 0, ids.splice(i0, 1)[0]);
					scope.splice(i1, 0, scope.splice(i0, 1)[0]);
					console.log('SORT', i0, i1, scope.slice());
				}
			});
		}

		function unbind() {
			off(node, 'dragenter', delegateDragEnter);
			off(node, 'dragenter', dragenter);
			off(node, 'dragover',  preventDefault);
			off(node, 'drop',      drop);
		}

		bind(ids);
		this.then(unbind);

		return scopes.tap(function(object) {
			requestAnimationFrame(updateIds);
			scope = object;
		});
	};
})(window);
