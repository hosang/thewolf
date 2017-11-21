var setPomodoroPercentage;

$(function() {
    var stateRestoreTimeout = 6 * 60 * 60 * 1000;

    function loadPlan() {
        return new Promise(function(resolve, reject) {
            Loadbar.inc();
            $.get('/api/pomodoro/plan').done(function(data) {
                resolve(data);
            }).fail(function(err) {
                reject(err);
            }).always(function() {
                Loadbar.dec();
            });
        });
    }
    function savePlan(plan, state) {
        $.ajax({
            url: '/api/pomodoro/plan',
            type: 'PUT',
            data: JSON.stringify({'plan': plan, 'state': state}),
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
        }).fail(function(err) {
            console.error(err);
        });
    }

    var PomodoroPlan = {
        state: 0,
        plan: [
            {type: 'work', minutes: 25},
            {type: 'break', minutes: 5},
            {type: 'work', minutes: 25},
            {type: 'break', minutes: 5},
            {type: 'work', minutes: 25},
            {type: 'break', minutes: 20},
        ],

        init: function() {
            this.renderState(0);
            var self = this;
            $('#pomodoro-plan-clear').click(function() {
                self.reset();
            });
            $('#pomodoro-buttons .add').click(function(event) {
                var $button = $(this);
                self.plan.push({
                    type: $button.data('type'),
                    minutes: $button.data('minutes'),
                });
                savePlan(self.plan, self.state);
                renderPomodoroPlan(self.plan);
                Pomodoro.reset();
            });
            loadPlan().then(function(resp) {
                if (resp.success) {
                    self.plan = resp.plan;
                    if (new Date() - new Date(resp.timestamp) < stateRestoreTimeout) {
                        self.state = resp.state;
                        self.renderState();
                    }
                }
                renderPomodoroPlan(self.plan);
            }).catch(function(err) {
                console.error(err);
            });
        },

        changeState: function(s) {
            this.state = s;
            this.renderState();
            savePlan(this.plan, this.state);
        },
        renderState: function() {
            if (Pomodoro != null && !Pomodoro.isRunning()) {
                Pomodoro.reset();
            }
            $('#pomodoro-state').text(this.state);
            $('#pomodoro-plan').children('ul').children('li').removeClass('active');
            $('#pomodoro-plan').children('ul').children('li')
                .eq(this.state).addClass('active');
        },
        reset: function() {
            this.plan = [];
            this.changeState(0);
            renderPomodoroPlan(this.plan);
            Pomodoro.reset();
        },
        accept: function() {
            this.changeState((this.state + 1) % this.plan.length);
        },
        sessionInfo: function() {
            if (this.plan.length == 0) {
                return 25;
            } else {
                if (this.state >= this.plan.length)
                    this.changeState(0);
                var unit = this.plan[this.state];
                return unit;
            }
        },
    };
    PomodoroPlan.init();

    var hslStart = [5, 81, 56],
        hslEnd = [119, 34, 49];
    function getColor(frac) {
        var cs = hslStart,
            ce = hslEnd;
        var h = frac * ce[0] + (1 - frac) * cs[0],
            s = frac * ce[1] + (1 - frac) * cs[1],
            l = frac * ce[2] + (1 - frac) * cs[2];
        return 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
    }
    var Pomodoro = {
        bar: new ProgressBar.Line(progressbar, {
            strokeWidth: 4,
            color: '#EA4335',
            trailColor: '#212121',
            trailWidth: 0.3,
            svgStyle: {width: '100%', height: '100%'},
            from: {color: '#FFEA82'},
            to: {color: '#ED6A5A'},
            step: (state, bar) => {
              bar.path.setAttribute('stroke', getColor(bar.value()));
            },
        }),
        defaultTime: 10,
        remainingTime: 10,
        interval: null,
        sessionInfo: null,

        isRunning: function() {
            return this.interval != null;
        },
        isDone: function() {
            return this.remainingTime <= 0;
        },
        display: function() {
            var time = Math.max(0, this.remainingTime);
            var minutes = Math.floor(time / 60);
            var seconds = Math.round(time % 60);
            seconds = (seconds < 10) ? '0' + seconds : seconds;
            $('#timer-time').text(minutes + ':' + seconds);

            var frac = (this.defaultTime - this.remainingTime) / this.defaultTime;
            this.bar.set(frac);
            var abortDisabled = this.defaultTime == this.remainingTime;
            $('#timer-abort').prop('disabled', abortDisabled);
        },
        tick: function(self) {
            self.remainingTime -= 1;
            self.display();
            if (self.remainingTime <= 0) {
                self.done();
            }
        },
        done: function() {
            this.pause();
            $('#dim-screen').fadeIn(4000);
            $('#progressbar').addClass('flashing');
            $('#timer-playpause').children('i')
                .removeClass('fa-pause fa-play').addClass('fa-check');
        },
        reset: function() {
            if (this.isDone()) {
                $('#dim-screen').fadeOut(500);
                $('#progressbar').removeClass('flashing');
                $('#timer-playpause').children('i')
                    .removeClass('fa-pause fa-check').addClass('fa-play');
            }
            this.sessionInfo = PomodoroPlan.sessionInfo();
            $('#timer, #timer-buttons').removeClass('work break').addClass(this.sessionInfo.type);
            this.defaultTime = this.sessionInfo.minutes * 60;
            this.remainingTime = this.defaultTime;
            this.display();
        },
        start: function() {
            if (this.interval != null || this.remainingTime <= 0) return;
            this.interval = setInterval(this.tick, 1000, this);
            $('#timer-playpause').children('i')
                .removeClass('fa-play fa-check').addClass('fa-pause');
        },
        pause: function() {
            if (this.interval == null) return;
            clearInterval(this.interval);
            this.interval = null;
            $('#timer-playpause').children('i')
                .removeClass('fa-pause fa-check').addClass('fa-play');
        },
        confirm: function() {
            $.ajax({
                url: '/api/pomodoro/add',
                type: 'POST',
                data: JSON.stringify(this.sessionInfo),
                dataType: 'json',
                contentType: 'application/json; charset=utf-8',
            }).done(updateWorkCount);
            PomodoroPlan.accept();
            this.reset();
        },
        toggle: function() {
            if (this.isDone()) {
                this.confirm();
            } else if (this.isRunning()) {
                this.pause();
            } else {
                this.start();
            }
        },
    };
    Pomodoro.reset();

    $('#timer-playpause').click(function() {
        Pomodoro.toggle();
    });
    $('#timer-abort').click(function() {
        Pomodoro.pause();
        Pomodoro.reset();
    });


    function updateWorkCount() {
        var iso = $.format.date(Date.now(), "yyyy-MM-dd");
        $.get('/api/pomodoro/day/' + iso).done(function(resp) {
            var count = resp.count.work;
            if (!count) count = 0;
            $('#timer-work-count').text(count);
        });
    }
    updateWorkCount();

    function formatDuration(minutes) {
        var h = Math.floor(minutes / 60),
            m = minutes % 60;
        if (m < 10) m = '0' + m;
        return h + ':' + m;
    }
    function renderPomodoroPlan(plan) {
        var $list = $('#pomodoro-plan ul');
        var icons = {'work': 'fa-laptop', 'break': 'fa-coffee'};
        var cumulative = 0;
        $list.empty();
        $.each(plan, function(idx, unit) {
            var iconclass = 'fa ' + icons[unit.type];
            var itemclass = 'length' + unit.minutes;
            if (idx == PomodoroPlan.state)
                itemclass += ' active';
            cumulative += unit.minutes;
            $list.append(
                $('<li/>', {'class': itemclass})
                    .append(
                        $('<div/>', {'class': 'block ' + unit.type}).append(
                            $('<div/>', {'class': 'label'})
                                .append($('<i/>', {'class': iconclass}))
                                .append(' ' + unit.minutes + "′")))
                    .append($('<div/>', {'class': 'cumulative'})
                        .text(formatDuration(cumulative)))
                    .click(function() {
                        PomodoroPlan.changeState(idx);
                    })
            );
        });
    }

    setPomodoroPercentage = function(perc) {
        Pomodoro.remainingTime = (100 - perc) / 100 * Pomodoro.defaultTime;
    };

});
