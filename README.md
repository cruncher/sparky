
# Sparky

![alt tag](https://raw.githubusercontent.com/cruncher/sparky/master/images/sparky-logo.png)

<strong>Sparky is a live data binding templating engine that enhances the DOM
with declarative tags and composeable templates, updating tags and rendering
changes in batches at the browser frame rate for performance.</strong>

<a href="http://labs.cruncher.ch/sparky/">labs.cruncher.ch/sparky/</a>

## Latest build 2.2.0

* <a href="http://labs.cruncher.ch/sparky/dist/sparky.js">http://labs.cruncher.ch/sparky/dist/sparky.js</a> (~120k/60k gzipped, includes dependencies)
* <a href="http://labs.cruncher.ch/sparky/dist/sparky.min.js">http://labs.cruncher.ch/sparky/dist/sparky.min.js</a> (~90k/30k gzipped, includes dependencies)

## Getting started

Clone the repo:

    git clone git@github.com/cruncher/sparky.git
    cd sparky/
    git submodule update --init

Install node modules:

    npm install

Build <code>dist/dom.js</code>:

    npm run build-nodeps    // Omit dependencies
    npm run build           // Include dependencies

## API

### Sparky(selector, scope, options)

Sparky takes this:

    <div data-fn="scope:'data'" class="user {[.|yesno:'active']}">
        <a class="thumb" style="background-image: url('{[avatar]}')">{[name]}</a>
    </div>

    window.data = {
        avatar: '/username/avatar.png',
        name: 'Godfrey'
    };

    Sparky('.user');

And renders this:

    <div data-fn="scope:'data'" class="user active">
        <a class="thumb" style="background-image: url('/username/avatar.png')">Godfrey</a>
    </div>

The Sparky constructor takes a DOM fragment or a DOM node or a selector.

    var fragment = document.createDocumentFragment();
    Sparky(fragment);

    var node = document.querySelector('.user');
    Sparky(node);

    Sparky('.user');

The Sparky constructor takes an optional 2nd argument, scope.

    Sparky('.user', {
        avatar: '/username/avatar.png',
        name: 'Godfrey'
    });

And a third, an options object.

A sparky object is an array-like object of DOM nodes that have been bound to
scopes. It is a stream with methods to control the flow of scopes.
