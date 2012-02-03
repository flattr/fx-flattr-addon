const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

var UrlbarButton = function (options) {
  if (!options || !options.id) {
    return;
  }

  var delegate = {
    onTrack: function (window) {
      console.log("Tracking a window: " + window.location);
  
      var urlbarIcons = window.document.getElementById("urlbar-icons");
  
      if (urlbarIcons) {
        var button = window.document.createElementNS(NS_XUL, "image");

        button.id = options.id;
        button.className = "urlbar-icon";
        button.collapsed = true;

        if (options.image) {
          button.setAttribute("src", options.image);
        }  
        if (options.onClick) {
          button.addEventListener("click", options.onClick);
        }
  
        urlbarIcons.insertBefore(button, urlbarIcons.firstChild);
  
        if (options.showForPage) {
          window.document.getElementById("appcontent").addEventListener("pageshow", function (event) {
            var doc = event.originalTarget;
            if (doc.defaultView.frameElement) return; // skip iframes/frames  

            var button = window.document.getElementById(options.id);
            options.showForPage.call(doc, function (hide) {
              button.collapsed = hide;
            });
          }, true);
        }
      }
    },
    onUntrack: function (window) {
      //TODO: Unload something?
    }
  };
  
  var winUtils = require("window-utils");
  new winUtils.WindowTracker(delegate);

  var tabBrowser = require("tab-browser");
  var tracker = {
    onTrack: function(tabbrowser) {
      console.log("A new tab is being tracked." + tabbrowser.ownerDocument.getElementById("appcontent"));
      if (options.showForPage) {
        tabbrowser.tabContainer.addEventListener("TabSelect", function () {
          var button = tabbrowser.ownerDocument.getElementById(options.id);
          options.showForPage.call(tabbrowser.contentDocument, function (hide) {
            button.collapsed = hide;
          });
        }, false);
      }
    },
    onUntrack: function(tabbrowser) {
      console.log("A tab is no longer being tracked.");
    }
  };
  tabBrowser.Tracker(tracker);
};

exports.UrlbarButton = UrlbarButton;
