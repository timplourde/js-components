ko.bindingHandlers.modalDialogVisible = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        $(element).modal({
            show: false
        });
        // This will be called when the binding is first applied to an element
        // Set up any initial state, event handlers, etc. here
    },
    update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
        // This will be called once when the binding is first applied to an element,
        // and again whenever the associated observable changes value.
        // Update the DOM element based on the supplied values here.
        var value = ko.utils.unwrapObservable(valueAccessor());
        $(element).modal(value ? 'show' : 'hide');
    }
};