(function () {
    'use strict';

    var data = {},
        exclude = [
            // stop words
            'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
            'any', 'are', 'arent', 'as', 'at', 'be', 'because', 'been', 'before',
            'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cant', 'cannot', 'could',
            'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont',
            'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadnt',
            'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell',
            'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him', 'himself',
            'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in',
            'into', 'is', 'isnt', 'it', 'its', 'its', 'itself', 'lets', 'me',
            'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off',
            'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves',
            'out', 'over', 'own', 'same', 'shant', 'she', 'shed', 'shell', 'shes',
            'should', 'shouldnt', 'so', 'some', 'such', 'than', 'that', 'thats',
            'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'theres',
            'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this',
            'those', 'through', 'to', 'too', 'under', 'until', 'up', 'us', 'very', 'was',
            'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'were', 'werent',
            'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while',
            'who', 'whos', 'whom', 'why', 'whys', 'will', 'with', 'wont', 'would',
            'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve', 'your',
            'yours', 'yourself', 'yourselves',

            // not relevant
            'com', 'new', 'news', 'video', 'exclusive', 'latest', 'online', 'pictures',
            'local', 'world', 'nation', 'state', 'top', 'story', 'review', 'photos',
            'report', 'blog', 'weather', 'time', 'times', 'day', 'year'
        ],
        headlineCount = 0,
        headlines = [],
        feedNames = [],
        master = [],
        words = [],
        counts = [],
        numRequests = 0,
        historyNum = 20,
        i,
        prev,
        util = {
            aMax: function (array) {
                return Math.max.apply(Math, array);
            },
            aMin: function (array) {
                return Math.min.apply(Math, array);
            },
            firebase: {
                name: 'https://nblenke.firebaseio.com/bigword',
                set: function (data) {
                    var fbRoot = new Firebase(util.firebase.name),
                        fbWords = fbRoot.child('words'),
                        //fbView = fbWords.limit(100),
                        fbWord = fbWords.child(data.date.sort);

                    // changedCallback = function (a, b) {
                    //     console.log('changedCallback', a, b);
                    // };
                    // fbView.on('child_added', function (a, b) {
                    //     console.log('child_added', a, b);
                    // });
                    // fbView.on('child_moved', changedCallback);
                    // fbView.on('child_changed', changedCallback);
                    fbWord.setWithPriority(data, data.date.sort);
                    console.log('firebase data sent');
                },
                get: function (callback) {
                    var fbRoot = new Firebase(util.firebase.name);
                    fbRoot.once('value', function (data) {
                        console.log('firebase data recieved');
                        callback(data.val().words);
                    });
                }
            },
            hilite: function (word, el) {
                var rgxp = new RegExp(word, 'gi'),
                    repl = '<span class="hilite">' + word + '</span>';
                $(el).each(function () {
                    $(this).html($(this).html().replace(rgxp, repl));
                });
            },
            arrShuffle: function (o) {
                for(var j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
                return o;
            },
            sortDate: function (date) {
                // 20130425T16
                return date.toJSON().replace(/\.|-/g, '').split(':')[0];
            },
            commafy: function(x) {
                return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            },
            sortObjByKey: function (map, options) {
                var keys = _.sortBy(_.keys(map), function(a) { return a; }),
                    newmap = {};
                if (options.reverse) {
                    keys.reverse();
                }
                if (options.shift) {
                    keys.shift();
                }
                if (options.pop) {
                    keys.pop();
                }
                _.each(keys, function(k) {
                    newmap[k] = map[k];
                });
                return newmap;
            },
            svgSupported: function () {
                return (document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1"));
            }
        },
        historyArr = [],
        loadHistory = function (num, data) {
            var ref = new Firebase("https://nblenke.firebaseio.com/bigword/words/");

            num = num ? num : 10;

            if (typeof data !== 'undefined') {
                for (var i = 0; i < historyArr.length; i += 1) {
                    $('#history-table').append($('#history-tmpl').tmpl(historyArr[i].val));
                }
                console.log('showing stored history');
                return;
            }

            console.log('retrieving last ' + num + ' items from history');
            ref.orderByKey().limitToLast(num).once('value', function (snapshot) {
                var obj = snapshot.val();
                var arr = [];
                var data = {};

                for (var prop in obj) {
                    arr.push({
                        key: prop,
                        val: obj[prop]
                    });
                }
                arr.reverse();

                $('#history-table').empty();

                ref.once('value', function(snapshot) {
                    if (arr.length === snapshot.numChildren()) {
                        $('#history-more').remove();
                    }
                    $('#historyCount').html(snapshot.numChildren());
                });

                for (var i = 0; i < arr.length; i += 1) {
                    data = arr[i].val;
                    data.date.pretty = Date.parse(data.date.json.split('.')[0] + 'Z')
                        .addHours(-4).toString('MMMM dS, yyyy h:mm t') + 'M';

                    $('#history-table').append($('#history-tmpl').tmpl(data));
                }

                $('#history-more').text('Show More').prop('disabled', false);

                historyArr = arr;
            });
        },
        build = function (arr) {
            _.each(arr, function (feed) {
                var arr = [];
                var url = 'https://query.yahooapis.com/v1/public/yql?q=SELECT%20*%20FROM%20xml%20WHERE%20url%3D%22' +
                    encodeURIComponent(feed.url) + '%22' +
                    '&format=json&diagnostics=true&callback=';

                $.getJSON(url, function (response) {
                    numRequests += 1;
                    if(!response.query.results) {
                        return;
                    }
                    _.each(response.query.results.rss.channel.item, function (item) {

                        arr.push({
                            title: item.title,
                            link: item.link
                        });
                    });
                    process(arr, feed.name);
                });
            });
        },
        process = function (arrHeadlines, feedName) {
            var data = {},
                date = new Date(),
                wordArray = [],
                wordsExcluded = [],
                wordsIncluded = [];

            feedNames.push(feedName);
            console.log('fetching feed ' + numRequests, feedName);

            headlineCount += arrHeadlines.length;

            _.each(arrHeadlines, function (headline) {
                headlines.push(headline);
            });

            $('.progress .bar').css('width', numRequests + '0%');

            if (numRequests === (feeds.length - 1)) {
                console.log('building');
                data.headlines = [];
                data.words = [];
                data.date = {
                    sort: util.sortDate(date),
                    json: date.toJSON(),
                    string: date.toString()
                };
                _.each(headlines, function (headline) {
                    if (!headline.title) {
                        return;
                    }
                    var clean = headline.title.replace(/(\?|\!|\&|\...|\-|\:|,|\')/g, ''),
                        // strip = headline.title.replace(/[\n\r]/g, '').replace(/\d/g,'').replace(/[^a-zA-Z0-9\s]/g,''),
                        pushArr = clean.split(' ');
                    //console.log(clean)
                    wordArray.push(pushArr);
                });
                _.each(_.flatten(wordArray), function (word) {
                    if (word.length > 1 && _.indexOf(exclude, word.toLowerCase()) === -1) {
                        wordsIncluded.push(word);
                    } else {
                        wordsExcluded.push(word);
                    }
                });
                wordArray = [];
                wordsExcluded = [];
                //console.log(wordsIncluded)
                master = wordsIncluded;
                var arr = master;
                arr.sort();
                _.each(arr, function (word, i) {
                    if (arr[i] !== prev) {
                        words.push(arr[i]);
                        counts.push(1);
                    } else {
                        counts[counts.length-1]++;
                    }
                    prev = arr[i];
                });
                _.each(_.zip(words, counts), function (item) {
                    if(item[1] === util.aMax(counts) && item[1] > 1) {
                        data.count = item[1];
                        data.word = item[0];
                    }
                });
                data.headlineCount = headlineCount;
                data.total = master.length;
                data.feedNames = feedNames;
                _.each(headlines, function (h) {
                    if (!h.title) {
                        return;
                    }
                    if (h.title.toLowerCase().search(' ' + data.word.toLowerCase() + ' ') !== -1) {
                        data.headlines.push(h);
                    }
                });
                _.each(util.arrShuffle(_.zip(words, counts)), function (item) {
                    var weight = 'w4',
                        num = item[1];
                    if (num > 5) {
                        weight = 'w3';
                    }
                    if (num > 10) {
                        weight = 'w2';
                    }
                    if (num > 15) {
                        weight = 'w1';
                    }
                    if (num > 2) {
                        item.push(weight);
                        data.words.push(item);
                    }
                });
                var ref = new Firebase("https://nblenke.firebaseio.com/bigword/words/");

                ref.orderByKey().limitToLast(1).once('value', function (snapshot) {
                    var now = util.sortDate(new Date()),
                        obj = snapshot.val(),
                        last = '';

                    for (var prop in obj) {
                        last = obj[prop].date.sort;
                    }
                    if (now !== last) {
                        util.firebase.set(data);
                    }
                });

                sessionStorage.setItem('bigword', JSON.stringify(data));
                render(data);
            }
        },
        render = function (data, refetchHistory) {
            data.total = util.commafy(data.total);
            data.exclude = exclude;
            data.svgSupported = util.svgSupported();

            console.log('rendering');
            console.log(data);

            $('#placeholder').html($('#current-tmpl').tmpl(data));
            util.hilite(data.word, '.headlines a');

            if (typeof refetchHistory !== 'undefined') {
                loadHistory(historyNum, historyArr);
            } else {
                loadHistory(historyNum);
            }

            if (util.svgSupported()) {
                google.load('visualization', '1', {
                    'packages': ['corechart'],
                    'callback': function () {
                        var chartArr = [],
                            chartData = new google.visualization.DataTable(),
                            options = {
                                legend: 'none',
                                width: $('.container-fluid').width(),
                                fontSize: 14,
                                fontName: 'Droid Serif',
                                chartArea: {top: 0, height: '84%'},
                                colors: ['#a1a1a1']
                            };
                        _.each(_.filter(data.words, function (w) {
                            return w[2] === 'w1' || w[2] === 'w2';
                        }), function (w) {
                            chartArr.push(_.initial(w));
                        });
                        if (!chartArr.length) {
                            _.each(_.filter(data.words, function (w) {
                                return w[2] === 'w3';
                            }), function (w) {
                                chartArr.push(_.initial(w));
                            });
                            options.chartArea.height = '94%';
                        }
                        options.height = (chartArr.length * options.fontSize) * (options.fontSize / 5);
                        chartData.addColumn('string', 'Word');
                        chartData.addColumn('number', 'Count');
                        chartData.addRows(chartArr);
                        new google.visualization.BarChart(document.getElementById('chart0')).draw(chartData, options);
                    }
                });
            }
        };
    if (sessionStorage.bigword) {
        console.log('sessionStorage data avaialable');
        render($.parseJSON(sessionStorage.getItem('bigword')));
    } else {
        var feeds = [
            {name: 'Google News', url: 'http://news.google.com/?output=rss&num=100'},
            {name: 'Yahoo News', url: 'http://news.yahoo.com/rss/'},
            //{name: 'Reddit', url: 'http://www.reddit.com/.rss'},
            {name: 'Newsvine', url: 'https://www.newsvine.com/_feeds/rss2/cs?id=38&n=6&s=av'},
            {name: 'Bing', url: 'http://www.bing.com/news?q=top+stories&format=RSS'},
            //{name: 'AP', url: 'http://hosted2.ap.org/atom/APDEFAULT/3d281c11a96b4ad082fe88aa0db04305'},
            {name: 'BBC', url: 'http://feeds.bbci.co.uk/news/rss.xml'},
            {name: 'Reuters', url: 'http://feeds.reuters.com/reuters/topNews'},
            {name: 'CNN', url: 'http://rss.cnn.com/rss/cnn_topstories.rss'},
            {name: 'CBS', url: 'http://feeds.cbsnews.com/CBSNewsMain'},
            {name: 'ABC', url: 'http://feeds.abcnews.com/abcnews/topstories'},
            {name: 'NBC', url: 'http://feeds.nbcnews.com/feeds/topstories'},
            {name: 'Time', url: 'http://feeds2.feedburner.com/time/topstories'},
            {name: 'NPR', url: 'http://www.npr.org/rss/rss.php?id=1001'},
            {name: 'New York Times', url: 'http://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml'},
            {name: 'Fox News', url: 'http://feeds.foxnews.com/foxnews/latest'}
        ];
        build(feeds);
    }

    $('body').on('click', '#history-table a', function () {
        var word = {};
        for (var i = 0; i < historyArr.length; i += 1) {
            word = historyArr[i];
            if (word.key === $(this).data('sort')) {
                render(word.val, false);
                window.scrollTo(0, 0);
            }
        }
        return false;
    });

    $('body').on('click', '.more-headlines', function () {
        $(this).hide();
        $('.headlines li.hide').slideDown();
        return false;
    });

    $('body').on('click', '#history-more', function () {
        $(this).text('Loading...').prop('disabled', true);
        historyNum += historyNum;
        loadHistory(historyNum);
    });
}());
