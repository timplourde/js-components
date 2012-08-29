
AllocBarChart = function (options) {
    var self = this;
    var chart = null;

    self.render = function (seriesData) {
        // expects data as an array of arrays e.g. 
        // [ ['foo', 45], ['bar',55] ]
        if (chart !== null) chart.destroy();
        var series = [];
        _.each(seriesData, function (inv) {
            series.push({ name: inv[0], data: [inv[1]] });
        });
        chart = new Highcharts.Chart({
            chart: { renderTo: options.chartId, type: 'bar' },
            title: { text: '' },
            xAxis: { 
                labels: {
                    enabled: false
                }
            },
            series: series
        });
    };

    // subscriptions
    postal.channel('AllocBarChart', 'render').subscribe(self.render).withDebounce(1000);
};