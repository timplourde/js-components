
portfolioEditor = function (options) {
    var self = this;


    // event aggregation
    var callbacks = {};
    self.on = function (eventName, callback) {
        if (!callbacks[eventName]) {
            callbacks[eventName] = [];
        }
        callbacks[eventName].push(callback);
    };
    var publish = function (eventName, data) {
        if (callbacks[eventName]) {
            _.each(callbacks[eventName], function (callback) {
                callback(data);
            });
        }
    };



    // observables and methods to edit the portfolio
    self.investments = ko.observableArray();
    self.deleteInvestment = function (investment) {
        self.investments.remove(investment);
    };
    self.totalPercentage = ko.computed(function () {
        var total = 0;
        _.each(self.investments(), function (inv) {
            total += parseInt(inv.percentage(), 10);
        });
        return total;
    });

    // used when adding a new investment by typing in a ticker symbol
    self.newInvestmentTickerSymbol = ko.observable();
    self.addInvestmentByTickerSymbol = function () {
        var ticker = self.newInvestmentTickerSymbol();
        if (ticker) {
            ticker = ticker.toUpperCase().trim();
            if (ticker.length > 0) {
                addInvestment({ name: self.newInvestmentTickerSymbol().toUpperCase() });
                self.newInvestmentTickerSymbol('');
            }
        }
    };

    // private function for adding an investment 
    var addInvestment = function (investment) {
        // defaults the percantage to 0
        investment.percentage = ko.observable(investment.percentage || 0);
        // subscribe to precentage change events
        investment.percentage.subscribe(portfolioChanged);

        // add observable property
        investment.isHighlighted = ko.observable(false);

        self.investments.push(investment);
    };

    // called whenever when the overall portfolio changes
    var portfolioChanged = function () {

        // project investments into an object with tickers as keys 
        // e.g. {'GOOG': 15, 'APPL': 45,...}
        var investments = {};
        var total = 0;
        _.each(self.investments(), function (inv) {
            var percentage = parseInt(inv.percentage(), 10);
            total += percentage;
            investments[inv.name] = percentage;
        });

        publish('portfolioChanged', {
            total: total,
            investments: investments
        });

    };

    // subscribe to add/remove of investments
    self.investments.subscribe(portfolioChanged);

    // populate self.investments if relevant 
    if (options.investments) {
        _.each(options.investments, function (inv) {
            addInvestment(inv);
        });
    }

    // sets .isHighlighted on investments passed as an array of ticker symbols
    self.highlightInvestments = function (investmentsToHighlight) {
        _.each(self.investments(), function (inv) {
            inv.isHighlighted(_.indexOf(investmentsToHighlight, inv.name) > -1);
        });
    };

    // new public method to add investments after construction
    self.addInvestments = function (investments) {
        _.each(investments, addInvestment);
    };

};