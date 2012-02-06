//TODO: Add a flattr item to context menu for links?

exports.main = (function () {
  "use strict";

  var urlbarButton = require('urlbarbutton').UrlbarButton,
    data = require("self").data,
    request = require("request").Request,
    tabs = require('tabs'),
    ss = require("simple-storage"),
    pb = require("private-browsing"),
    checkFlattrability,
    autosubmit;

  // If we go over quota - then just reset
  ss.on("OverQuota", function () {
    ss.storage.flattrUrlCache = {};
  });

  checkFlattrability = function (href, callback) {
    if (href.indexOf('http') !== 0 || pb.isActive) {
      callback(true);
      return;
    }

    if (!ss.storage.flattrUrlCache) {
      ss.storage.flattrUrlCache = {};
    }

    if (ss.storage.flattrUrlCache[href]) {
      if (Date.now() - ss.storage.flattrUrlCache[href].timestamp > 24 * 3600 * 1000) {
        delete ss.storage.flattrUrlCache[href];
      } else {
        callback(!ss.storage.flattrUrlCache[href].flattrable);
        return;
      }
    }

    request({
      url: "https://api.flattr.com/rest/v2/things/lookup?url=" + encodeURIComponent(href),
      onComplete: function (response) {
        var hide = true;

        if (response.status === 200 && response.json) {
          if (
            (response.json.message && response.json.message === 'flattrable') ||
            (response.json.type && response.json.type === 'thing')
          ) {
            hide = false;
          }
        }

        ss.storage.flattrUrlCache[href] = {timestamp : Date.now(), flattrable : !hide};

        callback(hide);
      }
    }).get();
  };

  autosubmit = function (event) {
    if (event.type !== "click" || event.button !== 0) {
      return;
    }

    tabs.open('https://flattr.com/submit/auto?url=' + encodeURIComponent(tabs.activeTab.url));
  };

  return function (options, callbacks) {
    if (pb.isActive) {
      return;
    }

    urlbarButton({
      id : 'flattr-button',
      image : data.url("flattr-button.png"),
      onClick : autosubmit,
      showForPage : checkFlattrability
    });
  };
}());