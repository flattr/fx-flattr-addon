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
    checkFlattrability,
    getRelPayment,
    checkRelPayment,
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

  checkFlattrability = function (href, callback) {
    if (href.indexOf('http') !== 0 || pb.isActive) {
      callback(true);
      return;
    }

    var cached = getUrlCache(href);

    if (cached) {
      callback(!cached.flattrable);
      return;
    }

    request({
      url: "https://api.flattr.com/rest/v2/things/lookup?url=" + encodeURIComponent(href),
      onComplete: function (response) {
        var hide = true,
          cached = getUrlCache(href);

        // checkRelPayment() might finish before this request does - we need to respect the result of that one
        if (cached && cached.flattrable) {
          callback(false);
          return;
        }

        if (response.status === 200 && response.json) {
          if (
            (response.json.message && response.json.message === 'flattrable') ||
            (response.json.type && response.json.type === 'thing')
          ) {
            hide = false;
          }
        }

        setUrlCache(href, !hide);

        callback(hide);
      }
    }).get();
  };

  getRelPayment = function (doc, href) {
    if (href.indexOf('http') !== 0) {
      return false;
    }

    var result = false,
      cached = getUrlCache(href),
      links, i, length;

    if (cached && cached.flattrable) {
      result = cached.flattrable.url;
    } else {
      links = doc.querySelectorAll('link[rel="payment"]');
      for (i = 0, length = links.length; i < length; i++) {
        if (links[i].href && links[i].href.match(/^https?:\/\/flattr.com\//i)) {
          setUrlCache(href, links[i].href);
          result = links[i].href;
          break;
        }
      }
    }

    return result;
  };

  checkRelPayment = function (href, callback) {
    callback(getRelPayment(this, href) === false);
  };

  autosubmit = function (href, event) {
    if (event.type !== "click" || event.button !== 0) {
      return;
    }

    var cached = getUrlCache(href),
      flattrUrl;

    if (cached) {
      flattrUrl = (cached.flattrable ? cached.url : false);
    } else {
      flattrUrl = getRelPayment(this, href);
    }

    if (flattrUrl) {
      tabs.open(flattrUrl);
    }
  };

  return function (options, callbacks) {
    urlbarButton({
      id : 'flattr-button',
      image : data.url("flattr-button.png"),
      onClick : autosubmit,
      onLocationChange : checkFlattrability,
      onPageShow : checkRelPayment
    });
  };
}());