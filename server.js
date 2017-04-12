/**
 * Created by Administrator on 2017/4/6 0006.
 */
var express = require('express'),
    fs = require('fs'),
    app = express(),
    bodyParser = require('body-parser'),
    c = require('child_process'),
    http = require('http'),
    iconv = require('iconv-lite');
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({extended: true}));
var store = {}, tks = {};
app.post('/load', function (request, response) {
    response.end();
    load(request);
});
function load(request, callback) {
    var data = request.body;
    if (data.url) {
        util.get(data.url, function (result) {
                var title = util.getTitle(result);
                var reg1 = /<a\s+href=[^>]+>([^<]+)<\/a>/gi,
                    href,
                    hrefs = [];
                while (match = reg1.exec(result)) {
                    href = util.getProp(match[0], 'href');
                    if (href.substr(-4) === 'html') {
                        hrefs.push({href: href, text: match[1]});
                    }
                }
                store[data.url] = store[data.url] || {};
                store[data.url].title = title;
                store[data.url].hrefs = hrefs;
                callback ? callback() : '';
            }, function (err) {
                console.log(err);
            }
        );
    }
}
app.post('/download', function (request, response) {
    response.end();
    var data = request.body;
    if (data.url && data.sz) {
        if (store[data.url]) {
            download(data);
        } else {
            load(request, function () {
                store[data.url] ? download(data) : '';
            });
        }
    }
    function download(data) {
        var sz = data.sz.split(','),
            url = data.url,
            hrefs = store[url].hrefs,
            i = 0, l = sz.length, a,
            tk = new downloadTask(url);
        tks[url] = tk;
        for (; i < l; i++) {
            if (a = hrefs[sz[i]]) {
                if (a.href.substring(0, 4) !== 'http') {
                    tk.add(a, i, data.url);
                }
            }
        }
        tk.start();
    }
});
function downloadTask(url) {
    this.url = url;
    this.total = 0;
    this.title = store[url].title;
    this.arrAll = new Array();
    this.executed = 0;
    this.tasks = [];
    this.threadNumber = 0;
    this.maxThreadNumber = 20;
    this.errorList = [];
}
downloadTask.prototype.add = function (hrefs, i, url) {
    var that = this;
    this.total++;
    this.tasks.push(function () {
        util.get(util.mergeAddress(url, hrefs.href), function (html) {
            var reg = /<(\w+)[^>]*id="content[^>]+>([\s\S]*?)<\/\1>/gi,
                match = reg.exec(html);
            if (match && match[2]) {
                that.arrAll[i] = hrefs.text + '\n' + match[2].replace(/<(\w+)[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/&nbsp;/g, ' ').replace(/<br[^>]*?>/g, '');
            } else {
                that.errorList.push(i);
            }
            that.executed++;
            that.threadNumber--;
        }, function () {
            this.executed++;
            that.threadNumber--;
            that.errorList.push(i);
        });
    });
};
downloadTask.prototype.start = function () {
    if (this.tasks.length !== 0) {
        if (this.threadNumber < this.maxThreadNumber) {
            this.threadNumber++;
            this.tasks[0]();
            this.tasks.splice(0, 1);
            this.start();
        } else {
            var that = this;
            setTimeout(function () {
                that.start();
            }, 500);
        }
    } else {
        var id = setInterval(function () {
            if (this.executed === this.total) {
                clearInterval(id);
                this.end();
            }
        }.bind(this), 500);
    }
};
downloadTask.prototype.end = function () {
    if (this.arrAll.length !== 0) {
        fs.writeFile(__dirname + '/novel/' + this.title + '.txt', this.arrAll.join('\n'), function (err) {
            if (err) {
                console.log(err);
            }
        });
    }
};
downloadTask.prototype.query = function () {
    return this.executed / this.total + '';
};
app.get('/list', function (request, response) {
    var data = request.query;
    response.send(store[data.url] && store[data.url].hrefs);
});
app.get('/jindu', function (request, response) {
    var data = request.query,
        tk = tks[data.url],
        result = {percent: tk.query()};
    if (tk.errorList) {
        result.errorList = tk.errorlist;
    }
    response.send(result);
});
app.listen('8080');
c.exec('start http://localhost:8080');
var util = {
    get: function (url, callBack, error) {
        try {
            http.get(url, function (res) {
                var result = [];
                // res.setEncoding('utf-8');
                res.on('data', function (v) {
                    result.push(v);
                });
                res.on('end', function () {
                    callBack(iconv.decode(Buffer.concat(result), 'gbk'));
                });
            }).on('error', function (err) {
                error && error(err);
            });
        }
        catch (e) {
            error && error(e);
        }
    },
    getTitle: function (html) {
        var reg1 = /<meta [^>]+>/gi,
            reg2 = /property="og:title"/i,
            str,
            match;
        while (match = reg1.exec(html)) {
            str = match[0];
            if (reg2.exec(str)) {
                return this.getProp(str, 'content');
            }
        }
    },
    getProp: function (str, key) {
        var reg = new RegExp(key + '="([^"]+)', 'i');
        return reg.exec(str)[1];
    },
    mergeAddress: function () {
        var len = arguments.length,
            result = arguments[0],
            a;
        for (var i = 1; i < len; i++) {
            a = arguments[i];
            if (result.slice(-1) === '/' && a.substring(0, 1) === '/') {
                resilt = result + a.substring(1);
            } else if (result.slice(-1) !== '/' && a.substring(0, 1) !== '/') {
                result = result + '/' + a;
            } else {
                result = result + a;
            }
        }
        return result;
    }
};