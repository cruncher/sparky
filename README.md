<h1>Sparky</h1>

<strong>Sparky is a model-agnostic live data binding view layer for an HTML/JS app. Sparky enhances the existing DOM with declarative data bindings, passes data properties through Django-style template filters and renders multiple changes in batches on browser frames.</strong>

![alt tag](https://github.com/cruncher/sparky/master/images/sparky-logo.png)

## Quick start

Sparky traverses the DOM automatically on <code>load</code>. It binds nodes with a
<code>data-model</code> attribute to model objects stored in <code>Sparky.data</code>,
and passes nodes with a <code>data-ctrl</code> attribute into controller functions
stored in <code>Sparky.ctrls</code>.

JS:

    Sparky.data['my-data'] = {
        title: 'My data',
        type: 'data'
    };

    Sparky.ctrls['my-ctrl'] = function(node, model) {
        var scope = {
            title: model.title,
            class: ''
        };
        
        Sparky.observe(model, 'type', function() {
            scope.class = model.type === 'data' ?
                'active' :
                'inactive' ;
        });
        
        return scope;
    };

HTML:

    <div class="{{class}}-block" data-model="my-data" data-ctrl="my-ctrl">
        <p>{{title}}</p>
    </div>

Sparky is now observing changes to the model object <code>Sparky.data['my-data']</code>.
When <code>model.type</code> changes, the <code>class</code> attribute is re-rendered
using the <code>scope</code> object returned by the controller.

Either or both <code>data-model</code> and <code>data-ctrl</code> can be defined. If a
<code>data-ctrl</code> is not given, Sparky uses the <code>model</code> directly as the
scope. If <code>data-model</code> is not given, <code>model</code> is <code>undefined</code>
inside the controller.

Sparky also understands how to bind to some SVG attributes.

## Sparky(node, model, ctrl)

To bind a DOM node to a model and a controller in JS, call <code>Sparky(node, model, ctrl)</code>.

Take this html, for example:

    <p id="#user">hello, {{username}}</p>

#### model is an object

Where <code>ctrl</code> is <code>undefined</code>, <code>model</code>  is used as scope to render the node.

    var node = document.querySelector('#user');
    var data = {
            username: 'Arthur'
        };
    
    // Bind the node to data
    Sparky(node, data);
    
    // The node is updated whenever data is changed
    data.username = "Marco";

#### ctrl is a function

Where <code>ctrl</code> is passed in, the return value of the <code>ctrl</code>
is used as scope to render the node. In Sparky scope objects are just plain objects
you create.

    Sparky.ctrls['user-card'] = function(node, model, sparky) {
        var scope = { username: 'unknown'; };
        
        Sparky.observe(model, 'username', function() {
            scope.username = model.username;
        });
        
        return scope;
    };

    var node = document.querySelector('#user');
    var model = { username: 'Arthur' };
    
    // Bind the node to data
    Sparky(node, model, Sparky.ctrls['user-card']);
    
    // The node is updated whenever data is changed
    model.username = "Marco";

Where the <code>ctrl</code> function returns <code>undefined</code>, the model is
used as scope.

Sparky can also be called with the string names of models in <code>Sparky.data</code>
and string names of controllers in <code>Sparky.ctrls</code>.

    // Put data in Sparky's data object.
    Sparky.data['user'] = { username: 'Arthur' };
    
    // Bind the node to data
    Sparky(node, 'user', 'user-card');

#### Sparky() creates a sparky object

The <code>Sparky(node, model, ctrl)</code> function creates a <code>sparky</code> object. 
The sparky object emits lifecycle and custom events. A sparky object is passed to the
controller, and returned from the <code>Sparky</code> function.

    Sparky.ctrls['user-card'] = function(node, model, sparky) {
        var scope = { username: 'unknown'; };
        
        function update() {
            scope.username = model.username;
        }
        
        Sparky.observe(model, 'username', update);
        
        sparky
        .on('ready', function() {
            // The node has bound and has been populated with any
            // existing model data.
        })
        .on('insert', function() {
            // The node has been inserted into the DOM.
            node.addEventListener('click', handlerFn);
        })
        .on('destroy', function() {
            // The node has been unbound from the model
            Sparky.unobserve(model, 'username', update);
        });
        
        return scope;
    };

    // Bind the node to data
    var sparky = Sparky(node, 'user', 'user-card');
    
    // Insert into the DOM
    sparky.appendTo(body);
    
    // Unbind the model from the DOM
    sparky.destoy();


## Sparky templates

For the following examples, let's give Sparky some data:

    Sparky.data['text'] = {
        title: "Sparky loves you",
        lang: "en",
        date: "2014-04-15",
        meta: {
            author: "stephband",
            word_count: 140,
            contributors: [{
                name: "Sparky",
                username: "sparky",
                url: "http://github.com/cruncher/sparky"
            }, {
                name: "Marco",
                username: "mbi",
                url: "http://cruncher.ch"
            }]
        }
    };


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


## Forms

Inputs, selects and textareas get 2-way data binding.
When the model changes, their values are updated.
When their values are changed, the model is updated.

Bind an <code>input[type="text"]</code> to
<code>Sparky.data.text.username</code>:

    <form class="user-form" data-model="text">
        <input type="text" name="username" value="" />
    </form>

The <code>name</code> attribute is used to tell Sparky which
property of the model to update. Text written into the input
is stored at <code>Sparky.data.text.username</code>, and changes to
Sparky.data.text.username update the input's value.

## Looping over a collection

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
- decimals
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

