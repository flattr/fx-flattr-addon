Flattr add-on for Firefox
=======

The Flattr add-on for Firefox enables easy discovery and flattring of pages you visit in your browser.

## How to build

This add-on uses [Mozilla's Add-on SDK](https://addons.mozilla.org/developers/builder). Download that and [install it](https://addons.mozilla.org/en-US/developers/docs/sdk/1.4/dev-guide/addon-development/installation.html) accordingly.

When you have installed the Add-on SDK you need to add the dependencies for this add-on. We need the [Urlbar Button module](https://github.com/voxpelli/moz-urlbarbutton) so download that and add it to the packages/-folder within the Add-on SDK - this is the way you add [third party modules](https://addons.mozilla.org/en-US/developers/docs/sdk/1.4/dev-guide/addon-development/third-party-packages.html) that an add-on uses.

Once you have added the dependency you can download this add-on itself and run it and build it the way you like. Check the Add-on SDK [Getting Started tutorial](https://addons.mozilla.org/en-US/developers/docs/sdk/1.4/dev-guide/addon-development/implementing-simple-addon.html) to find out how that is done.
