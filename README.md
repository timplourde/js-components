# JS Components

Examples of how to wire up JavaScript components, emphasizing the pros and cons of each. Techniques used include traditional callbacks, maunal event aggregation pub/sub using [Amplify.js](http://amplifyjs.com/) and client-side message bus using [Postal.js](https://github.com/ifandelse/postal.js).

This is intended for web developers who are starting to build complex client-side features (without a rich component libraries like YUI or EXT.JS) and encountering maintainability/flexability issues.  

## Before You Begin

These examples make use **Knockout.js** for basic data-binding/templating/MVVM functionality.  If you are not familiar with Knockout, check out the online tutorials at [learn.knockoutjs.com](http://learn.knockoutjs.com/).  It's worth your time!

These examples can easily be re-written to have each component use different MV* libraries internally such as Backbone.js.

These examples also use a basic technique for "constructor functions" like so:

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

This is not the most effecient/usable way of constructing objects, but it's terse and easy to understand.

These examples don't bother to do things like basic input validation because that is boring.

All examples below can be found in the ``www`` directory.
	
## Background

You need to build an application for a Financial Services company which will consist of two components:

1. **Portfolio Editor:** The user builds a portfolio by adding investments (by ticker symbol) and setting their allocation percentages (0-100).  The user can delete investments too.  

2. **Portfolio Profile:** Whenever the portfolio changes (an investment is added, removed or updated), this component will analyze the investments in the profile and provide feedback to the user.  Here are the rules:
	* If the total != 100, display an error
	* If > 50% in APPL, it's considered "bad" and "Too Conservative"
	* If > 1% in FB, it's considered "bad" and "Stupid"
	* If > 20% in MSFT AND > 20% in GOOG, it's considered "good" and "Well Balanced"
	* Else, "No Recommendations"

It is extremely important that both components are decoupled because they will be used in other places in the application.

## Example 1: One Way Callback

In this example, when constructing the ``editor`` object, we pass in a ``portfolioChangedCallback`` option which gets called whenever the portfolio changes.  This is a simple technique and works well given the requirements.

Mission accomplished, time for happy hour!

## Example 2: Two-Way Callback

**NEW REQUIREMENTS:** As a user, I need any "troublesome" investments to be highlighed in the Portfolio Editor whenver the Portfolio Profile detects a "bad" portfolio so I can identify which ones need my attention.

We'll use the same technique to add an event handler for the ``profile`` as we did with the ``editor``.  This **DOES NOT WORK** however because the ``editor`` doesn't exist when we construct the ``profile``.  There's no way to solve it using this technique because it's a chicken-and-egg problem.  

## Example 2.1: Nested Callbacks

Ok, let's try another approach.  One funky way to get around this issue is to embed a callback function in the message that is passed from the ``editor`` to the ``profile``.  You'll notice an additonal property called ``foundBadInvestmentsCallback`` being sent to the ``profile`` which it later calls if any troublesome investments are found.

This works, but it's a bit messy.  The ``editor`` knows too much about the ``profile`` and it will cause maintenance issues down the road.  We can do better.

## Example 2.2: Event Aggregation

One way to avoid the sequence issues encountered in adding callbacks in constructor functions is to set up some event aggregation.  In this example, we'll use new public functions on each component called ``.on()`` which regiser one or more event handlers to respond to events. We'll also create ``publish()`` private functions to publish events to any listeners.

On the positive side, the components don't know anything about each other and you have a nice way to broadcast events to multiple listeners if necessary.

On the negative side, the Portfolio Profile UI doesn't appear visible when the page first loads because all the relevant events have been fired while the object was being constructed, BEFORE any callbacks were registered via ``.on()``.  

There are ways to to get around this issue.  See the code comments for two options. Neither of them are particularly good, especially if you want to retain the ability to pre-populate the ``editor`` with some investments when constructing it.

This event aggregation logic is not ideal.  It's duplicated in both components.  There is no logic to unsubscribe callbacks.  Fortunately, this problem has been solved already so there is no need to reinvent the wheel.

## Example 3: Basic Pub/Sub With Amplify.js

**Amplify.js** is a handy library which offers, among other things, pub/sub.  It's very simple, you publish messages to *topics* which are received by anything which has subscribed to it.

If you look at the HTML file you'll notice the object construction is clean with no callback registration.

Inside each component, you'll notice calls like ``amplify.publish`` and ``amplify.subscribe``.  

On the positive side, the JS in the HTML file is clean with no callback registration logic and everything works as expected.  Also, the callback functions on each subscription no longer need to be public, which decreases the surface area of each component.

On the negative side, each component is publishing/subscribing to topic which they should not know about.  This approach is acceptable if you're working on a small project, when you don't expect a lot of change and can agree on standard topic names and message formats.  

However, this isn't good enough for us.  We need each component to be as decoupled as possible.

## Example 3.1: Basic Pub/Sub with jQuery 

Side note: if the previous basic pub/sub technique works for you but you don't want all the weight of Amplify.js, you can achieve the same thing by using a small jQuery plugin called Tiny Pub/Sub.

All we changed was calls to ``amplify.publish/amplify.subscribe`` to ``$.publish/$.subscribe``. Also, because this uses jQuery Events internally, each callback receives a ``event`` object which it ignores.  That's may be accpetable for your needs.


## Example 4: Message Bus with Postal.js

What we really need to a full-fleged client-side message bus to provide decoupled, message-based communication among our components.  Enter **Postal.js**.

Postal is a more full-fledged message bus library offering a bunch of great functionality, not limited to:

* **Channels:** logical boundaries for groupd of topics
* **Topics:** can be subscribed to with wildcard pattern matching (*, #) and handy modifier functions like ``.debounce()`` and ``.distinctUntilChanged()`` which regulate calling of callbacks based on the stream of messages.
* **Wiretaps:** using a plugin, you can snoop on all messages being passed around on the bus which is handy for debugging
* **linkChannels:** forward messages from one channel/topic to another

In this example, we have modified each component to publish on and subscribe to ONLY THEIR CHANNEL.  We also use ``linkChannels`` to "plug together" the components, forwarding messages on each component's internal topics to one another.  

There is also a wiretap which logs all messages to the console for debugging purposes.

On the positive side, this technique offers complete encapsulation of each component, minimal public functions, excellent debugging and no messy callback issues.  Also, it clearly identifies the role of the JS in the HTML page as the "compositor"; responsible for creating each component and wiring them up.  

On the negative side, Postal requires **Underscore.js** (which we have been using all along) and it's arguably "chatty" compared to the previous example using Amplify.js.

Using Postal.js can make complex pages with lots of components much easier to handle, as we'll see in the next example...

## Example 5: (Extra credit, just for fun) More Complexity!!!

**NEW REQUIREMENTS:** 

* Add a pie chart and bar chart to illustrate the current state of the portfolio
* Add an "investment picker" which enables the user to select from a predetermined set of investments.  The user should not be able to add investments which are already in their portfolio.
* Add a the ability to save a portfolio, using a "toast" notification UI which handles success and error scenarios.
* All of these new components must also be completely decoupled because we plan to use them elsewhere in the near future.

No problem!  Changes made:

* ``addInvestmentDialog`` component: displays the list of investments to choose from, excluding a set ticker symbols if relevant. The user can click on the Add button to add one.
* ``saveDialog`` component: displays a saving/success/error messages and is wired to the ``editor``'s internal ``save.*`` topic events.
* ``allocBarChart`` and ``allocChart`` components: display charts of the current portfolio.  Notice that these components take data in a different format that is currently sent by the ``editor``.  A special ``forwardMessages`` function is used here like ``postal.linkChannels`` but it takes an optional ``processor`` function which mutates the message in mid-flight.  Note that this should be done sparingly becase mutating a message is generally against message bus design principles. However, it works and doesn't negatively affect subscriber downstream in this specific case.
* We're calling ``ko.applyBindings(vm, domNode)`` for each component instead of making one big view model and binding it to the entire page just to promote composability of the page.  This also makes it easier if any one of the components changes their internal implementation to use a different MV* library internally in the future.
* Manual event aggregation was added to the ``profile`` component to demonstrate that pub/sub and manual callback management can both be provided, in case your component can't be 100% certain that postal will be available.  It's generally a good idea to build a clean public API to your components first, then add pub/sub capabilities later.

## Libraries Used

* [Twitter Bootstrap](http://http://twitter.github.com/bootstrap/)
* [jQuery](http://jquery.com/)
* [Underscore.js](http://underscorejs.org/)
* [Amplify.js](http://amplifyjs.com/)
* [Knockout.js](http://knockoutjs.com/)
* [Postal.js](https://github.com/ifandelse/postal.js)
* [jQuery Tiny Pub/Sub](https://gist.github.com/661855/)
* [HighCharts](http://www.highcharts.com/)
