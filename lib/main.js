//TODO: Add a flattr item to context menu for links?

var UrlbarButton = require('urlbarbutton').UrlbarButton,
    data = require("self").data,
    Request = require("request").Request,
    tabs = require('tabs'),
    ss = require("simple-storage"),
    privateBrowsing = require("private-browsing")  ,
    checkFlattrability, autosubmit;

// If we go over quota - then just reset
ss.on("OverQuota", function () {
  ss.storage.flattrUrlCache = {};
});

checkFlattrability = function (callback) {
  var href = this.location.href;

  if (href.indexOf('http') !== 0) {
    callback(true);
    return;
  }

  if (!ss.storage.flattrUrlCache) {
    ss.storage.flattrUrlCache = {}
  }

  if (ss.storage.flattrUrlCache[href]) {
    if (Date.now() - ss.storage.flattrUrlCache[href].timestamp > 24 * 3600 * 1000) {
      delete ss.storage.flattrUrlCache[href];
    } else {
      callback(!ss.storage.flattrUrlCache[href].flattrable);
      return;
    }
  }

  console.log('Doing lookup of ' + "https://api.flattr.com/rest/v2/things/lookup?url=" + encodeURIComponent(href));

  Request({
    url: "https://api.flattr.com/rest/v2/things/lookup?url=" + encodeURIComponent(href),
    onComplete: function (response) {
      var hide = true;

      if (response.status === 200 && response.json) {
        if (
          (response.json.message && response.json.message == 'flattrable') ||
          (response.json.type && response.json.type == 'thing')
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
  if (event.type != "click" || event.button != 0) {
    return;
  }

  tabs.open('https://flattr.com/submit/auto?url=' + encodeURIComponent(tabs.activeTab.url));
};

exports.main = function(options, callbacks) {
  if (privateBrowsing.active) {
    return;
  }

  UrlbarButton({
    id : 'flattr-button',
    image : data.url("flattr-button.png"),
    onClick : autosubmit,
    showForPage : checkFlattrability
  });
};
