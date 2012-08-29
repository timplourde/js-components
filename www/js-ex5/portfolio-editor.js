
PortfolioEditor = function (options) {
    var self = this;

    // EDITOR
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

    var addInvestment = function (investment) {
        investment.percentage = ko.observable(investment.percentage || 0);
        investment.percentage.subscribe(allocChanged);

        investment.isHighlighted = ko.observable(false);

        self.investments.push(investment);
    };

    // SAVING
    self.isSaveButtonEnabled = ko.observable(true);
    self.save = function () {
        self.isSaveButtonEnabled(false);
        postal.publish({
            channel: 'PortfolioEditor',
            topic: 'save.started',
            data: 'Saving Portfolio...'
        });
        console.log('saving data to ' + options.saveUrl);
        setTimeout(function () {
            // 50% chance of success, just to demonstrate some variability
            new Date().getTime() % 2 === 0 ? saveSuccessful() : saveFailed();
        }, 1000);
    };
    var saveSuccessful = function () {
        self.isSaveButtonEnabled(true);
        postal.publish({
            channel: 'PortfolioEditor',
            topic: 'save.success',
            data: 'YAY, SUCCESS!'
        });
    }
    var saveFailed = function () {
        self.isSaveButtonEnabled(true);
        postal.publish({
            channel: 'PortfolioEditor',
            topic: 'save.fail',
            data: 'OH NOES!'
        });
    }

    // SELECT INVESTMENTS (i.e. the 'add investments' button)
    self.selectInvestments = function () {
        var invsToExclude = _.map(self.investments(), function (inv) {
            return inv.name;
        });
        postal.publish({
            channel: 'PortfolioEditor',
            topic: 'selectInvestments',
            data: invsToExclude
        });
    };

    var allocChanged = function () {
        // project investments into an object with tickers as keys 
        // e.g. {'GOOG': 15, 'APPL': 45,...}
        var investments = {};
        var total = 0;
        _.each(self.investments(), function (inv) {
            var percentage = parseInt(inv.percentage(), 10);
            total += percentage;
            investments[inv.name] = percentage;
            // un-highlight everything as we go
            inv.isHighlighted(false);
        });

        postal.publish({
            channel: 'PortfolioEditor',
            topic: 'portfolioChanged',
            data: {
                total: total,
                investments: investments
            }
        });
    };

    var highlightInvestments = function (invsToHighlight) {
        _.each(self.investments(), function (inv) {
            inv.isHighlighted(_.indexOf(invsToHighlight, inv.name) > -1);
        });
    }

    // subscribe to add/remove of investments
    self.investments.subscribe(function () {
        allocChanged();
    });

    // populate self.investments
    if (options.investments) {
        _.each(options.investments, function (inv) {
            addInvestment(inv);
        });
    }

    // subscriptions
    postal.subscribe({
        channel: 'PortfolioEditor',
        topic: 'addInvestment',
        callback: addInvestment
    });
    postal.subscribe({
        channel: 'PortfolioEditor',
        topic: 'highlightInvestments',
        callback: highlightInvestments
    });
};