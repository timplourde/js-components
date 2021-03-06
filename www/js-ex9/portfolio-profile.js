
PortfolioProfile = function (options) {
    var self = this;

    self.isVisible = ko.observable(false);
    self.message = ko.observable();
    self.isGood = ko.observable(false);
    self.isBad = ko.observable(false);

    var update = function (portfolio) {
        // expects portfolio to be:
        // { total: 100,
        //   investments: {'GOOG' : 40,
        //                 'APPL' : 60, ... }
        //  }

        reset();
        analyze(portfolio);
        self.isVisible(true);
    };

    var analyze = function (allocation) {

        if (allocation.total != 100) {
            self.message('Invalid: does not total 100%');
            return;
        }

        if (allocation.investments['APPL'] > 50) {
            self.message('Too Conservative');
            self.isBad(true);
            fireEvent('foundTroublesomeInvestments', ['APPL']);
            return;
        }

        if (allocation.investments['FB'] > 1) {
            self.message('Stupid!');
            self.isBad(true);
            fireEvent('foundTroublesomeInvestments', ['FB']);
            return;
        }

        if (allocation.investments['GOOG'] > 20 && allocation.investments['MSFT'] > 20) {
            self.message('Nicely Balanced');
            self.isGood(true);
            return;
        }

        self.message('No Recommendations');
        return;
    };

    var reset = function () {
        self.isGood(false);
        self.isBad(false);
    };

    // subscriptions
    postal.subscribe({
        channel: 'PortfolioProfile',
        topic: 'update',
        callback: update
    });


    var fireEvent = function (event, data) {
        postal.publish({
            channel: 'PortfolioProfile',
            topic: event,
            data: data
        });
    };

};