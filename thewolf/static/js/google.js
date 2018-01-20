$(function() {
    $('#google-authorize-button').hide();
    $('#google-signout-button').hide();

    $('#google-authorize-button').click(function() {
        window.location.href = '/api/auth/google';
    });
    $('#google-signout-button').click(function() {
        Loadbar.inc();
        $.get('/api/auth/google/revoke').done(function() {
            $('#google-authorize-button').show();
            $('#google-signout-button').hide();
        }).always(function() {
            Loadbar.dec();
        });
    });

    function listCalendars() {
        Loadbar.inc();
        $.get('/api/calendars/list').done(function(response) {
            $('#google-authorize-button').hide();
            $('#google-signout-button').show();

            var calendars = response.calendars.items,
                selected = response.selection;
            $('#calendars').empty();
            $.each(calendars, function(idx, cal) {
                var name = cal.summaryOverride ? cal.summaryOverride : cal.summary;
                var checkbox = $('<input/>', {type: 'checkbox'});
                if (selected[cal.id]) checkbox.attr('checked', '');
                $('#calendars').append(
                    $('<li/>').append(
                        $('<label/>')
                            .data('id', cal.id)
                            .click(updateCheckbox)
                            .append(checkbox)
                            .append(name)
                ));
            });
            refreshAgenda();
        }).fail(function(err) {
            console.error(err);
            $('#google-authorize-button').show();
            $('#google-signout-button').hide();
        }).always(function() {
            Loadbar.dec();
        });
    }
    listCalendars();
    $('#refresh').click(listCalendars);

    function updateCheckbox() {
        var self = $(this);
        var id = self.data('id');
        var checked = self.children('input').is(':checked');
        var method = checked ? 'put' : 'delete';
        var url = '/api/calendars/select/' + encodeURIComponent(id);
        $.ajax(url, {'method': method});
        refreshAgenda();
    }

    function refreshAgenda() {
        listEvents(1, $('#calendar-agenda-today'));
        listEvents(1, $('#agenda-today-list'));
        listEvents(4, $('#calendar-agenda-4days'));
    }

    function listEvents(numDays, eventlist) {
        var includeDate = numDays > 1;
        Loadbar.inc();
        $.get('/api/calendars/events?days=' + numDays).done(function(response) {
            var events = response.events,
                now = new Date();
            events.map(function(event) {
                event.start.hasDateTime = event.start.hasOwnProperty('dateTime');
                if (event.start.hasDateTime) {
                    event.when = new Date(event.start.dateTime);
                } else {
                    event.when = new Date(event.start.date);
                    event.when.setHours(0);
                }
                return event;
            });
            events.sort(function(first, second) {
                var diff = first.when - second.when;
                if (diff != 0) {
                    return diff;
                }

                if (first.summary < second.summary)
                    return -1;
                else if (first.summary > second.summary)
                    return 1;
                else
                    return 0;
            });
            eventlist.empty();
            var prevDay = '';
            $.each(events, function(idx, event) {
                var time = '';
                if (event.start.hasDateTime) {
                    time = $.format.date(event.when, 'H:mm');
                }
                var day = $.format.date(event.when, 'E');

                var finished = false;
                if (event.hasOwnProperty('end') &&
                    event.end.hasOwnProperty('dateTime')) {
                    var end = new Date(event.end.dateTime);
                    if (end <= now) {
                        finished = true;
                    }
                }
                var cl = finished ? " finished" : "";

                if (includeDate) {
                    if (prevDay == day) {
                        day = '';
                    } else {
                        prevDay = day;
                        eventlist.append($('<hr/>', {'class': 'newday'}));
                    }
                    eventlist.append($('<span/>', {'class': 'day' + cl}).text(day));
                }
                eventlist.append($('<span/>', {'class': 'time' + cl}).text(time));
                eventlist.append(
                    $('<span/>', {'class': 'summary' + cl}).text(event.summary));
            });
        }).fail(function(err) {
            console.error(err);
        }).always(function() {
            Loadbar.dec();
        });
      }

});
