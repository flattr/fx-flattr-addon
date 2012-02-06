Flattr add-on for Firefox
=======

The Flattr add-on for Firefox enables easy discovery and flattring of flattrable pages you visit in your browser.

The add-on asks the [Flattr API](http://developers.flattr.net/api/) whether a page is flattrable or not by sending the URL of the page to the [thing lookup](http://developers.flattr.net/api/resources/things/#check-if-a-thing-exists) resource - the results are cached in the browser for a while for increased performance. The add-on respects private browsing and disables checking when that's on. For details regarding the privacy of this add-on refer to the [Flattr privacy policy](http://flattr.com/privacy).

## How to build

This add-on uses [Mozilla's Add-on SDK](https://addons.mozilla.org/developers/builder). Download that and [install it](https://addons.mozilla.org/en-US/developers/docs/sdk/1.4/dev-guide/addon-development/installation.html) accordingly.

When you have installed the Add-on SDK you need to add the dependencies for this add-on. We need the [Urlbar Button module](https://github.com/voxpelli/moz-urlbarbutton) so download that and add it to the packages/-folder within the Add-on SDK - this is the way you add [third party modules](https://addons.mozilla.org/en-US/developers/docs/sdk/1.4/dev-guide/addon-development/third-party-packages.html) that an add-on uses.

Once you have added the dependency you can [download this add-on](https://github.com/flattr/fx-flattr-addon) itself and run it and build it the way you like. Check the Add-on SDK [Getting Started tutorial](https://addons.mozilla.org/en-US/developers/docs/sdk/1.4/dev-guide/addon-development/implementing-simple-addon.html) to find out how that is done.

## Learn more

* [Flattr.com](https://flattr.com/)
