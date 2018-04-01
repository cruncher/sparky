
(function(window) {

	var dom = window.dom;
	var now = dom.now;

	// Render queue

	const queue = new Set();
	let frame;

	function run(time) {
		console.group('frame', (time / 1000).toFixed(3) + ' start ' + now().toFixed(3));

		frame = true;
		const t = now();
		let fn;

		for (fn of queue) {
			queue.delete(fn);
			fn(time);
		}

		frame = undefined;

		console.log('Render duration ' + (now() - t).toFixed(3) + 's');
		console.groupEnd();
	}

	function cue(fn) {
		//if (frame === true) {
		//	fn();
		//	return;
		//}

		queue.add(fn);

		if (frame === undefined) {
			console.log('(request master frame)')
			frame = requestAnimationFrame(run);
		}
	}

	function uncue(fn) {
		queue.delete(fn);

		if (frame !== undefined && frame !== true && queue.size === 0) {
			console.log('(cancel master frame)')
			cancelAnimationFrame(frame);
			frame = undefined;
		}
	}

	window.frame = {
		cue: cue,
		uncue: uncue
	};
})(window);

export default window.frame;
