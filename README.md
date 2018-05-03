

"build": "npm run build-nodeps && cat fn/js/fn.js fn/js/observable.js fn/js/stream.js fn/js/stream.observe.js fn/js/time.js dom/polyfills/customevent.js dom/polyfills/document.scrollingelement.js dom/js/dom.js dist/sparky-nodeps.js > dist/sparky.js && minify dist/sparky.js && cat dom/css/dom.css css/sparky.css > dist/sparky.css",



# Sparky

![alt tag](https://raw.githubusercontent.com/cruncher/sparky/master/images/sparky-logo.png)

<strong>Sparky is a live data binding templating engine that enhances the DOM
with declarative tags and composeable templates, updating tags and rendering
changes in batches at the browser frame rate for performance.</strong>

<a href="http://labs.cruncher.ch/sparky/">labs.cruncher.ch/sparky/</a>

## Latest build 2.2.1

* <a href="http://labs.cruncher.ch/sparky/dist/sparky.js">http://labs.cruncher.ch/sparky/dist/sparky.js</a> (~120k/60k gzipped, includes dependencies)
* <a href="http://labs.cruncher.ch/sparky/dist/sparky.min.js">http://labs.cruncher.ch/sparky/dist/sparky.min.js</a> (~90k/30k gzipped, includes dependencies)

## Getting started

Clone the repo:

    git clone git@github.com/cruncher/sparky.git
    cd sparky/
    git submodule update --init

Install node modules:

    npm install

Build <code>dist/sparky.js</code>:

    npm run build-nodeps    // Omit dependencies
    npm run build           // Include dependencies

## API

### Sparky(selector)

Sparky takes this:

    <div data-fn="find:'data'" class="user {[.|yesno:'active']}">
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

And an optional second argument, scope.

    Sparky('.user', {
        avatar: '/username/avatar.png',
        name: 'Godfrey'
    });

A sparky object is a pushable stream of data objects that are mapped through
functions declared in the `sparky-fn` attribute and then rendered to tags.
