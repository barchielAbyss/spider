class PageResolver {
  page;
  _browserFactory;
  _pageFactory;
  _waitTimeout = 1000 * 30;

  constructor(options) {
    this._browserFactory = options.buildBrowserFactory();
    this._pageFactory = this._browserFactory.getPageFactory();
  }

  async getBrowser() {
    return await this._browserFactory.getBrowser();
  }

  getBrowserFactory() {
    return this._browserFactory;
  }

  async getPage() {
    if (this.page) {
      return this.page;
    }
    this.page = await this._pageFactory.getPage();
    return this.page;
  }

  async newPage() {
    this.page = await this._pageFactory.newPage();
    await this.page.bringToFront();
    return this.page;
  }

  setPage(page) {
    this.page = page;
  }

  async waitType(selector, _data) {
    const page = await this.getPage();
    await page.waitForSelector(selector, { timeout: this._waitTimeout });
    await page.type(selector, _data);
  }

  async waitClick(selector) {
    const page = await this.getPage();
    await page.waitForSelector(selector);
    await page.click(selector, { timeout: this._waitTimeout });
  }

  /**
   * 点击触发新tab
   * @param selector
   * @returns {Promise<Page>} 新的page
   */
  async waitClickNewPage(selector) {
    const page = await this.getPage();
    const browser = await this.getBrowser();
    await page.waitForSelector(selector); // 等待并获取点击跳转的goto元素
    const link = await page.$(selector);
    const newPagePromise = new Promise((x) =>
      browser.once("targetcreated", (target) => x(target.page()))
    );
    await link.click(); // 点击跳转
    return await newPagePromise; // newPage就是a链接打开窗口的Page对象
  }

  /**
   * 点击触发刷新当前页
   * @param selector
   * @returns {Promise<void>}
   */
  async waitClick2Page(selector) {
    const page = await this.getPage();
    await page.waitForSelector(selector);
    await Promise.all([
      page.waitForNavigation({ timeout: this._waitTimeout }),
      page.click(selector, { timeout: this._waitTimeout }),
    ]);
  }

  async waitForSelector(selector) {
    const _page = await this.getPage();
    await _page.waitForSelector(selector, { timeout: this._waitTimeout });
  }

  async goto(url) {
    const page = await this.getPage();
    return await page.goto(url);
  }

  config() {
    return new ConfigBuilder(this);
  }

  async $(selector) {
    const page = await this.getPage();
    return await page.$(selector);
  }

  async evaluate(pageFunction, ...args) {
    const page = await this.getPage();
    return page.evaluate(pageFunction, args);
  }

  async _removeRequestResponseListener() {
    const page = await this.getPage();
    if (page.lastRequestCallback) {
      await page.removeListener("request", page.lastRequestCallback);
    }
    if (page.lastResponseCallback) {
      await page.removeListener("response", page.lastResponseCallback);
    }
    page.lastRequestCallback = null;
    page.lastResponseCallback = null;
  }

  async clear() {
    const _chromePage = await this.getPage();
    this._removeRequestResponseListener();
    await _chromePage.on("request", (request) => {
      request.continue();
    });
  }
}

class ConfigBuilder {
  constructor(pageResolver) {
    this.pageResolver = pageResolver;
  }

  /**
   * 默认超时时间，单位秒
   * @param waitTimeout
   */
  waitTimeout(waitTimeout) {
    this.pageResolver._waitTimeout = waitTimeout * 1000;
    return this;
  }

  async build() {
    const _chromePage = await this.pageResolver.getPage();

    await this.pageResolver._removeRequestResponseListener();

    _chromePage.lastResponseCallback = async (response) => {
      const url = response.url();
      if (this._responseFilter) {
        this._responseFilter(url, response);
      }
    };

    _chromePage.on("response", _chromePage.lastResponseCallback);
  }
}

module.exports = PageResolver;
