<h1>Sparky</h1>

<strong>Sparky is a model-agnostic live data binding view layer for an HTML/JS app. Sparky enhances the existing DOM with declarative data bindings, passes data properties through Django-style template filters and renders multiple changes in batches on browser frames.</strong>

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

Sparky is now observing changes to the object <code>Sparky.data['my-data']</code>.
When <code>model.type</code> changes, the <code>class</code> is rendered
as <code>'active-block'</code> or <code>'inactive-block'</code>.

Sparky also understands how to bind to SVG inside HTML.

### Using Sparky's template tags in HTML

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


### Live binding with {{ property }}

Render some content from the <code>text.title</code> property whenever it changes:

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
attribute to define two-way data binding.

### Static binding with {{{ property }}}

Render some content from the <code>text.title</code> property:

    <h1 data-model="text">{{{ title }}}</h1>

Here Sparky looks for the object <code>text</code> in <code>Sparky.data</code>
and renders the sparky tag <code>{{ title }}</code> from <code>text.title</code>.

### Absolute paths

The data-model attribute understands absolute paths to models inside
<code>Sparky.data</code>:

    <p data-model="text.meta">author: {{author}}, words: {{word_count}}</p>
    <h2>First contributor</h2>
    <p data-model="text.meta.contributors[0]">{{name}}</p>

The paths are standard JavaScript object notation. Use dots <code>.prop</code>
for string properties and brackets <code>[0]</code> for numbered keys.

### Relative paths

The data-model attribute also understands relative paths to models inside
parent models:

    <div class="language-{{lang}}" data-model="text">
        <p data-model="{{meta}}">author: {{author}}, words: {{word_count}}</p>
    </div>

Putting the <code>{{meta}}</code> tag inside of <code>data-model</code> makes Sparky
look for the <code>meta</code> object insdie the parent object, the <code>text</code> object.

### Sparky(node, model, ctrl)

Bind a DOM node to a model and a controller by calling <code>Sparky(node, model, ctrl)</code>.

Take this html, for example:

    <p id="#user">hello, {{username}}</p>

<strong>model is an object</strong>.

Where <code>ctrl</code> is <code>undefined</code>, <code>model</code>  is used as scope to render the node.

    var node = document.querySelector('#user');
    var data = {
            username: 'Arthur'
        };
    
    // Bind the node to data
    Sparky(node, data);
    
    // The node is updated whenever data is changed
    data.username = "Marco";

<strong>ctrl is a function.</strong>

Where <code>ctrl</code> is passed in, the return value of the <code>ctrl</code>
is used as scope to render the node.

    Sparky.ctrls['user-card'] = function(node, model, sparky) {
        var scope = {
            username: 'unknown';
        };
        
        Sparky.observe(model, 'username', function() {
            scope.username = model.username;
        });
        
        return scope;
    };

    var node = document.querySelector('#user');
    var model = {
            username: 'Arthur'
        };
    
    // Bind the node to data
    Sparky(node, model, Sparky.ctrls['user-card']);
    
    // The node is updated whenever data is changed
    model.username = "Marco";

Where the <code>ctrl</code> function returns <code>undefined</code>, the model is used as scope.

Sparky can also be called with the string names of models in <code>Sparky.data</code>
and string names of controllers in <code>Sparky.ctrls</code>.

    // Put data in Sparky's data object.
    Sparky.data['user'] = { username: 'Arthur' };
    
    // Bind the node to data
    Sparky(node, 'user', 'user-card');

<strong>Sparky creates a sparky object</strong>

The <code>Sparky(node, model, ctrl)</code> function creates a <code>sparky</code> object. The
sparky object is passed to the controller, and returned from the <code>Sparky</code>
function. Use it to listen to lifecycle events.

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


### Form fields

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

### Looping over a collection

Sparky has no special syntax for looping over a collection, but where
<code>data-model</code> resolves to an array or array-like collection object,
Sparky automatically loops over it, cloning the corresponding DOM node for all
the items in the collection. So the HTML:

    <ul>
        <li data-model="text.meta.contributors">
            <a href="{{url}}">{{name}}</a>
        </li>
    </ul>

Results in a DOM that looks like this:

    <ul>
        <!-- [Sparky] collection start -->
        <li data-model="text.meta.contributors[0]">
            <a href="http://github.com/cruncher/sparky">Sparky</a>
        </li>
        <li data-model="text.meta.contributors[1]">
            <a href="http://cruncher.ch">Marco</a>
        </li>
        <!-- [Sparky] collection end -->
    </ul>

The comment nodes are added automatically and are required by Sparky to maintain
the collection.

## data-ctrl

All the above examples use the model directly as the context for rendering the
DOM. Sparky uses the model by default, but you can create a scope object to use
instead.

    Sparky.ctrls['my-controller'] = function(node, model) {
        var scope = {
            lang: 'No language set'
        };
        
        // Return the scope object to use it for DOM rendering
        return scope;
    };

Where a controller returns undefined, the model is used as scope. But where a
controller returns an object, that object is used as scope for rendering the
DOM.

Tell Sparky to use the controller:

    <p data-ctrl="my-controller" data-model="text">I speak {{ lang }}</p>

The controller is passed the DOM node, and the model (where a
<code>data-model</code> is defined, otherwise model is undefined). Listen to
changes on the model to update the scope:

    Sparky.ctrls['my-controller'] = function(node, model) {
        var scope = {
            lang: 'No language set'
        };
        
        function updateLang(model) {
            scope.lang = model.lang === 'en' ? 'English' :
                model.lang === 'fr' ? 'French' :
                model.lang === 'dp' ? 'Dolphin' :
                model.lang ;
        }
        
        // Observe changes to the model
        Sparky.observe(model, 'lang', updateLang);
        
        // Initialise the scope
        updateLang(model);
        
        // Return the scope object to use it for DOM rendering
        return scope;
    };

Try updating the model:

    Sparky.data.text.lang = 'dp';

In Sparky scope objects are just objects you create. You can make them inherit
from other scopes and organise them however you like.

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
- prepad
- postpad
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

## Techniques

### Observing

#### Sparky.observe(object, property, fn);

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



