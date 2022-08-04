const BrowserFactory = require("../libs/BrowserFactory");

class Options {
  browserFactory;

  constructor(options) {
    this.setBrowserOptions(options);
  }

  setBrowserOptions(browserOptions) {
    this.browserOptions = browserOptions;
  }

  buildBrowserFactory() {
    if (!this.browserFactory) {
      this.browserFactory = new BrowserFactory(this.browserOptions);
    }

    return this.browserFactory;
  }
}

module.exports = Options;
