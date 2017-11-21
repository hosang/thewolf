var Loadbar;

$(function() {
    Loadbar = {
        count: 0,
        inc: function() {
            if (this.count == 0) {
                $('#load-bar').show();
            }
            this.count += 1;
        },
        dec: function() {
            this.count -= 1;
            if (this.count == 0) {
                $('#load-bar').hide();
            }
        },

    };
});
