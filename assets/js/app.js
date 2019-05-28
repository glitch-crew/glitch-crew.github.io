"use strict";
var acceptHeader = '*/*';
var Site = (function () {
    function Site() {
        this.router = new Carbon.Router({
            '/': this.index.bind(this),
            '/about': this.about.bind(this),
            '/contact': this.contact.bind(this),
            '/projects/{id}/{number}': this.project.bind(this),
            '/projects/{id}': this.project.bind(this),
            '/blog': this.blog.bind(this),
            '/blog/{tag}': this.blog.bind(this)
        });
        this.router.start({ dispatch: true });
        this.context = null;
    }
    Site.prototype.index = function (context) {
        this.loadThen(context);
        this.selectNavLink('homeLink');
    };
    Site.prototype.project = function (context) {
        this.selectNavLink('project' + context.params.id + 'Link');
        this.loadThen(context).then(function () {
            if (context.params.number) {
                var pieceIndex = parseInt(context.params.number, 10) - 1;
            }
        });
    };
    Site.prototype.about = function (context) {
        this.loadThen(context);
        this.selectNavLink('aboutLink');
    };
    Site.prototype.blog = function (context) {
        this.loadThen(context);
        this.selectNavLink('blogLink');
    };
    Site.prototype.post = function (context) {
        this.loadThen(context);
        this.selectNavLink('blogLink');
    };
    Site.prototype.contact = function (context) {
        this.loadThen(context);
        this.selectNavLink('contactLink');
    };
    Site.prototype.selectNavLink = function (id) {
        _.queryAll('li.current').forEach(function (el) { return el.classList.remove('current'); });
        var el = document.getElementById(id);
        el && el.classList.add('current');
    };
    Site.prototype.loadThen = function (context) {
        this.context = context;
        this.path = context.url;
        if (context.init) {
            this.onLoaded({
                path: context.path,
                init: true,
                notify: true
            });
            return Promise.resolve();
        }
        return this.load(context.url, true);
    };
    Site.prototype.loadPartial = function (data) {
        var _this = this;
        var el = document.querySelector(data.selector);
        return fetch(data.url, {
            credentials: 'same-origin',
            headers: { 'Accept': acceptHeader }
        }).then(function (response) { return response.text(); })
            .then(function (html) {
            el.outerHTML = html;
            switch (_this.path) {
                case '/':
                    _this.selectNavLink('homeLink');
                    break;
                case '/about':
                    _this.selectNavLink('aboutLink');
                    break;
                case '/contact':
                    _this.selectNavLink('contactLink');
                    break;
            }
        });
    };
    Site.prototype.load = function (path, notify) {
        var _this = this;
        if (window.bridge) {
            bridge.path = path;
        }
        this.path = path;
        var url = path + (path.indexOf('?') > -1 ? '&' : '?') + 'partial=true';
        var mainEl = document.querySelector('main');
        return fetch(url, {
            credentials: 'same-origin',
            headers: {
                'Accept': acceptHeader,
                'X-Partial': '1'
            }
        }).then(function (response) {
            document.title = decodeURI(response.headers.get("X-Page-Title") || '');
            return response.text();
        }).then(function (html) {
            mainEl.innerHTML = html;
            _this.onLoaded({
                path: path.split('?')[0],
                init: false,
                notify: notify
            });
            return Promise.resolve(true);
        });
    };
    Site.prototype.onLoaded = function (context) {
        if (!this.lazyLoader) {
            this.lazyLoader = new Carbon.LazyLoader();
        }
        window.scrollTo(0, 0);
        _.queryAll('[on-insert]').forEach(function (el) {
            Carbon.ActionKit.dispatch({
                type: 'insert',
                target: el
            });
            el.removeAttribute('on-insert');
        });
        new Carbon.Scrollable(document.querySelector('.scrollable'));
        Carbon.Reactive.trigger('routed', context);
        this.lazyLoader.setup();
    };
    return Site;
}());
var SiteActions = {
    setStyles: function (data) {
        var ss = document.getElementById('styles');
        var href = ss.getAttribute('href');
        var basePath = href.substring(0, href.indexOf('?') + 1);
        for (var key in data) {
            ss.dataset[key] = data[key];
        }
        var url = basePath + _.serialize(ss.dataset);
        ss.setAttribute('href', url);
        console.log(url);
    },
    updateBlock: function (data) {
        var block = SiteBlocks[data.name];
        block && block.update(data.value || data.data);
    }
};
var SiteBlocks = {
    nav: {
        update: function (data) {
            site.loadPartial({
                url: '/?partial=nav',
                selector: 'nav'
            });
        }
    },
    siteTitle: {
        update: function (text) {
            var el = document.querySelector('header h1');
            el.classList[text ? 'remove' : 'add']('hide');
            el.textContent = text || '';
        }
    },
    tagline: {
        update: function (text) {
            var el = document.querySelector('.tagline');
            if (!el)
                return;
            el.classList[text ? 'remove' : 'add']('hide');
            el.textContent = text || '';
        }
    },
    siteFooterContent: {
        update: function (text) {
            var el = document.getElementById('footerContent');
            el.innerHTML = text;
        }
    },
    logo: {
        update: function () {
            site.loadPartial({
                url: '/?partial=header',
                selector: 'header'
            });
        }
    },
    brandingGlyph: {
        update: function (value) {
            var el = document.querySelector('carbon-glyph');
            el.innerHTML = "&#x" + value + ";";
        }
    },
    photo: {
        photo: function (data) {
            site.load('/about', false);
        }
    },
    cover: {
        resume: function (data) {
            site.load('/about', false);
        }
    },
    resume: {
        update: function (data) {
            site.load('/about', false);
        }
    }
};
Carbon.ActionKit.observe('click');
Carbon.controllers.set('form', {
    setup: function (e) { new Carbon.Form(e.target); }
});
Carbon.controllers.set('nav', {
    setup: function (e) {
        var scrollableEl = document.querySelector('.scrollable');
        new Carbon.Scrollable(scrollableEl);
        var contentEl = document.querySelector('.content');
        var footerEl = document.querySelector('footer');
        scrollableEl.addEventListener('overflowing', function (e) {
            contentEl.style.paddingBottom = footerEl.clientHeight + 'px';
        }, false);
    }
});
document.body.addEventListener('player:play', function (e) {
    var target = e.target;
    target.closest('carbon-piece').classList.add('played');
}, false);
var site = new Site();
var webp = new Image();
webp.onload = function () {
    acceptHeader = '*/*,image/webp';
};
webp.src = 'data:image/webp;base64,UklGRjIAAABXRUJQVlA4ICYAAACyAgCdASoBAAEALmk0mk0iIiIiIgBoSygABc6zbAAA/v56QAAAAA==';
