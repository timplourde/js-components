

# JS Components

This is a tutorial with several examples of how to wire up JavaScript components, emphasizing the pros and cons of each. Techniques used include traditional callbacks, event delegation, [Lucid.js](http://robertwhurst.github.com/LucidJS/) event emitters, pub/sub using [Amplify.js](http://amplifyjs.com/) and finally client-side message bus using [Postal.js](https://github.com/ifandelse/postal.js).

This tutorial is intended for web developers who are starting to build complex client-side features (without a rich component libraries like YUI or EXT.JS) and encountering maintainability/flexability issues.  

## Before You Begin

The examples in this turorial:
* Use [Knockout.js](http://knockoutjs.com/) for basic data-binding/templating/MVVM functionality.  If you are not familiar with Knockout, check out the online tutorials at [learn.knockoutjs.com](http://learn.knockoutjs.com/).  It's worth your time!
* Can easily be re-written to have each component use different MV* libraries internally such as Backbone.js or whatever.
* Don't bother to be feature-complete with stuff like input validation.

The examples also use a basic technique for "constructor functions" like so:

	foo = function(){
		var self = this;
		self.public = function(){
			// this is a public function
		};
		var private = function(){
			// this is a private function
		}
	};
	var x = new foo();
	console.log(x);	// notice how only 'public' is visible

This is not the most effecient/usable way of constructing objects, but it's easy to understand.


	
# Requirements

You need to build an application for a Financial Services company which will consist of two components:

1. **Portfolio Editor:** The user builds a portfolio by adding investments (by ticker symbol) and setting their allocation percentages (0-100).  The user can delete investments too.  

2. **Portfolio Profile:** Whenever the portfolio changes (an investment is added, removed or updated), this component will analyze the investments in the profile and provide feedback to the user.  Here are the rules:
	* If the total != 100, display an error
	* If > 50% in APPL, it's considered "bad" and "Too Conservative"
	* If > 1% in FB, it's considered "bad" and "Stupid"
	* If > 20% in MSFT AND > 20% in GOOG, it's considered "good" and "Well Balanced"
	* Else, "No Recommendations"

It is **extremely important** that both components are decoupled because they will be used in other places in the application.

## Example 1: Callback in Constructor

In this example, when constructing the ``editor`` object, we pass in an **optional** ``portfolioChangedCallback`` option which gets called whenever the portfolio changes.  This is a simple technique and works well given the requirements.

	$(document).ready(function () {

		var viewModel = {};

		viewModel.profile = new PortfolioProfile();

		viewModel.editor = new PortfolioEditor({
			investments: [{ name: "MSFT", percentage: 25 },
						   { name: "GOOG", percentage: 25 },
						   { name: "APPL", percentage: 50}],
			portfolioChangedCallback: viewModel.profile.update
		});

		ko.applyBindings(viewModel);

	});

Mission accomplished, time for happy hour!

# Requirements Change!

As a user, I need any "troublesome" investments to be highlighed in the Portfolio Editor whenver the Portfolio Profile detects a "bad" portfolio so I can identify which ones need my attention.

So now we need two-way communication between our components.  Let's see how we can achieve that while remaining decoupled.

## Example 2: Chicken and Egg

We'll use the same technique to add an event handler for the ``profile`` as we did with the ``editor``.  

	$(document).ready(function () {

		var viewModel = {};

		viewModel.profile = new PortfolioProfile({
			foundBadInvestmentsCallback: viewModel.editor.highlightInvestments
		});

		viewModel.editor = new PortfolioEditor({
			investments: [{ name: "MSFT", percentage: 25 },
						   { name: "GOOG", percentage: 25 },
						   { name: "APPL", percentage: 50}],
			portfolioChangedCallback: viewModel.profile.update
		});
	  
		ko.applyBindings(viewModel);

	});


This **DOES NOT WORK** however because the ``editor`` doesn't exist when we construct the ``profile``.  There's no way to solve it using this technique because it's a [chicken-and-egg](http://en.wikipedia.org/wiki/Chicken_or_the_egg) problem.  

## Example 3: Nested Callbacks

One funky way to get around this issue is to embed a callback function in the message that is passed from the ``editor`` to the ``profile``.  

	$(document).ready(function () {

		var viewModel = {};

		viewModel.profile = new PortfolioProfile();

		viewModel.editor = new PortfolioEditor({
			investments: [{ name: "MSFT", percentage: 25 },
						   { name: "GOOG", percentage: 25 },
						   { name: "APPL", percentage: 50}],
			portfolioChangedCallback: viewModel.profile.update
		});
	  
		ko.applyBindings(viewModel);

	});

You'll notice an additonal property called ``foundBadInvestmentsCallback`` being sent to the ``profile`` which it later calls if any troublesome investments are found.

### Pros

We have avoided the chicken-and-egg problem successfully and we're still decoupled because each component doesn't know about each other.

### Cons

It's a bit messy.  As we add and extend our components over time, the number of these "optional callbacks" will increase and we'll need to change everything much more often that we'd like to.

## Example 4: Event Delegation

One way to avoid the sequence issues encountered in adding callbacks in constructor functions is to set up some event delegation.  In this example, we'll use new public functions on each component called ``.on()`` which regiser one or more event handlers to respond to events. We'll also create ``publish()`` private functions to publish events to any listeners.  The resulting initialization code looks like this:

        $(document).ready(function () {

            var viewModel = {};
            viewModel.profile = new PortfolioProfile();
            viewModel.editor = new PortfolioEditor();

            // register for events after construction
            viewModel.editor.on('portfolioChanged', viewModel.profile.update);
            viewModel.profile.on('foundBadInvestments', viewModel.editor.highlightInvestments);

            // init data after events have been wired up
            viewModel.editor.init({
                investments: [{ name: "MSFT", percentage: 25 },
                               { name: "GOOG", percentage: 25 },
                               { name: "APPL", percentage: 50 }]
            });

            ko.applyBindings(viewModel);

        });


### Pros

The components don't know anything about each other and you have a nice way to broadcast events to multiple listeners if necessary.

### Cons

Since we need to register these event handlers after construction, we needed to add a new ``init`` method on the ``editor`` so that the ``profile`` is visible when the page initially loads.  There are other ways to do this of course, but it's important to point out that this technique usually works best with post-construction initialization.

Also, we'll probably want more functionality eventually like an ``off()`` function for removing subscribers.  Also, all of this event delegation logic is repeated in both components which isn't ideal.  We could add it to a prototype for all components or compose in an event delegation function... but that all smells like we're reinventing the wheel.

## Example 5: Lucid Event Emitters

[Lucid.js](http://robertwhurst.github.com/LucidJS/) is a handy library which provides event delegation functionality.  We added an ``emitter`` public property on each component and call ``self.emitter.trigger()`` to fire our events from within each component and wire them up like so:

	$(document).ready(function () {

		var viewModel = {};

		viewModel.profile = new PortfolioProfile();
		viewModel.editor = new PortfolioEditor();

		// wire up events
		viewModel.editor.emitter.on('portfolioChanged', viewModel.profile.update);
		viewModel.profile.emitter.on('foundBadInvestments', viewModel.editor.highlightInvestments);
		
		// initialize after construction
		viewModel.editor.init({
			investments: [{ name: "MSFT", percentage: 25 },
						   { name: "GOOG", percentage: 25 },
						   { name: "APPL", percentage: 50 }]
		});

		ko.applyBindings(viewModel);

	});

This is very similar to the previous example but we're relying on Lucid to handle all the event delegation work.

### Pros

We're no longer writing our own event delegation code in each component (or prototypes).  The code is minimal and nicely decoupled.

### Cons

We needed to expose the ``emitter`` property on each component as well as the ``editor.highlightInvestments`` and ``profile.update`` functions so that we could wire them up.  When you're building component-based systems, minimizing your public surface area is usually important.

Like in the previous example, we also needed to initialize our ``editor`` after construction.

## Example 6: Lucid With Privacy

We'll modify the previous example to hide the public functions of each component by taking advantage of features in Lucid.  

	$(document).ready(function () {

		var viewModel = {};

		viewModel.profile = new PortfolioProfile();
		viewModel.editor = new PortfolioEditor();

		// aggregate specific component events to centralHub
		var centralHub = LucidJS.emitter();
		centralHub.pipe('PortfolioEditor.portfolioChanged', viewModel.editor.emitter);
		centralHub.pipe('PortfolioProfile.foundBadInvestments', viewModel.profile.emitter);

		// wire up components by subscribing to events and triggering 'internal' events instead of calling public functions
		centralHub.on('PortfolioEditor.portfolioChanged', function (data) {
			viewModel.profile.emitter.trigger('PortfolioProfile.update', data);
		});
		centralHub.on('PortfolioProfile.foundBadInvestments', function (data) {
			viewModel.editor.emitter.trigger('PortfolioEditor.highlightInvestments', data);
		});

		// BONUS! lucid allows for 'sub events' using dot notation in the event name
		// log all events for each component to the console
		centralHub.on('PortfolioEditor', function (data) {
			console.log(data);
		});
		centralHub.on('PortfolioProfile', function (data) {
			console.log(data);
		});

		// initialize after construction
		viewModel.editor.init({
			investments: [{ name: "MSFT", percentage: 25 },
						   { name: "GOOG", percentage: 25 },
						   { name: "APPL", percentage: 50 }]
		});
		
		ko.applyBindings(viewModel);

	});

First, we have "namespaced" the events based on their component name and used lucid's ``pipe`` function to aggregate events to a central aggregator.  We then use this aggregator to wire up events from each component to each other.  But instead of calling public functions, we are raising "private" events on each component.

We're also logging all events passing through the aggregator to the console.

### Pros

We have fewer public functions with this technique and some logging/debugging.

### Cons

We still have the ``emitter`` public properties exposed on each compoment.


## Example 7: Amplify.js Pub/Sub

[Amplify.js](http://amplifyjs.com/) is another handy library which offers, among other things, pub/sub.  It's very simple; you publish messages to *topics* which are received by anything which has subscribed to it. Each component is now internally publishing and subscribing to amplify internally and our initialization looks like this:

	$(document).ready(function () {

		var viewModel = {};

		viewModel.profile = new PortfolioProfile();

		viewModel.editor = new PortfolioEditor({
			investments: [{ name: "MSFT", percentage: 25 },
						   { name: "GOOG", percentage: 25 },
						   { name: "APPL", percentage: 50}]
		});

		ko.applyBindings(viewModel);

	});

### Pros

Look how clean that is!  We're no longer worried about wiring things up, we just get it for free!  We're also not concerned with initializing the ```editor``` after construction because amplify's pub/sub messaging is entirely separate: if nobody is listening then no big deal.  Also, we're not unnecessarily exposing functions on each component.

**Side note:** [jQuery Tiny Pub/Sub](https://gist.github.com/661855/) is jQuery plugin which provides almost the same functionality. So if this technique is adequate for your needs and you don't want to take a dependency on Amplify, you can use that instead.

### Cons

Unfortunately we lost some decoupling.  For example, there is no reason why the ``profile`` component needs to know about something called a `portfolioChanged` event/topic.  As we add components to our application, they will all need to be modified to know about each other.  

Also, we have a possible topic name collision issue.  If in the future another component decides to publish a "portfolioChanged" event, then you may have unexpected behavior.

We could try to reduce this coupling in a similar way we did with Lucid in the previous example- by making all events "namespaced", aggregating them and forwarding to "private" topics but we can predict what that will look like... so let's try another approach instead.


## Example 8: Postal Message Bus

[Postal.js](https://github.com/ifandelse/postal.js) provides feature-rich, AMQP-style message bus.  The most important difference over simple event delegation is that all messages flow within "channels" instead of only topics.  This provides a natural boundary to work in.  

In this example, we've modified our components to publish and subscribe to  events to only their own channels, e.g. 'PortfolioEditor.portfolioChanged'.  We then use the ``postal.linkChannels`` function to forward events from one component to another.    

	$(document).ready(function () {

		// BONUS! postal wiretap: listen to all messages with optional filters
		var wireTap = new postal.diagnostics.DiagnosticsWireTap("console", function (env) {
			console.log(_.pick(JSON.parse(env), 'channel', 'topic', 'data'));
		});

		// postal linkChannels: forwards messages from one channel/topic to another
		postal.linkChannels(
			{ channel: 'PortfolioEditor', topic: 'portfolioChanged' },
			{ channel: 'PortfolioProfile', topic: 'update' });

		postal.linkChannels(
			{ channel: 'PortfolioProfile', topic: 'foundBadInvestments' },
			{ channel: 'PortfolioEditor', topic: 'highlightInvestments' });

		var viewModel = {};

		viewModel.profile = new PortfolioProfile();

		viewModel.editor = new PortfolioEditor({
			investments: [{ name: "MSFT", percentage: 25 },
						   { name: "GOOG", percentage: 25 },
						   { name: "APPL", percentage: 50}]
		});

		ko.applyBindings(viewModel);

	});

### Pros

Our components are completely decoupled.  This is very similar to the example with Lucid except we don't need to expose that ``emitter`` property and with Postal, we get event aggregation features for free.

We also are using a cool feature called a wire tap to monitor the postal message bus.  Check your console for all the messages that are fired as the app is initialized and used.  This is very useful when relying on messaging to glue together your components.

Arguably we could have built the same solution using Amplify, but Postal's channel concept and other features makes it much easier to do so.

### Cons

Postal requires [Underscore.js](http://underscorejs.org/).

# Just use Knockout

Bonus point for you if while reading this you've thought "Knockout is based on the observable pattern... Can't you just use that for hooking together components?"  

Ryan Niemeyer explains just how to do this and on his blog: [Using KO's Native PubSub for Decoupled Synchronization](http://www.knockmeout.net/2012/05/using-ko-native-pubsub.html).  He also built a library called [knockout-postbox](https://github.com/rniemeyer/knockout-postbox) to this effect.

The only downside to this approach is it requires all components will require knockout, which in these examples is fine.

# New Requirements!!!

Let's make it more interesting by adding more features:

* Add a pie chart **and** bar chart to illustrate the current state of the portfolio.  These charts should not "flicker" (change too rapidly) when the user is updating their portfolio.
* Add an "investment picker" which enables the user to select from a predetermined set of investments.  The user should not be able to add investments which are already in their portfolio.
* Add a the ability to save a portfolio, using a "toast" notification UI which handles success and error scenarios.
* All of these new components must also be completely decoupled because we plan to use them elsewhere in the near future.

## Example 9: Postal With More Complexity

No problem!  We've added new components and wired them up using Postal like so:

	$(document).ready(function () {

		// allows us to listen to all messages on the bus
		var wireTap = new postal.diagnostics.DiagnosticsWireTap("console", function (env) {
			console.log(_.pick(JSON.parse(env), 'channel', 'topic', 'data'));
		});

		// links up one source to one or many destinations
		// postal.linkChannels doesn't work with there are multiple destinations (not sure why yet)
		// this also takes a optional "processor" which mutates the message before forwarding it 
		var forwardMessages = function (source, destination, processor) {
			if (!_.isArray(destination)) {
				destination = [destination];
			}
			_.each(destination, function (item) {
				postal.subscribe({
					channel: source.channel,
					topic: source.topic,
					callback: function (msg) {
						if (processor) msg = processor(msg);
						postal.publish(item.channel, item.topic, msg);
					}
				});
			});
		};


		// forward events between components
		// portfolioEditor-published
		forwardMessages(
			{ channel: 'PortfolioEditor', topic: 'selectInvestments' },
			{ channel: 'AddInvestmentDialog', topic: 'open' });
		forwardMessages(
			{ channel: 'PortfolioEditor', topic: 'save.started' },
			{ channel: 'SaveDialog', topic: 'showSaving' });
		forwardMessages(
			{ channel: 'PortfolioEditor', topic: 'save.success' },
			{ channel: 'SaveDialog', topic: 'showSuccess' });
		forwardMessages(
			{ channel: 'PortfolioEditor', topic: 'save.fail' },
			{ channel: 'SaveDialog', topic: 'showFail' });
		forwardMessages(
			{ channel: 'PortfolioEditor', topic: 'portfolioChanged' },
			{ channel: 'PortfolioProfile', topic: 'update' });
		forwardMessages(
			{ channel: 'PortfolioEditor', topic: 'portfolioChanged' },
			[{ channel: 'AllocPieChart', topic: 'render' },
			{ channel: 'AllocBarChart', topic: 'render'}],
			// these listeners expect data in a different format, so use an optional processor function
			function (allocChangedMessage) {
				var chartData = [];
				_.each(allocChangedMessage.investments, function (pct, name) {
					chartData.push([name, parseInt(pct, 10)]);
				});
				return chartData;
			});
	
		// portfolioProfiler-published
		forwardMessages(
			{ channel: 'PortfolioProfile', topic: 'foundTroublesomeInvestments' },
			{ channel: 'PortfolioEditor', topic: 'highlightInvestments' });

		// addInvestmentDialog-published
		forwardMessages(
			{ channel: 'AddInvestmentDialog', topic: 'investmentSelected' },
			{ channel: 'PortfolioEditor', topic: 'addInvestment' });

		var chart = new AllocPieChart({
			chartId: 'chart'
		});

		var barChart = new AllocBarChart({
			chartId: 'barChart'
		});

		var profile = new PortfolioProfile();

		var save = new SaveDialog();

		var picker = new AddInvestmentDialog({
			getInvestmentsUrl: '/investments/all'
		});

		var editor = new PortfolioEditor({
			saveUrl: '/portfolio/save',
			investments: [{ name: "MSFT", percentage: 25 },
						   { name: "GOOG", percentage: 25 },
						   { name: "APPL", percentage: 50}]
		});

		// instead of one big view model and <!-- ko: with --> statements for each component, 
		// we're binding each compoment to specific dom nodes
		// this makes it more possible to add components built with other MV* frameworks in the future

		ko.applyBindings(editor, $('#editor')[0]);
		ko.applyBindings(profile, $('#profile')[0]);
		ko.applyBindings(picker, $('#picker')[0]);
		ko.applyBindings(save, $('#saveDialog')[0]);
	});

Here's what we did:

* ``AddInvestmentDialog`` component: displays the list of investments to choose from, excluding a set ticker symbols if relevant. The user can click on the Add button to add one.
* ``SaveDialog`` component: displays a saving/success/error messages and is wired to the ``editor``'s internal ``save.*`` topic events.
* ``AllocBarChart`` and ``AllocPieChart`` components: display charts of the current portfolio.  Notice that these components take data in a different format that is currently sent by ``PortfolioEditor.portfolioChanged``.  A special ``forwardMessages`` function is used here like ``postal.linkChannels`` but it takes an optional ``processor`` function which mutates the message in mid-flight.  Note that this should be done sparingly becase mutating a message is generally against message bus design principles. However, it works and doesn't negatively affect subscriber downstream in this specific case.  Also, we're using the ``withDebounce()`` function in postal to delay rapid execution of callbacks to prevent 'flickering'.
* We're calling ``ko.applyBindings(vm, domNode)`` for each component instead of making one big view model and binding it to the entire page just to promote composability of the page.  This also makes it easier if any one of the components changes their internal implementation to use a different MV* library internally in the future.

# Summary

In this tutorial we've seen several techniques for decoupling JavaScript components: manual callbacks, event delegation, Lucid, Amplify and Postal.  They all have their pros and cons.

This was just an introduction.  There are many more things you can do to optimize your solution such as:

* Mix and match some of these techniques.  For example, you can provide support for manual event delegation AND Postal if it's available.
* Add some additional logic inside your components to insulate you from taking many direct dependencies on these third party libraries.  
* Use inheritance to reduce boilerplate code. 

There is no "best practice", only practices which are appropriate to your context.  

## Libraries Used

* [Twitter Bootstrap](http://http://twitter.github.com/bootstrap/)
* [jQuery](http://jquery.com/)
* [Underscore.js](http://underscorejs.org/)
* [Amplify.js](http://amplifyjs.com/)
* [Knockout.js](http://knockoutjs.com/)
* [Lucid.js](http://robertwhurst.github.com/LucidJS/)
* [Postal.js](https://github.com/ifandelse/postal.js)
* [HighCharts](http://www.highcharts.com/)
