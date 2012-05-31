//TODO: Add a flattr item to context menu for links?

exports.main = (function () {
  "use strict";

  var urlbarButton = require('urlbarbutton').UrlbarButton,
    data = require("self").data,
    request = require("request").Request,
    tabs = require('tabs'),
    ss = require("simple-storage"),
    pb = require("private-browsing"),
    getUrlCache,
    setUrlCache,
    checkAPI,
    checkLocation,
    checkLinks,
    autosubmit;

  // If we go over quota - then just reset
  ss.on("OverQuota", function () {
    ss.storage.flattrUrlCache = {};
  });

  getUrlCache = function (href) {
    if (pb.isActive) {
      return false;
    }

    var cacheItem;

    if (!ss.storage.flattrUrlCache) {
      ss.storage.flattrUrlCache = {};
    }

    if (ss.storage.flattrUrlCache[href]) {
      cacheItem = ss.storage.flattrUrlCache[href];

      if (Date.now() - cacheItem.timestamp > 24 * 3600 * 1000) {
        delete ss.storage.flattrUrlCache[href];
        return false;
      } else {
        return {
          flattrable : cacheItem.flattrable !== false,
          url : cacheItem.flattrable === true ? 'https://flattr.com/submit/auto?url=' + encodeURIComponent(href) : cacheItem.flattrable
        };
      }
    }
  };

  setUrlCache = function (href, flattrable) {
    if (!pb.isActive) {
      ss.storage.flattrUrlCache[href] = {timestamp : Date.now(), flattrable : flattrable};
    }
  };

  checkAPI = function (href, callback, url) {
    if (pb.isActive || href.indexOf('http') !== 0 || (url && url.indexOf('http') !== 0)) {
      callback(true);
      return;
    }

    var cached = getUrlCache(url ? url : href);

    if (cached) {
      callback(!cached.flattrable);
      return;
    }

    request({
      url: "https://api.flattr.com/rest/v2/things/lookup?url=" + encodeURIComponent(url ? url : href),
      onComplete: function (response) {
        var hide = true,
          hrefCached = getUrlCache(href),
          urlCached = url ? getUrlCache(url) : false;

        if (response.status === 200 && response.json) {
          if (
            (response.json.message && response.json.message === 'flattrable') ||
            (response.json.type && response.json.type === 'thing')
          ) {
            hide = false;
          }
        }

        if (url) {
          if (urlCached && urlCached.flattrable) {
            hide = false;
          } else {
            setUrlCache(url, !hide);
          }

          if (!hide && (!hrefCached || !hrefCached.flattrable)) {
            setUrlCache(href, 'https://flattr.com/submit/auto?url=' + encodeURIComponent(url));
          }
        } else if (hrefCached && hrefCached.flattrable) {
          hide = false;
        } else {
          setUrlCache(href, !hide);
        }

        callback(hide);
      }
    }).get();
  };

  checkLocation = function (href, callback) {
    checkAPI(href, callback);
  };

  checkLinks = function (href, callback, noCacheRevalidation) {
    if (href.indexOf('http') !== 0) {
      callback(true);
    }

    var result,
      cached = getUrlCache(href),
      links, i, length;

    if (cached && (noCacheRevalidation || cached.flattrable)) {
      result = cached.flattrable ? cached.url : false;
    }

    if (result === undefined) {
      links = this.querySelectorAll('link[rel="payment"]');
      for (i = 0, length = links.length; i < length; i++) {
        if (links[i].href && links[i].href.match(/^https?:\/\/flattr.com\//i)) {
          setUrlCache(href, links[i].href);
          result = links[i].href;
          break;
        }
      }
    }

    if (result === undefined && !pb.isActive) {
      links = this.querySelectorAll('link[rel="canonical"]');
      if (links.length && links[0].href && links[0].href !== href) {
        checkAPI(href, function (hide) {
          callback(hide, hide ? false : links[0].href);
        }, links[0].href);
        return;
      }
    }

    callback(result ? false : true, result ? result : false);
  };

  autosubmit = function (href, event) {
    if (event.type !== "click" || event.button !== 0) {
      return;
    }

    var cached = getUrlCache(href);

    if (cached) {
      tabs.open(cached.flattrable ? cached.url : false);
    } else {
      checkLinks.call(this, href, function (hide, url) {
        if (!hide) {
          tabs.open(url);
        }
      }, true);
    }
  };

  return function (options, callbacks) {
    urlbarButton({
      id : 'flattr-button',
      image : data.url("flattr-button.png"),
      onClick : autosubmit,
      onLocationChange : checkLocation,
      onPageShow : checkLinks
    });
  };
}());