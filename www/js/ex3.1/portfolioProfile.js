
portfolioProfile = function (options) {
    var self = this;

    self.isVisible = ko.observable(false);
    self.message = ko.observable();
    self.isGood = ko.observable(false);
    self.isBad = ko.observable(false);

    var foundBadInvestmentsCallback;

    var update = function (event, portfolio) {
        // expects portfolio to be:
        // { total: 100,
        //   investments: {'GOOG' : 40,
        //                 'APPL' : 60, ... }
        //  }

        analyze(portfolio);
        self.isVisible(true);
    };

    var analyze = function (portfolio) {
        // reset 
        self.isGood(false);
        self.isBad(false);

        if (portfolio.total != 100) {
            self.message('Invalid: does not total 100%');
            return;
        }
        if (portfolio.investments['APPL'] > 50) {
            self.message('Too Conservative');
            self.isBad(true);
            $.publish('foundBadInvestments', ['APPL']);
            return;
        }
        if (portfolio.investments['FB'] > 1) {
            self.message('Stupid!');
            $.publish('foundBadInvestments', ['FB']);
            self.isBad(true);
            return;
        }
        if (portfolio.investments['GOOG'] > 20 && portfolio.investments['MSFT'] > 20) {
            self.message('Nicely Balanced');
            self.isGood(true);
            return;
        }
        self.message('No Recommendations');
        return;
    };

    // subscribe 
    $.subscribe('portfolioChanged', update);

};