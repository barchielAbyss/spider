const fs = require("fs");
const path = require("path");
const axios = require("axios").default;
const PageResolver = require("../configs/PageResolver");

const { wait } = require("../utils");

const TARGET_WEB_PAGE_INDEX = "https://www.risfond.com/case/all";
const exportPath = 'exports/title'
const maxPage = 299


class TestResolver extends PageResolver {
  constructor(options) {
    super(options);
  }
  async load() {
    await this.config().waitTimeout(0).build();

    for (let i = 2477; i <= maxPage; i++) {
      await this.goto(`${TARGET_WEB_PAGE_INDEX}-${i}`);

      let page = await this.getPage();
      await wait(200);
  
      const list = await page.evaluate(() => {
        const domList = document.querySelectorAll('.it-list li')
        return Array.from(domList).map(node => node.querySelector('a').href)
      })
  
      await this.downloadPage(list, i)
      console.log(`${i}页下载完毕`)
    }
  }
  async downloadPage(list, id) {
    let downloadList = []

    for (let index in list) {
      const url = list[index]
      await this.page.goto(url)

      const downloads = await this.page.evaluate(() => {
        const docs = document.querySelector(".sc_d_l");
        const itemList = docs.querySelectorAll('.sc_d_i')

        let res = {}
        for (let item of itemList) {
          let [title, value] = Array.from(item.childNodes).map(node => node.textContent)
          title = title.replace('：', '')
          res[title] = value
        }
        return res
      })

      try {
        await fs.accessSync(exportPath);
      } catch {
        await fs.mkdirSync(path.dirname(exportPath), { recursive: true });
      }

      downloadList.push(downloads)
    }

    await fs.writeFileSync(
      `${exportPath}-${id}.json`,
      JSON.stringify(downloadList)
    );
  }
  destroy() {
    this.page = null;
    this._browserFactory = null;
    this._pageFactory = null;
  }
}


module.exports = TestResolver
