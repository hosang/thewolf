$(function() {
    var SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
    var DISCOVERY_DOCS = [
        "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest",
    ];

    var GoogleAuth;

    function initClient() {
        new Promise(function(resolve, reject) {
            $.get('/api/keys/google').done(function(data) {
                resolve(data.client_id, data.api_key);
            }).fail(function(err) {
                reject(err);
            });
        }).then((client_id, api_key) => gapi.client.init({
            apiKey: api_key,
            clientId: client_id,
            scope: SCOPE,
            discoveryDocs: DISCOVERY_DOCS,
        })).then(function() {
            // Listen for sign-in state changes.
            gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

            // Handle the initial sign-in state.
            updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
            $('#google-authorize-button').click(function() {
                gapi.auth2.getAuthInstance().signIn();
            });
            $('#google-signout-button').click(function() {
                gapi.auth2.getAuthInstance().signOut();
            });
        });
    };
    gapi.load('client:auth2', initClient);

    function updateSigninStatus(isSignedIn) {
      if (isSignedIn) {
        $('#google-authorize-button').css('display', 'none');
        $('#google-signout-button').css('display', 'block');
        listCalendars();
      } else {
        $('#google-authorize-button').css('display', 'block');
        $('#google-signout-button').css('display', 'none');
      }
    }

    function listCalendars() {
        Loadbar.inc();
        gapi.client.calendar.calendarList.list({
            fields: 'items(description,id,primary,selected,summary,summaryOverride)',
            showHidden: false,
        }).then(function(response) {
            var calendars = response.result.items;
            $('#calendars').empty();
            $.each(calendars, function(idx, cal) {
                var name = cal.summaryOverride ? cal.summaryOverride : cal.summary;
                var checkbox = $('<input/>', {type: 'checkbox'});
                if (cal.selected) checkbox.attr('checked', '');
                $('#calendars').append(
                    $('<li/>').append(
                        $('<label/>')
                            .data('id', cal.id)
                            .click(updateCheckbox)
                            .append(checkbox)
                            .append(name)
                ));
            });
            Loadbar.dec();
            restoreSelection();
        }).catch(function(err) {
            console.error(err);
        });
    }

    function updateCheckbox() {
        var self = $(this);
        var id = self.data('id');
        var checked = self.children('input').is(':checked');
        var method = checked ? 'put' : 'delete';
        var url = '/api/calendars/select/' + encodeURIComponent(id);
        $.ajax(url, {'method': method});
        refreshAgenda();
    }

    function saveSelection() {
        $.ajax('/api/calendars/selected', {method: 'delete'}).done(function() {
            $.each($('#calendars label'), function(idx, label) {
                label = $(label);
                var checked = label.children('input').is(':checked');
                if (checked) {
                    $.ajax('/api/calendars/select/' +
                        encodeURIComponent(label.data('id')),
                        {method: 'put'});
                }
            });
            refreshAgenda();
        });
    }

    function restoreSelection() {
        $.get('/api/calendars/selected').done(function(ids) {
            if ($.isEmptyObject(ids)) {
                saveSelection();
                return;
            }
            $.each($('#calendars label'), function(idx, label) {
                label = $(label);
                if (ids[label.data('id')]) {
                    label.children('input').attr('checked', '');
                } else {
                    label.children('input').removeAttr('checked');
                }
            });
            refreshAgenda();
        });
    }

    function refreshAgenda() {
        listUpcomingEvents(1, $('#calendar-agenda-today'));
        listUpcomingEvents(1, $('#agenda-today-list'));
        listUpcomingEvents(4, $('#calendar-agenda-4days'));
    }
    $('#refresh').click(refreshAgenda);

    function listUpcomingEvents(numDays, eventlist) {
        var includeDate = numDays > 1;
        var ids = $('#calendars label :checkbox:checked').parents().map(function() {
            return $(this).data('id');
        }).get();
        if (ids.length == 0) {
            eventlist.empty();
            return;
        }

        var now = new Date()
        var day_start = new Date(now.getTime());
        day_start.setHours(0, 0, 0, 0);
        var day_end = new Date(now.getTime());
        day_end.setDate(day_end.getDate() + numDays - 1);
        day_end.setHours(23, 59, 59, 999);


        var batch = gapi.client.newBatch();
        $.each(ids, function(idx, id) {
            batch.add(gapi.client.calendar.events.list({
              'calendarId': id,
              'timeMin': day_start.toISOString(),
              'timeMax': day_end.toISOString(),
              'showDeleted': false,
              'singleEvents': true,
              'maxResults': 10,
              'orderBy': 'startTime',
              'fields': 'items(start(date,dateTime),end(date,dateTime),summary)',
            }));
        });
        Loadbar.inc();
        batch.then(function(response) {
            Loadbar.dec();
            var events = [];
            $.each(response.result, function(key, resp) {
                events = events.concat(resp.result.items);
            });
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
        });
      }

});
