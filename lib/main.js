/*global require: false, exports: false */
/*jslint indent: 2 */

(function () {
  "use strict";

  var urlbarButton = require('urlbarbutton').UrlbarButton,
    showForPage = require('showforpage').ShowForPage,
    request = require("request").Request,
    tabs = require('tabs'),
    ss = require("simple-storage"),
    pb = require("private-browsing"),
    flattrPattern = new (require("match-pattern").MatchPattern)("*.flattr.com"),
    buttonImage = require("self").data.url("flattr-button-v2.png"),
    button,
    listeners,
    fillRectRounded,
    buttonSetImageCount,
    getPageStatus,
    enforcePageStatus,
    setPageStatus,
    checkAPI,
    checkLinks,
    checkLocation,
    checkPage,
    checkNewLink,
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

  buttonSetImageCount = function (src, count, href) {
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

  getPageStatus = function (href) {
    if (pb.isActive) {
      return false;
    }

    var cacheItem = ss.storage.flattrUrlCache[href];

    if (cacheItem) {
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

  enforcePageStatus = function (href, status, removeOnFalse) {
    if (status && (status.flattrable || (!status.flattrable && removeOnFalse)) && button.getButtons(href).length) {
      buttonSetImageCount(buttonImage, status.flattrs, href);
      button.setVisibility(status.flattrable, href);
    }
  };

  setPageStatus = function (href, type, flattrable, flattrs, enforce) {
    var cacheItem;

    if (!pb.isActive) {
      cacheItem = ss.storage.flattrUrlCache[href];

      if (!cacheItem || (Date.now() - cacheItem.timestamp > 24 * 3600 * 1000)) {
        cacheItem = {};
      } else if (
        cacheItem.flattrable && (
          (cacheItem.type === 'page' && type !== 'page') ||
          (cacheItem.type === 'canonical' && type !== 'page' && type !== 'canonical')
        )
      ) {
        return;
      }

      cacheItem.timestamp = Date.now();
      cacheItem.flattrable = flattrable;
      cacheItem.type = flattrable;

      if (flattrable && flattrs !== undefined) {
        cacheItem.flattrs = flattrs;
      }

      ss.storage.flattrUrlCache[href] = cacheItem;
    }

    if (enforce !== false) {
      enforcePageStatus(href, {
        flattrable : flattrable !== false,
        flattrs : flattrs
      });
    }
  };

  checkAPI = function (href, url, callback) {
    if (pb.isActive || href.indexOf('http') !== 0 || (url && url.indexOf('http') !== 0)) {
      if (callback) {
        callback(false);
      }
      return;
    }

    var status = getPageStatus(url || href);

    if (status && (!status.flattrable || status.flattrs !== undefined)) {
      if (callback) {
        callback(status.flattrable, status.flattrs);
      } else if (callback === undefined) {
        enforcePageStatus(href, status);
      }
      return;
    }

    request({
      url: "https://api.flattr.com/rest/v2/things/lookup?url=" + encodeURIComponent(url || href),
      onComplete: function (response) {
        var flattrable = false,
          flattrs;

        if (response.status === 200 && response.json) {
          if (response.json.message && response.json.message === 'flattrable') {
            flattrable = true;
            flattrs = false;
          } else if (response.json.type && response.json.type === 'thing') {
            flattrable = true;
            flattrs = response.json.flattrs;
          }
        }

        if (callback) {
          callback(flattrable, flattrs);
        } else {
          if (url) {
            setPageStatus(url, 'page', flattrable, flattrs, callback === undefined);
            if (flattrable) {
              flattrable = 'https://flattr.com/submit/auto?url=' + encodeURIComponent(url);
            }
          }
          setPageStatus(href, url ? 'canonical' : 'page', flattrable, flattrs, callback === undefined);
        }
      }
    }).get();
  };

  checkLinks = function (doc, href, callback) {
    var enforce = callback ? false : callback,
      status = getPageStatus(href),
      links,
      i,
      length,
      callbackAPI;

    if (status.flattrable) {
      callback(status.url);
      return;
    }

    links = doc.querySelectorAll('link[rel~="payment"]');
    for (i = 0, length = links.length; i < length; i += 1) {
      if (links[i].href && flattrPattern.test(links[i].href)) {
        setPageStatus(href, 'payment', links[i].href, undefined, enforce);
        if (callback) {
          callback(links[i].href);
        }
        break;
      }
    }

    if (!pb.isActive) {
      links = doc.querySelectorAll('link[rel~="canonical"]');
      if (links.length && links[0].href && links[0].href !== href) {
        if (callback) {
          callbackAPI = function (flattrable, flattrs) {
            callback(flattrable ? 'https://flattr.com/submit/auto?url=' + encodeURIComponent(links[0].href) : false, flattrs);
          };
        } else {
          callbackAPI = callback;
        }
        checkAPI(href, links[0].href, callbackAPI);
      }
    }
  };

  checkLocation = function (href, domReady) {
    var status = getPageStatus(href);

    if (href.indexOf('http') !== 0) {
      button.setVisibility(false, href);
    } else if (status) {
      enforcePageStatus(href, status, true);
    } else {
      button.setVisibility(false, href);

      checkAPI(href);

      if (domReady) {
        checkLinks(this, href, function (url, flattrs) {
          setPageStatus(href, url, flattrs);
        });
      }
    }
  };

  // If a page is loaded in the background then we need to actively cache the page URL
  checkPage = function (href, inBackground) {
    if (inBackground) {
      checkAPI(href, false, false);
    }
  };

  checkNewLink = function (href, data, inBackground) {
    if (!data.rels.payment && !data.rels.canonical) {
      return;
    }

    var enforce = inBackground ? false : undefined;

    if (data.rels.payment && flattrPattern.test(data.href)) {
      setPageStatus(href, 'relpayment', data.href, enforce);
    }
    if (data.rels.canonical) {
      checkAPI(href, data.href, enforce);
    }
  };

  autosubmit = function (href, event) {
    if (event.type !== "click" || event.button !== 0) {
      return;
    }

    checkLinks(this, href, function (url) {
      if (url) {
        tabs.open(url);
      }
    });
  };

  exports.main = function () {
    button = urlbarButton({
      id : 'flattr-button',
      image : buttonImage,
      onClick : autosubmit
    });

    listeners = showForPage({
      onLocationChange : checkLocation,
      onPageShow : checkPage,
      onLink : checkNewLink
    });
  };

  exports.onUnload = function (reason) {
    if (reason !== 'shutdown') {
      button.remove();
      listeners.remove();
    }
  };
}());