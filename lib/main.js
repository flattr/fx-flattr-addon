/*global require: false, exports: false */
/*jslint indent: 2 */

(function () {
  "use strict";

  var urlbarButton = require('urlbarbutton').UrlbarButton,
  // Try to use require('tabs') instead of require('showforpage')
    showForPage = require('showforpage').ShowForPage,
    data = require("self").data,
    request = require("request").Request,
    tabs = require('tabs'),
    ss = require("simple-storage"),
    pb = require("private-browsing"),
    buttonImage = data.url("flattr-button-v2.png"),
    button,
    listeners,
    fillRectRounded,
    buttonSetImageCount,
    getUrlCache,
    setUrlCache,
    checkAPI,
    checkLinks,
    checkLocation,
    checkPage,
    autosubmit;

  // If we go over quota - then just reset
  ss.on("OverQuota", function () {
    ss.storage.flattrUrlCache = {};
  });

  if (!ss.storage.flattrUrlCache) {
    ss.storage.flattrUrlCache = {};
  }

  fillRectRounded = function (canvasContext, x, y, w, h, r) {
    canvasContext.beginPath();
    canvasContext.moveTo(x + r, y);
    canvasContext.lineTo(x + w - r, y);
    canvasContext.quadraticCurveTo(x + w, y, x + w, y + r);
    canvasContext.lineTo(x + w, y + h - r);
    canvasContext.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    canvasContext.lineTo(x + r, y + h);
    canvasContext.quadraticCurveTo(x, y + h, x, y + h - r);
    canvasContext.lineTo(x, y + r);
    canvasContext.quadraticCurveTo(x, y, x + r, y);
    canvasContext.closePath();
    canvasContext.fill();
  };

  buttonSetImageCount = function (href, src, count) {
    if (!count) {
      button.setImage(src, href);
      return;
    }

    var size = 7,
      borderX = 0,
      borderY = 1,
      bottomY = 16,
      rightX = 16;

    if (count > 99999) {
      count = '+';
    } else if (count > 999) {
      count = Math.floor(count / 1000) + 'k';
    } else if (count < 100) {
      size = 8;
      borderX = 1;
    }

    button.getButtons(href).forEach(function (elem) {
      var doc = elem.ownerDocument,
        img = doc.createElementNS('http://www.w3.org/1999/xhtml', 'img');

      img.onload = function () {
        var canvas = doc.createElementNS('http://www.w3.org/1999/xhtml', 'canvas'),
          context = canvas.getContext('2d'),
          width;

        canvas.height = canvas.width = this.width;
        context.drawImage(this, 0, 0);

        context.font = 'bold ' + size + 'px "Verdana", sans-serif';
        context.textAlign = 'end';

        width = context.measureText(count).width;

        context.fillStyle = "rgba(50,50,50,0.7)";
        fillRectRounded(context, rightX - width - borderX * 2, bottomY - size - borderY * 2, width + borderX * 2, size + borderY * 2, 2);

        context.fillStyle = '#fff';
        context.fillText(count, rightX - borderX, bottomY - borderY - 1);

        button.setImage(canvas.toDataURL('image/png'), href);
      };

      img.src = src;
    });
  };

  getUrlCache = function (href) {
    if (pb.isActive) {
      return false;
    }

    var cacheItem;

    if (ss.storage.flattrUrlCache[href]) {
      cacheItem = ss.storage.flattrUrlCache[href];

      if (Date.now() - cacheItem.timestamp > 24 * 3600 * 1000) {
        delete ss.storage.flattrUrlCache[href];
        return false;
      }

      return {
        flattrable : cacheItem.flattrable !== false,
        redirected : cacheItem.flattrable !== true && cacheItem.flattrable !== false,
        url : cacheItem.flattrable === true ? 'https://flattr.com/submit/auto?url=' + encodeURIComponent(href) : cacheItem.flattrable,
        flattrs : cacheItem.flattrs
      };
    }
  };

  setUrlCache = function (href, flattrable, flattrs) {
    if (!pb.isActive) {
      ss.storage.flattrUrlCache[href] = {timestamp : Date.now(), flattrable : flattrable};
      if (flattrable && flattrs !== false) {
        ss.storage.flattrUrlCache[href].flattrs = flattrs;
      }
    }
  };

  checkAPI = function (href, callback, url) {
    if (pb.isActive || href.indexOf('http') !== 0 || (url && url.indexOf('http') !== 0)) {
      callback(false);
      return;
    }

    var cached = getUrlCache(url || href);

    if (cached && (!cached.flattrable || cached.flattrs !== undefined)) {
      callback(cached.flattrable, cached.flattrs);
      return;
    }

    request({
      url: "https://api.flattr.com/rest/v2/things/lookup?url=" + encodeURIComponent(url || href),
      onComplete: function (response) {
        var flattrable = false,
          flattrs,
          hrefCached = getUrlCache(href),
          urlCached = url ? getUrlCache(url) : false;

        if (response.status === 200 && response.json) {
          if (response.json.message && response.json.message === 'flattrable') {
            flattrable = true;
            flattrs = false;
          } else if (response.json.type && response.json.type === 'thing') {
            flattrable = true;
            flattrs = response.json.flattrs;
          }
        }

        if (url) {
          if (urlCached && urlCached.flattrable) {
            flattrable = true;
          } else {
            setUrlCache(url, flattrable, flattrs);
          }

          if (hrefCached && hrefCached.flattrable) {
            flattrable = true;
          } else if (flattrable) {
            setUrlCache(href, 'https://flattr.com/submit/auto?url=' + encodeURIComponent(url), flattrs);
          }
        } else if (hrefCached && hrefCached.flattrable) {
          flattrable = true;
        } else {
          setUrlCache(href, flattrable, flattrs);
        }

        callback(flattrable, flattrs);
      }
    }).get();
  };

  checkLinks = function (doc, href, callback, noCacheRevalidation) {
    if (href.indexOf('http') !== 0) {
      callback(false);
    }

    var result, links, i, length,
      flattrs = false,
      cached = getUrlCache(href);

    if (cached && (noCacheRevalidation || cached.flattrable)) {
      result = cached.flattrable ? cached.url : false;
      flattrs = cached.flattrs || false;
    }

    if (result === undefined) {
      links = doc.querySelectorAll('link[rel="payment"]');
      for (i = 0, length = links.length; i < length; i += 1) {
        if (links[i].href && links[i].href.match(/^https?:\/\/flattr\.com\//i)) {
          setUrlCache(href, links[i].href);
          result = links[i].href;
          break;
        }
      }
    }

    if (result === undefined && !pb.isActive) {
      links = doc.querySelectorAll('link[rel="canonical"]');
      if (links.length && links[0].href && links[0].href !== href) {
        checkAPI(href, function (flattrable, flattrs) {
          callback(flattrable ? 'https://flattr.com/submit/auto?url=' + encodeURIComponent(links[0].href) : false, flattrs);
        }, links[0].href);
        return;
      }
    }

    callback(result || false, flattrs);
  };

  checkLocation = function (href) {
    button.setImage(buttonImage, href);
    checkAPI(href, function (flattrable, flattrs) {
      buttonSetImageCount(href, buttonImage, flattrs);
      button.setVisibility(flattrable, href);
    });
  };

  checkPage = function (href, inBackground) {
    if (inBackground) {
      checkLocation(href);
    }

    checkLinks(this, href, function (url, flattrs) {
      if (flattrs) {
        buttonSetImageCount(href, buttonImage, flattrs);
      }
      // checkLocation() has already hidden the button if it should be hidden so no need for us to do it again here
      if (url !== false) {
        button.setVisibility(true, href);
      }
    });
  };

  autosubmit = function (href, event) {
    if (event.type !== "click" || event.button !== 0) {
      return;
    }

    var cached = getUrlCache(href);

    if (cached) {
      tabs.open(cached.flattrable ? cached.url : false);
    } else {
      checkLinks(this, href, function (url) {
        if (url) {
          tabs.open(url);
        }
      }, true);
    }
  };

  exports.main = function () {
    button = urlbarButton({
      id : 'flattr-button',
      image : buttonImage,
      onClick : autosubmit
    });

    listeners = showForPage({
      onLocationChange : checkLocation,
      onPageShow : checkPage
    });
  };

  exports.onUnload = function (reason) {
    if (reason !== 'shutdown') {
      button.remove();
      listeners.remove();
    }
  };
}());