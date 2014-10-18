<h1>Sparky</h1>

![alt tag](https://raw.githubusercontent.com/cruncher/sparky/master/images/sparky-logo.png)

<strong>Sparky is a model-agnostic live data binding view layer for an HTML/JS app. Sparky enhances
the existing DOM with declarative data bindings, passes data properties through Django-style
template filters and renders multiple changes in batches on browser frames for performance.</strong>

## Quick start

Sparky wires up the DOM automatically on <code>load</code>. He binds nodes with
a <code>data-model</code> attribute to model objects stored in
<code>Sparky.data</code>, and passes nodes with a <code>data-ctrl</code>
attribute to controller functions stored in <code>Sparky.ctrl</code>.

HTML:

    <div class="{{type}}-block" data-model="my-data">
        <input type="text" name="{{title}}" />
        <p>{{title|uppercase}} loves you!</p>
    </div>

JS:

    Sparky.data['my-data'] = {
        title: 'Sparky',
        type: 'user'
    };

Here a Sparky template is live bound to the properties of <code>my-data</code>.
The result is:

    <div class="user-block" data-model="my-data">
        <input type="text" name="{{title}}" value="Sparky" />
        <p>SPARKY loves you!</p>
    </div>

Live binding means that when the data changes, the DOM is kept up-to-date.
Inputs get two-way binding. Typing text into the input will live update 
<code>my-data.title</code> (and thus also the text in the paragraph).

Sparky defaults to using models directly as scope for rendering templates,
making it quick and easy to set up basic views for an app. Where more control is
needed, a controller function can be used to return a different object to be
used as scope.

HTML:

    <div class="{{type}}-block" data-model="my-data" data-ctrl="my-ctrl">
        <input type="text" name="{{title}}" />
        <p>{{title}} loves you!</p>
    </div>

JS:

    Sparky.ctrl['my-ctrl'] = function(node, model) {
        var scope = {
            title: model.title,
            type: model.type
        };

        // Watch for changes to title
        Sparky.observe(model, 'title', function() {
            scope.title = model.title.toUpperCase();
        });

        Sparky.observe(scope, 'title', function() {
            model.title = scope.title.toLowerCase();
        });

        // Return the scope object Sparky uses to
        // render the node.
        return scope;
    };

A controller function is passed the node and the model (where
<code>data-model</code> is given). Here, the controller watches the model for
changes to <code>title</code> and performs an uppercase/lowercase transform.
<code>type</code> is set on <code>scope</code> once and then left unchanged.
The controller returns <code>scope</code> to make Sparky use it to render the
template.

Either or both <code>data-model</code> and <code>data-ctrl</code> can be defined
for Sparky to template a node.

## Sparky templates

#### The data-ctrl attribute

The <code>data-ctrl</code> attribute defines which controller(s) to run when
sparky binds this element.

    <div data-ctrl="my-ctrl">{{day}}</div>

You can find controllers by logging <code>Sparky.ctrl</code>.

Controllers are simply functions that are called when Sparky scans this node.
The return value of the controller is used as scope for the template to bind
to, unless that value is <code>undefined</code>, in which case scope is the model.

You can define more than one controller. They are run in order. The return value
of the last controller is used as scope.

    <div data-ctrl="my-ctrl-1 my-ctrl-2">
        Today is {{day}}.
    </div>

<a href="#define-a-controller-function">Define a controller function</a>.

#### The data-model attribute

The <code>data-model</code> attribute names a model object in
<code>Sparky.data</code> to use as scope.

    <div data-model="my-model">
        <h1>{{title}}</h1>
    </div>

    Sparky.data['my-model'] = {
        "title": "Splodge",
        "lang": "en",
        "path-to": {
            "meta": {
                "author": "Sparky",
                "word-count": 1,
                "url": 'http://'
            }
        }
    };

The <code>data-model</code> attribute understands absolute paths to models
inside <code>Sparky.data</code> written in dot notation:

    <p data-model="text.path-to.meta">author: {{author}}, words: {{word-count}}</p>

Yes, it's fine with property names with a '-' in them.
It also understands relative paths to models in the current scope, when wrapped in a tag:

    <div data-model="my-model">
        <p data-model="{{path-to.meta}}">{{author}}</p>
    </div>

If <code>data-ctrl</code> is defined the model is passed to a controller, and the return
value of the controller is used as scope to update the template (unless the controller
returns <code>undefined</code>, in which case the model is used as scope).

<a href="#define-a-model-object">Define a model object</a>.

#### {{tag}}

Sparky template tags will be familiar to anyone who has written a Django
template. Sparky tags, however, perform live data binding.

    <h1 data-model="my-model">{{ title }}</h1>

The title tag is bound to changes in <code>my-model.title</code>.

Tags also grock paths:

    <h1 data-model="my-model" class="words-{{path-to.meta.word-count}}">{{title}}</h1>

#### {{tag|filter}}

Modify scope values with filters before updating the DOM:

    <h1 data-model="my-model" class="{{selected|yesno:'active','inactive'}}">{{title|uppercase}}</h1>

More about <a href="#sparky-template-filters">filters</a>.

#### {{{tag}}}

A triple bracket tag updates from the scope once only.

    <h1 data-model="my-model">{{{ title }}}</h1>

These tags are updated once from the scope (in this case my-model), but they don't live bind to changes.
If you know where you can do it, this can be good for performance.

#### attributes

Sparky looks for tags in text nodes and the following attributes:

- <code>href</code>
- <code>title</code>
- <code>id</code>
- <code>style</code>
- <code>src</code>
- <code>alt</code>

You can change the list by modifying the array <code>Sparky.attributes</code>.

inputs, selects and textareas also use:

- <code>name</code>

They're a bit special. They get two-way data binding.

#### input, select and textarea nodes

Inputs, selects and textareas get 2-way data binding.
When the scope changes, their values are updated.
And when their values are changed, the scope is updated.

    <form class="user-form" data-model="my-model">
        <input type="text" name="{{title}}" value="" />
    </form>

The <code>name</code> attribute is used to tell Sparky which
property of the current scope to bind to. Probably best not
to leave spaces in the tag.

#### Loop over a collection

Sparky has no special syntax for looping over a collection, but where
<code>data-model</code> resolves to an array or array-like object
Sparky automatically loops over it, cloning the corresponding DOM node for all
the items in the collection. So this...

    <ul>
        <li data-model="contributors">
            <a href="{{url}}">{{name}}</a>
        </li>
    </ul>

    Sparky.data.contributors = Sparky.Collection([
        { name: "Sparky",   url: "http://github.com/cruncher/sparky" },
        { name: "Cruncher", url: "http://cruncher.ch" }
    ]);

...results in a DOM that looks like this<a href="#-note">*<sup>note</note></a>:

    <ul>
        <li>
            <a href="http://github.com/cruncher/sparky">Sparky</a>
        </li>
        <li>
            <a href="http://cruncher.ch">Marco</a>
        </li>
    </ul>

## Sparky API

#### Define a controller function

Controllers are stored in <code>Sparky.ctrl</code>. A controller is a function
that is run just before sparky data-binds the node. The return value of the
controller is used as scope to update the tags in the sparky template. In Sparky
scope objects are just plain objects you create.

    Sparky.ctrl['my-ctrl-1'] = function(node, model) {
        var scope = { day: 'unknown'; };

        // Listen for changes on a model
        Sparky.observe(model, 'date', function() {
            if (model.date === '2014-12-25') {
                // Update the scope
                scope.day = 'Christmas!';
            }
        });

        return scope;
    };

Where the <code>ctrl</code> function returns <code>undefined</code>, Sparky uses
the model as scope.

#### Define a model object

Models are stored in <code>Sparky.data</code>. A model is an object that Sparky
watches for changes.

    Sparky.data['my-model'] = {
        date: new Date()
    };

Sparky is agnostic about how you structure your apps. How you structure
your data models is how you control the paths used in your templates.
Store your models in <code>Sparky.data</code> to give them to Sparky templates
bound on DOM load, or bind them yourself with <code>Sparky(node, model, ctrl)</code>. 

#### Sparky(node, model, ctrl)

To bind a node in JS, call <code>Sparky(node, model, ctrl)</code>.

##### parameters

<code>node</code>: DOM node | document fragment | string

A string defines the <code>id</code> of a <code>&lt;template&gt;</code>.
<code>node</code> is a required parameter.

<code>model</code>: object | string | undefined

A string defines a path to an object in <code>Sparky.data</code> using dot
notation.

<code>ctrl</code>: function | string | undefined

A string defines a name, or a space-separated list of names of ctrl functions
stored in <code>Sparky.ctrl</code>. Controller functions are called with
<code>(node, model)</code>.

##### return value

<code>sparky</code>: sparky object

Used to listen to lifecycle events and can be used to communicate with controllers.

##### The sparky object

The sparky object emits lifecycle events (and your custom events, so you can use
it to hook it into rest of your app if necessary).

<code>ready</code>: triggered after Sparky first updates the node

<code>insert</code>: triggered when the node is inserted into the DOM (BUGGY)

<code>destroy</code>: triggered when the node has been unbound from the model
and removed from the DOM

Controllers are called with the <code>sparky</code> object as their <code>this</code> value.
It's common to listen to lifecycle events inside a controller:

    function myCtrl(node, model) {
        var scope = { day: 'unknown'; };
        
        this.on('ready', function() {
            // The node has bound and has been populated with any
            // existing model data.
        });
        
        this.on('insert', function() {
            // The node has been inserted into the DOM.
        });
        
        this.on('destroy', function() {
            // The node has been unbound from the model and
            // removed from the DOM
        });

        return scope;
    };

    // Bind the node to data
    var sparky = Sparky(node, 'user', myCtrl);
    
    // Destroy Sparky's bindings and remove the node from the DOM
    sparky.destoy();

Where multiple controllers are defined, they are called with the same
<code>sparky</code> object as context. The sparky object could be used to pass
messages between controllers.

## Sparky template filters

Display the date, formatted:

    <h1 class="language-{{lang}}" data-model="text">
        {{title}}
        <time>{{date|date:'d M Y'}}</time>
    </h1>

Sparky has a number of template filters for modifying and formatting data. You
can also create your own. Sparky template filter syntax is similar to
<a href="http://docs.django.com/templates">Django template</a> filter syntax:

    <p>{{ date|date:'d M Y' }}</p>

Sparky has a subset of the Django filters:

- add
- capfirst
- cut
- date
- default
- escape
- first
- floatformat: number
- join
- json
- last
- length
- linebreaksbr
- lower
- multiply: number
- parseint
- pluralize: 
- random
- replace
- safe
- slice
- slugify
- striptags
- striptagsexcept
- time
- truncatechars
- unordered_list
- yesno

And some of it's own:

- decibels: number – Takes a number as a ratio of powers and performs 20log10(number) to render it on the decibel scale. Useful when working with WebAudio parameters.
- decimals – Alias of floatformat.
- get:'propertyName' – Takes an object and renders the named property.
- lowercase – Alias of lower.
- percent – Takes a number and multiplies by 100 to render it as a percentage.
- prepad: n, 'character' – 
- postpad: n, 'character' – 
- symbolise – Converts common values to symbolic equivalents: JavaScript's number Infinity becomes '∞'.

## Notes

#### Using Sparky with Django

If you do happen to be using Django, Sparky's template tags will clash with
Django's. To avoid Sparky templates being read by Django, wrap them in Django's
<code>{% verbatim %}</code> tag:

    {% verbatim %}
    <h1 class="language-{{lang}}" data-model="text">
        {{title}}
        <time>{{date|date:'d M Y'}}</time>
    </h1>
    {% endverbatim %}

#### <a href="#loop-over-a-collection">* note</a>

It actually looks like this:

    <ul>
        <li>
            <a href="http://github.com/cruncher/sparky">Sparky</a>
        </li>
        <li>
            <a href="http://cruncher.ch">Marco</a>
        </li>
        <!-- [Sparky] data-model="text.meta.contributors" -->
    </ul>

The comment node is added automatically and is required by Sparky to maintain
the collection. This technique is nicked from AngularJS.

#### Sparky says thankwoo

to Mariana Alt (<a href="http://www.alt-design.ch/">www.alt-design.ch</a>) for drawing me for my logo.


<!--#### Sparky.observe(object, property, fn);

Sparky.observe observes changes to the property of an object by
reconfiguring it as a getter/setter. This is very fast but has a
limitation or two.

Sparky.observe can't listen for changes to the length of an array,
as arrays don't allow the length property to be configured. But it
can listen for changes to the length of a collection object:

    var collection = Sparky.Collection(array);

(Sparky can handle arrays, but uses dirty checking internally to observe
the length. You get better performance from a collection object.)

#### Sparky.unobserve(object, property, fn);

Unbind an observer fn from the object property.

#### Adapt Sparky to your data models

If you want to use a different means of observing changes to data,
overwrite Sparky.observe and Sparky.unobserve with your own functions.
Say your models emit events, and you bind to them with .on() and .off()
methods:

   Sparky.observe = function(object, property, fn) {
       object.on(property, fn);
   };

Don't forget the unobserver:

   Sparky.unobserve = function(object, property, fn) {
       object.off(property, fn);
   }
-->

