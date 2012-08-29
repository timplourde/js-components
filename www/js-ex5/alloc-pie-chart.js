
AllocPieChart = function (options) {
    var self = this;
    var chart = null;

    self.render = function (seriesData) {
        // expects data as an array of arrays e.g. 
        // [ ['foo', 45], ['bar',55] ]
        if (chart !== null) chart.destroy();
        chart = new Highcharts.Chart({
            chart: { renderTo: options.chartId },
            title: { text: '' },
            series: [{ type: 'pie', data: seriesData}]
        });
    };

    // subscriptions
    postal.channel('AllocPieChart', 'render').subscribe(self.render).withDebounce(1000);
};