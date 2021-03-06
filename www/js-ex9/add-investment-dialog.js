
AddInvestmentDialog = function (options) {

    var self = this;

    self.availableInvestments = ko.observableArray();
    self.visible = ko.observable(false);
    self.close = function () {
        self.visible(false);
    };

    self.addInvestment = function (inv) {
        inv.hasBeenAdded(true);
        fireEvent('investmentSelected',inv);
    };

    var getAllInvestments = function () {
        console.log('querying for investments: ' + options.getInvestmentsUrl);
        return ['HP', 'GOOG', 'MSFT', 'IBM', 'FB', 'APPL', 'NVDA'].slice();
    };
   
    var open = function (investmentsToExclude) {

        // get all investments from server
        var allInvestments = getAllInvestments();

        // build the observable array of availableInvestments
        self.availableInvestments([]);
        _.each(allInvestments, function (inv) {
            self.availableInvestments.push({
                name: inv,
                hasBeenAdded: ko.observable(_.indexOf(investmentsToExclude, inv) > -1)
            });
        });
        self.visible(true);
    };
  
    // subscriptions
    postal.subscribe({
        channel: 'AddInvestmentDialog', 
        topic: 'open',
        callback: open
    });

    var fireEvent = function (event, data) {
        postal.publish({
            channel: 'AddInvestmentDialog',
            topic: event,
            data: data
        });
    };

};