var testGroup  = window.testGroup;
var Observable = Observable;

testGroup('[sparky-fn]', function(test, log, fixture) {
    var fire = window.mockAnimationFrame();

    ('1', function(equals, done) {
        var p = fixture.querySelector('.test-1');
        var data1 = Observable({ property: '0' });

        equals('{[property]}', p.innerHTML);

        // Data passed on construction is rendered immediately
        var sparky = Sparky(p, data1);

        equals('0', p.innerHTML);
        fire();
        equals('0', p.innerHTML);

        // Data mutations are render on next frame
        data1.property = '1';
        equals('0', p.innerHTML);
        fire();
        equals('1', p.innerHTML);

        // Data pushed in are render on next frame
        var data2 = Observable({ property: '2' });

        sparky.push(data2);
        equals('1', p.innerHTML);
        fire();
        equals('2', p.innerHTML);

        data2.property = '3';
        equals('2', p.innerHTML);
        fire();
        equals('3', p.innerHTML);

        done(9);
    });

    test('2', function(equals, done) {
        var p = fixture.querySelector('.test-2');

        equals('{[property]}', p.innerHTML);

        // Nothing passed on construction removes the Sparky tags
        var sparky = Sparky(p);
        equals('', p.innerHTML);

        // Data mutations are render on next frame
        sparky.push({ property: 1 });
        equals('', p.innerHTML);
        fire();
        equals('1', p.innerHTML);

        done(4);
    });
}, function() {/*
    <p class="test-1">{[property]}</p>
    <p class="test-2">{[property]}</p>
*/})
