const fs = require("fs");
const path = require("path");
const axios = require("axios").default;
const PageResolver = require("../configs/PageResolver");

const { wait } = require("../utils");

const TARGET_WEB_PAGE_INDEX = "http://www.hiyd.com/dongzuo/";
const FileMapName = 'exports/file.map.json'

class TestResolver extends PageResolver {
  fileMap = [];
  constructor(options) {
    super(options);
  }

  async load() {
    await this.config().waitTimeout(0).build();
    await this.goto(TARGET_WEB_PAGE_INDEX);

    const browser = await this.getBrowser()
    let page = await this.getPage();

    await wait(500);
    const tagMain = await page.$(".o-exercise-list > ul");
    const tagList = await tagMain.$$(".hvr-glow");
    let pageSize = tagList.length
    let totalPage = await page.evaluate(() => {
      const totalNode = document.querySelector(".mod-page > ins > span");
      return totalNode.innerText;
    });

    totalPage = parseInt(String(totalPage).substring(1));
    // test
    // await this.runSpider(page, 1, `man`);

    await this.writeFileMap()

    const {id: lastManId, sex: lastManSex} = this.fileMap[this.fileMap.length -1]

    let lastId = lastManSex === 'man' ? lastManId : totalPage

    for (let i = Math.floor(lastId/pageSize); i < totalPage; i++) {
      await this.goto(`${TARGET_WEB_PAGE_INDEX}?page=${i}`);
      await wait(1500);

      await this.runSpider(page, i, `man`);
      page = await this.getPage();
    }

    // ⬇ 获取女教练
    const cookies = [
      {
        name: "coach_gender",
        value: "2",
      },
    ];

    await page.setCookie(...cookies);
    await this.goto(TARGET_WEB_PAGE_INDEX);
    page = await this.getPage();


    lastId = lastManSex === 'woman' ? lastManId : 1

    for (let i = lastId; i < totalPage; i++) {
      await this.goto(`${TARGET_WEB_PAGE_INDEX}?page=${i}`);
      await wait(1500);

      await this.runSpider(page, i, `woman`);
      page = await this.getPage();

      await wait(500);
    }

    // ⬆ 获取女教练

    

    await browser.close();
  }

  async writeFileMap() {
    let fileMap = []
    try {
      fileMap = JSON.parse(await fs.readFileSync(FileMapName, 'utf-8'))
    } catch {}

    if (!this.fileMap.length) {
      this.fileMap = fileMap
    }


    await fs.writeFileSync(
      FileMapName,
      JSON.stringify(Object.values(this.fileMap))
    );
  }

  async runSpider(page, pageId, type) {
    console.log(`程序正在爬取第${pageId}页`);
    const tagMain = await page.$(".o-exercise-list > ul");
    const tagList = await tagMain.$$(".hvr-glow");

    for (let tagIndex in tagList) {
      const _id = Number(tagIndex) + 1;
      const tagPage = await this.waitClickNewPage(
        `.o-exercise-list > ul > .hvr-glow:nth-child(${_id}) > a`
      );
      const dz_url = await tagPage.url()
      const dz_id = path.basename(dz_url)
      await wait(1500);

      const downloads = await tagPage.evaluate(() => {
        const video = document.getElementById("jp_video_0")?.src;
        const imgs = Array.from(document.querySelectorAll("img")).map(
          (img) => img?.src
        ).filter(i => i && !~i.indexOf('logo3.png'));
        const title = document.querySelector(".video-title")?.innerText;
        const infoDom = document.querySelector(".info-main");
        const sportType = infoDom.querySelector('.info-main-section:nth-child(1) > p:nth-child(1) > em')?.innerText
        const level = infoDom.querySelector('.info-main-section:nth-child(1) > p:nth-child(2) > em')?.innerText
        const mainMusclesDom = infoDom.querySelector('.info-main-section:nth-child(2) > p:nth-child(1) > a')

        const musclesId = mainMusclesDom?.attributes?.href?.value
        const mainMuscles = mainMusclesDom?.innerText

        const otherMainMuscles = infoDom.querySelector('.info-main-section:nth-child(2) > p:nth-child(2) > em')?.innerText
        const instrument = infoDom.querySelector('.info-main-section:nth-child(3) > p > em')?.innerText
        const doList = document.querySelector(".guide-pic-list")?.innerText;
        const how = document.querySelector(".guide-text")?.innerText;
        return {
          video,
          imgs,
          title,
          sportType,
          level,
          musclesId,
          mainMuscles,
          otherMainMuscles,
          instrument,
          doList,
          how,
        };
      });
    

      const { video, imgs, musclesId } = downloads;
      const key = `dz_${type}_${dz_id}`;

      const fetchUrl = (url) => {
        const basePath = path.basename(url);
        return `exports/hiyd/${key}/${basePath}`;
      }

      const fetchPathValue = (url) => {
        const testReg = /=(\d+)/
        return url.match(testReg)?.[1] || ''
      }

      const _musclesId = fetchPathValue(musclesId)
      const _video =  fetchUrl(video)
      const _imgs = imgs.map(url => fetchUrl(url))

      this.fileMap.push({
        ...downloads,
        id: dz_id,
        musclesId: _musclesId,
        video: _video,
        imgs: _imgs,
        sex: type,
        type: '动作',
      })

      await this.writeFileMap()
      await this.download({ filePath: _video, url: video });

      for (let index in imgs) {
        const filePath = _imgs[index]
        await this.download({ filePath, url: imgs[index] });
      }
      await wait(1000);
      await tagPage.close();
    }
  }
  async download({ filePath, url }) {
    // 判断 catch
    // if (fs.access(filePath)) {
    //   return true;
    // }
    console.log(filePath)
    try {
      await fs.accessSync(filePath);
      console.log('文件已存在')
    } catch {
      await fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    try {
      const file = await axios({
        method: "get",
        url,
        responseType: "stream",
      });

      file.data.pipe(fs.createWriteStream(filePath));
    } catch (err) {
      console.log(err);
    }
  }
  destroy() {
    this.page = null;
    this._browserFactory = null;
    this._pageFactory = null;
    this.fileMap = [];
  }
}

module.exports = TestResolver;
