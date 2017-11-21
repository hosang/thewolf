$(function() {
    var key, token, board, lists;

    var getKeys = new Promise(function(resolve, reject) {
        $.get('/api/keys/trello').done(function(data) {
            key = data.key;
            token = data.token;
            board = data.board;
            resolve(board);
        }).fail(function(err) {
            reject(err);
        });
    });

    function getBoard(id) {
        return new Promise(function(resolve, reject) {
            var url = 'https://api.trello.com/1/boards/' + id + '/lists?fields=pos,name,id&key=' + key + '&token=' + token;
            $.get(url).done(function(data) {
                data.sort(function(first, second) { return first.pos - second.pos; });
                lists = [data[0].id, data[1].id, data[2].id];
                resolve(lists);
            }).fail(function(err) {
                reject(err);
            });
        });
    }

    function refresh() {
        if (lists == null) {
            getKeys
                .then(getBoard)
                .then(updateLists)
                .catch((err) => console.error(err));
        } else {
            updateLists(lists);
        }
    }
    $('#refresh').click(refresh);
    refresh();

    function updateLists(listIds) {
        getList(listIds[0]).then(function(tasks) {
            listTasks(tasks, $('#trello-todo ul'), false);
            redecorateTodo();
        });
        getList(listIds[1]).then(function(tasks) {
            listTasks(tasks, $('#trello-doing ul'), true);
            var first = [];
            if (tasks.length > 0) first = [tasks[0]];
            listTasks(first, $('#task-current'), true);
            redecorateDoing();
        });
        getList(listIds[2]).then(function(tasks) {
            listTasks(tasks, $('#trello-done ul'), false);
        });
    }

    function listTasks(tasks, tasklist, description) {
        tasklist.empty();
        $.each(tasks, function(idx, card) {
            var content = $('<div/>')
                .append($('<span/>', {'class': 'name'}).text(card.name));
            if (description && card.desc && card.desc.length > 0) {
                content.append(
                    $('<span/>', {'class': 'description'}).text(card.desc));
            }
            tasklist.append($('<li/>')
                .data('id', card.id)
                .data('name', card.name)
                .append(content));
        });
    }
    function getList(id, tasklist, cb, description) {
        return new Promise(function(resolve, reject) {
            var url = 'https://api.trello.com/1/list/' + id + '/cards?fields=id,name,desc&key=' + key + '&token=' + token;
            $.get(url).done(function(data) {
                resolve(data);
            }).fail(function(err) {
                reject(err);
            });
        });
    }

    function redecorateTodo() {
        $('#trello-todo button').remove();
        $('#trello-todo ul').children('li').append(
            $('<button/>').click((ev) => moveCard(ev, 1)).append(
                $('<i/>').attr('class', 'fa fa-arrow-right'))
        );
    }
    function todoToDoing() {
        var $self = $(this).parent();
        var id = $self.data('id');
        var url = 'https://api.trello.com/1/cards/' + id +
            '?idList=' + lists[1] + '&key=' + key + '&token=' + token;
        $.ajax(url, {method: 'PUT'}).done(function(data) {
            refresh();
            return;
        }).fail(function(err) {
            console.log(err);
        });
    }

    function redecorateDoing(elements) {
        if (!elements) elements = $('#trello-doing ul').children('li');
        elements.children('button').remove();
        elements.append([
            $('<button/>').click((e) => moveCard(e, 0)).append(
                $('<i/>').attr('class', 'fa fa-undo')),
            $('<button/>').click((e) => moveCard(e, 2)).append(
                $('<i/>').attr('class', 'fa fa-check')),
        ]);
    }
    function moveCard(event, list) {
        var $li = $(event.target).parent().parent();
        var id = $li.data('id'),
            name = $li.data('name');
        var url = 'https://api.trello.com/1/cards/' + id +
            '?idList=' + lists[list] + '&key=' + key + '&token=' + token;
        $.ajax(url, {method: 'PUT'}).done(function(data) {
            refresh();
            return;
        }).fail(function(err) {
            console.log(err);
        });
        if (list == 2) {
            $.ajax({
                url: '/api/tasks/done/add',
                type: 'POST',
                data: JSON.stringify({'name': name}),
                dataType: 'json',
                contentType: 'application/json; charset=utf-8',
            }).done(updateDoneCount);
        }
    }

    function updateDoneCount() {
        $.get('/api/tasks/done/today').done(function(resp) {
            $('#task-count').text(resp.count);
        });
    }
    updateDoneCount();

});
