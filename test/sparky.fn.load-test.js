
group('sparky-fn="load:url"', function(test, log, fixture) {
	var node   = fixture.children[0];
	var sparky = Sparky(node);

	test('[sparky-fn="load:url"]', function(equals, done) {
		equals('name: {[name]}', node.children[0].innerHTML);

		setTimeout(function() {
			equals('name: sparky', node.children[0].innerHTML);
			done();
		}, 1000);
	}, 2);
}, function() {/*
	<ul sparky-fn="load:'package.json'" style="font-size:0.875rem; font-family: 'Fira Mono', monospace;">
        <li>name: {[name]}</li>
        <li>version: {[version]}</li>
        <li>description: {[description]}</li>
    </ul>
*/});
