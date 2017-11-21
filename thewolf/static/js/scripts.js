
$(function() {
    function getWeekNumber(d) {
        // Copy date so don't modify original
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        // Set to nearest Thursday: current date + 4 - current day number
        // Make Sunday's day number 7
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
        // Get first day of year
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
        // Calculate full weeks to nearest Thursday
        var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
        // Return array of year and week number
        return weekNo;
    }
    function update_clock() {
        var now = new Date;
        $("#time").text($.format.date(now, "H:mm"));
        $("#day").text($.format.date(now, "E"));
        $("#date").text($.format.date(now, "d MMM"));
        $("#week").text(getWeekNumber(now));
    }
    update_clock();
    var clock_interval_id = setInterval(update_clock, 1000);

    //////////////////////////////////////////////////////////////////////
    //  Weather
    var get_location = new Promise(function(resolve, reject) {
        Loadbar.inc();
        $.get('/api/location')
            .done(function(resp) {
                resolve(resp);
                Loadbar.dec();
            })
            .fail(function(err) {
                reject(err);
                Loadbar.dec();
            });
    });

    function displayLocation(loc) {
        var latlng = {lat: loc.latitude, lng: loc.longitude};
        var mapStyle = [
            {elementType: 'geometry', stylers: [{color: '#242f3e'}]},
            {elementType: 'labels.text.stroke', stylers: [{color: '#242f3e'}]},
            {elementType: 'labels.text.fill', stylers: [{color: '#746855'}]},
            {
              featureType: 'administrative.locality',
              elementType: 'labels.text.fill',
              stylers: [{color: '#d59563'}]
            },
            {
              featureType: 'poi',
              elementType: 'labels.text.fill',
              stylers: [{color: '#d59563'}]
            },
            {
              featureType: 'poi.park',
              elementType: 'geometry',
              stylers: [{color: '#263c3f'}]
            },
            {
              featureType: 'poi.park',
              elementType: 'labels.text.fill',
              stylers: [{color: '#6b9a76'}]
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: [{color: '#38414e'}]
            },
            {
              featureType: 'road',
              elementType: 'geometry.stroke',
              stylers: [{color: '#212a37'}]
            },
            {
              featureType: 'road',
              elementType: 'labels.text.fill',
              stylers: [{color: '#9ca5b3'}]
            },
            {
              featureType: 'road.highway',
              elementType: 'geometry',
              stylers: [{color: '#746855'}]
            },
            {
              featureType: 'road.highway',
              elementType: 'geometry.stroke',
              stylers: [{color: '#1f2835'}]
            },
            {
              featureType: 'road.highway',
              elementType: 'labels.text.fill',
              stylers: [{color: '#f3d19c'}]
            },
            {
              featureType: 'transit',
              elementType: 'geometry',
              stylers: [{color: '#2f3948'}]
            },
            {
              featureType: 'transit.station',
              elementType: 'labels.text.fill',
              stylers: [{color: '#d59563'}]
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: [{color: '#17263c'}]
            },
            {
              featureType: 'water',
              elementType: 'labels.text.fill',
              stylers: [{color: '#515c6d'}]
            },
            {
              featureType: 'water',
              elementType: 'labels.text.stroke',
              stylers: [{color: '#17263c'}]
            },
        ];
        new Promise(function(resolve, reject) {
            $.get('/api/keys/google').done(function(data) {
                resolve(data.api_key);
            }).fail(function(err) {
                reject(err);
            });
        }).then(function(api_key) {
            return new Promise(function(resolve, reject) {
                var url = 'https://maps.googleapis.com/maps/api/js?key=' + api_key;
                $.ajax(url, {dataType: 'script', async: true})
                    .done(function() {
                        resolve();
                    }).fail(function(err) {
                        reject(err);
                    });
            });
        }).then(function() {
            $('#map').show();
            var map = new google.maps.Map(document.getElementById('map'), {
                center: latlng,
                zoom: 11,
                styles: mapStyle,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
            });
            var marker = new google.maps.Marker({
                map: map,
                position: latlng,
                name: "location",
            });
            $('#location-button').click(function() {
                var center = map.getCenter();
                google.maps.event.trigger(map, 'resize');
                map.setCenter(center);
            });
        }).catch(function(err) {
            console.error(err);
        });
    }

    // TODO(hosang): take into account wind and rain intensity
    var weather_icons = {
        "clear-day": "wi-day-sunny",
        "clear-night": "wi-night-clear",
        "rain": "wi-rain",
        "snow": "wi-snow",
        "sleet": "wi-sleet",
        "wind": "wi-windy",
        "fog": "wi-fog",
        "cloudy": "wi-cloudy",
        "partly-cloudy-day": "wi-cloudy",
        "partly-cloudy-night": "wi-cloudy",
    };
    function update_weather_dark_sky(loc) {
        var url = "/api/weather/" + loc.latitude + "," + loc.longitude;
        $.get(url).done(function(resp) {
            var temp = Math.round(resp.currently.temperature);
            var iconclass = 'wi ' + weather_icons[resp.currently.icon];
            $("#weather-icon").html($('<i/>', {'class': iconclass}));
            $("#weather-temperature").text(temp + "°C");
            $("#weather-summary").text(resp.currently.summary);
        });
    }

    var location, weather_interval_id;
    get_location.then(function(loc) {
        location = loc;
        update_weather_dark_sky(loc);
        displayLocation(loc);
        var refreshWeather = () => update_weather_dark_sky(loc);
        weather_interval_id = setInterval(refreshWeather, 60 * 1000);
        $('#refresh').click(refreshWeather);
    });


    //////////////////////////////////////////////////////////////////////
    //  Navigation
    $('#navigation').children('button.nav').click(function() {
        $('#navigation').children('button.nav').removeClass('active');
        $('.page').hide()

        $(this).addClass('active');
        var layout_class = $(this).data('page');
        $('#' + layout_class).show();
        this.blur();
    });
    $('#navigation').children('.default').removeClass('default').click();
    
});
