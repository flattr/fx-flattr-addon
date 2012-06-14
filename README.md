Flattr add-on for Firefox
=======

The Flattr add-on for Firefox enables easy discovery and flattring of flattrable pages you visit in your browser.

The add-on asks the [Flattr API](http://developers.flattr.net/api/) whether a page is flattrable or not by sending the URL of the page to the [thing lookup](http://developers.flattr.net/api/resources/things/#check-if-a-thing-exists) resource - the results are cached in the browser for a while for increased performance. The add-on respects private browsing and disables checking when that's on. For details regarding the privacy of this add-on refer to the [Flattr privacy policy](http://flattr.com/privacy).

## How to build

This add-on uses [Mozilla's Add-on SDK](https://addons.mozilla.org/developers/builder). Download that and [install it](https://addons.mozilla.org/en-US/developers/docs/sdk/latest/dev-guide/tutorials/installation.html) accordingly.

When you have installed the Add-on SDK you need to add the dependencies for this add-on. We need the [Urlbar Button module](https://github.com/voxpelli/moz-urlbarbutton) and the [ShowForPage module](https://github.com/voxpelli/moz-showforpage) so download those and add it to the packages/-folder within the Add-on SDK - this is the way you add [third party modules](https://addons.mozilla.org/en-US/developers/docs/sdk/latest/dev-guide/tutorials/adding-menus.html) that an add-on uses.

Once you have added the dependency you can [download this add-on](https://github.com/voxpelli/moz-showforpage/zipball/master) itself and run it and build it the way you like. Check the Add-on SDK [Getting Started tutorial](https://addons.mozilla.org/en-US/developers/docs/sdk/latest/dev-guide/tutorials/getting-started-with-cfx.html) to find out how that is done.

## Learn more

* [Flattr.com](https://flattr.com/)

## Changelog

### 1.1.0

* Shows flattr count in icon.
* New icon with the lovely Flattr colors.
* Checks link-tags for data that can identify a flattrable page. Both rel-payment and rel-canonical links are checked.
* Checks for flattr-data after a page has been loaded - if a useful link-tag is added to a site not yet detected as flattrable then that can identify it as flattrable.
* Shows rel-payment data in privacy mode as it requires no API-lookups.
