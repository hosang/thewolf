$(function() {

    function drawProductivity(days) {
        Loadbar.inc();
        $.get('/api/productivity?days=' + days).done(function(resp) {
            var data = new google.visualization.DataTable();
            $.each(resp.columns, function(idx, col) {
                data.addColumn(col[0], col[1]);
            });

            resp.stats.map(function(row) {
                row[0] = new Date(row[0]);
                return row;
            });
            data.addRows(resp.stats);

            var workColor = '#1E88E5',
                taskColor = '#E53935';

            var options = {
                series: {
                    0: {
                        targetAxisIndex: 0,
                        color: taskColor,
                    },
                    1: {
                        targetAxisIndex: 1,
                        color: workColor,
                    },
                },
                vAxes: {
                    0: {
                        title: resp.columns[1][1],
                        titleTextStyle: {color: taskColor},
                        textStyle: {color: taskColor},
                        gridlines: {color: '#C62828'},
                    },
                    1: {
                        title: resp.columns[2][1],
                        titleTextStyle: {color: workColor},
                        textStyle: {color: workColor},
                        gridlines: {color: '#1565C0'},
                    },
                },
                chartArea: {
                    width: '80%',
                },
                vAxis: {
                    gridlines: {count: -1},
                    viewWindow: {'min': -0.1},
                },
                hAxis: {
                    gridlines: { color: '#666' },
                    viewWindowMode: 'pretty',
                    format: 'd.M.',
                    textStyle: { color: '#ccc' },
                },
                curveType: 'function',
                backgroundColor: '#212121',
                legend: {
                    position: 'top',
                    textStyle: {
                        color: '#ccc',
                    },
                },
            };
            var graph_div = document.getElementById('prod-graph');
            var chart = new google.visualization.LineChart(graph_div);
            chart.draw(data, options);
        }).always(function() {
            Loadbar.dec();
        });
    }

    google.charts.load('current', {'packages':['corechart']});
    $('#prod-buttons').children('button').click(function(ev) {
        var days = $(this).data('days');
        drawProductivity(days);
    });
    $('#productivity-button').click(function() {
        $('#prod-buttons').children('button').eq(0).click();
    });
});
