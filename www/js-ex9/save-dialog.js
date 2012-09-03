
SaveDialog = function (options) {
    var self = this;

    self.isVisible = ko.observable(false);
    self.isWaiting = ko.observable(false);
    self.title = ko.observable();
    self.saveSuccessful = ko.observable(false);
    self.saveFailed = ko.observable(false);
    self.resultMessage = ko.observable();

    self.close = function (message) {
        self.isVisible(false);
    }

    var open = function (message) {
        reset();
        self.title(message);
        self.isWaiting(true);
        self.isVisible(true);
    };

    var handleSuccess = function (message) {
        self.isWaiting(false);
        self.saveSuccessful(true);
        self.resultMessage(message || 'Successfull');
        // auto-close
        setTimeout(function () {
            self.isVisible(false);
        }, 2000);
    }

    var handleFailure = function (message) {
        self.isWaiting(false);
        self.saveFailed(true);
        self.resultMessage(message || 'Failure!');
    }

    var reset = function () {
        self.saveSuccessful(false);
        self.saveFailed(false);
        self.resultMessage('');
    };

    // subscriptions

    var subscribe = function (event, callback) {
        postal.subscribe({
            channel: 'SaveDialog',
            topic: event,
            callback: callback
        });
    };

    subscribe('showSaving', open);
    subscribe('showSuccess', handleSuccess);
    subscribe('showFail', handleFailure);


};