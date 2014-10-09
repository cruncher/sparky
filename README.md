<h1>Sparky</h1>

![alt tag](https://raw.githubusercontent.com/cruncher/sparky/master/images/sparky-logo.png)

<strong>Sparky is a model-agnostic live data binding view layer for an HTML/JS app. Sparky enhances the existing DOM with declarative data bindings, passes data properties through Django-style template filters and renders multiple changes in batches on browser frames.</strong>

## Quick start

Sparky traverses the DOM automatically on <code>load</code>. It binds nodes with a
<code>data-model</code> attribute to model objects stored in <code>Sparky.data</code>,
and passes nodes with a <code>data-ctrl</code> attribute into controller functions
stored in <code>Sparky.ctrls</code>.

HTML:

    <div class="{{type}}-block" data-model="my-data" data-ctrl="my-ctrl">
        <input type="text" name="{{title}}" />
        <p>{{title}} by Sparky!</p>
    </div>

JS:

    Sparky.data['my-data'] = {
        title: 'my data',
        type: 'data'
    };

    Sparky.ctrls['my-ctrl'] = function(node, model) {
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

Sparky takes the <code>scope</code> object returned by the controller, listens
to it for changes and live-updates the DOM. Here Sparky updates the
<code>input</code> value and the text inside <code>&lt;p&gt;</code> when
<code>scope.title</code> changes.

The controller is observing changes to the model <code>'my-data'</code> and
updating the <code>scope</code>.

Inputs get two-way data binding. Typing text into the input will live-update
<code>model.title</code>.

Either or both <code>data-model</code> and <code>data-ctrl</code> can be defined
for Sparky to template a node. Where there is no <code>data-model</code>
attribute, the controller is passed just one argument, <code>node</code>. If
there is no <code>data-ctrl</code> attribute Sparky uses the model
directly as scope. 

If we didn't care about converting text from uppercase to lowercase, the example
above could be written without the controller, and Sparky would use the model
directly as scope:

HTML:

    <div class="{{type}}-block" data-model="my-data">
        <input type="text" name="{{title}}" />
        <p>{{title}} by Sparky!</p>
    </div>

JS:

    Sparky.data['my-data'] = {
        title: 'my data',
        type: 'data'
    };

This is a very simple way to get an app working quickly on a page.

Sparky also understands how to bind to some SVG attributes.
Read more about <a href="#sparky-templates">Sparky templates</a>.

## Sparky

#### The data-ctrl attribute

The <code>data-ctrl</code> attribute defines which controller(s) to run when
sparky binds this element.

    <div data-ctrl="my-ctrl"></div>

Where multiple controllers are defined, they are run in the given order. The
return value of the first controller is used as scope to update the node.

    <div data-ctrl="my-ctrl-1 my-ctrl-2">
        Today is {{day}}.
    </div>

If the controller returns undefined the model is used as the scope.

#### Defining a controller function

Controllers are stored in <code>Sparky.ctrl</ctrl>. A controller is a function
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

#### The data-model attribute

The <code>data-model</code> attribute defines a model that is use to update the
node. Where no <code>data-ctrl</code> is given, the model is used directly as
scope. Controllers are passed the model as the second argument.

    <div data-model="my-model">
        Today's date: {{date}}
    </div>
    
    <div data-model="my-model" data-ctrl="my-ctrl">
        Today is {{day}}.
    </div>

#### Defining a model object

Models are stored in <code>Sparky.data</code>. A model is an object that Sparky
watches for changes.

    Sparky.data['my-model'] = {
        date: new Date()
    };

#### Sparky(node, model, ctrl)

To bind a node in JS, call <code>Sparky(node, model, ctrl)</code>.

## parameters

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

## return value

<code>sparky</code>: sparky object
Used to listen to lifecycle events and communicate with controllers.
The sparky object is created and any controllers are called with the sparky
object as their context before it is returned.

## The sparky object

The sparky object emits lifecycle events (and your custom events, so you can use
it to hook it into rest of your app if necessary).

<code>ready</code>: triggered after Sparky first updates the node

<code>insert</code>: triggered when the node is inserted into the DOM (BUGGY)

<code>destroy</code>: triggered when the node has been unbound from the model
and removed from the DOM

Controllers are called with a <code>sparky</code> object as their context. It's
common to listen to lifecycle events inside a controller:

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
<code>sparky</code> object as context. The sparky object can be used to pass
messages between controllers.

## Sparky templates

#### Live binding with {{tag}}

Render some content from the <code>text.title</code> property and re-render
whenever it changes:

    <h1 data-model="text">{{ title }}</h1>

Sparky looks for the object <code>text</code> inside <code>Sparky.data</code> and
renders the sparky tag <code>{{ title }}</code> from <code>text.title</code>.
Whenever <code>text.title</code> is changed, the <code>{{ title }}</code> tag is
re-rendered.

Bind a class to the <code>lang</code> property:

    <h1 class="language-{{lang}}" data-model="text">{{title}}</h1>

Here Sparky renders <code>text.lang</code> to the <code>{{lang}}</code> tag and
<code>text.title</code> to the <code>{{title}}</code> tag.

Sparky looks for tags in text nodes or attributes. The list of attributes it
looks in is limited to <code>href</code>, <code>title</code>, <code>id</code>,
<code>style</code>, <code>src</code> and <code>alt</code>. You can change the
list by modifying the array <code>Sparky.attributes</code>.

Form elements – inputs, selects and textareas – also use the <code>name</code>
attribute to define two-way data binding. More on that later.

#### Static binding with {{{tag}}}

Render some content from the <code>text.title</code> property once just once.
The tag is not re-rendered when <code>text.title</code> changes:

    <h1 data-model="text">{{{ title }}}</h1>

#### Absolute paths

The data-model attribute understands absolute paths in JavaScript object notation
to models inside <code>Sparky.data</code>:

    <p data-model="text.meta">author: {{author}}, words: {{word_count}}</p>
    <h2>First contributor</h2>
    <p data-model="text.meta.contributors[0]">{{name}}</p>

Properties in a path can contain dashes (<code>-</code>).

    <p data-model="text.spoken-lang">...</p>

#### Relative paths

The data-model attribute also understands relative paths to models inside
parent models. Putting the <code>{{meta}}</code> tag inside of <code>data-model</code>
makes Sparky look for the <code>meta</code> object insdie the parent object,
the <code>text</code> object.

    <div class="language-{{lang}}" data-model="text">
        <p data-model="{{meta}}">author: {{author}}, words: {{word_count}}</p>
    </div>

#### Looping over a collection

Sparky has no special syntax for looping over a collection, but where
<code>data-model</code> resolves to an array or array-like object,
Sparky automatically loops over it, cloning the corresponding DOM node for all
the items in the collection. So the HTML:

    <ul>
        <li data-model="text.meta.contributors">
            <a href="{{url}}">{{name}}</a>
        </li>
    </ul>

Results in a DOM that looks like this:

    <ul>
        <li>
            <a href="http://github.com/cruncher/sparky">Sparky</a>
        </li>
        <li>
            <a href="http://cruncher.ch">Marco</a>
        </li>
        <!-- [Sparky] data-model="text.meta.contributors" -->
    </ul>

(The comment node is added automatically and is required by Sparky to maintain
the collection. This technique is nicked from AngularJS.)

#### Forms

Inputs, selects and textareas get 2-way data binding.
When the model changes, their values are updated.
When their values are changed, the model is updated.

Bind an <code>input[type="text"]</code> to
<code>text.username</code>:

    <form class="user-form" data-model="text">
        <input type="text" name="{{username}}" value="" />
    </form>

The <code>name</code> attribute is used to tell Sparky which
property of the model to update. Text written into the input
is stored at <code>Sparky.data.text.username</code>, and changes to
Sparky.data.text.username update the input's value.

## Template filters

Display the date, formatted:

    <h1 class="language-{{lang}}" data-model="text">
        {{title}}
        <time>{{date|date:'d M Y'}}</time>
    </h1>

Sparky has a number of template filters for modifying and formatting data. You
can also create your own. Sparky template filter syntax is the same as
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
- floatformat
- join
- json
- last
- length
- linebreaksbr
- lower
- multiply
- parseint
- pluralize
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

Plus some of it's own:

- decibels – Takes a number as a ratio of powers and performs 20log10(number) to render it on the decibel scale. Useful when working with WebAudio parameters.
- decimals – Alias of floatformat.
- get:'propertyName' – Takes an object and renders the named property.
- lowercase – Alias of lower.
- percent – Takes a number and multiplies by 100 to render it as a percentage.
- prepad: n, 'character' – 
- postpad: n, 'character' – 
- symbolise – Converts common values to symbolic equivalents: JavaScript's number Infinity becomes '∞'.

### Using Sparky with Django

If you do happen to be using Django, Sparky's template tags will clash with
Django's. To avoid Sparky templates being read by Django, wrap them in Django's
<code>{% verbatim %}</code> tag:

    {% verbatim %}
    <h1 class="language-{{lang}}" data-model="text">
        {{title}}
        <time>{{date|date:'d M Y'}}</time>
    </h1>
    {% endverbatim %}

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

