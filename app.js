const md5 = require("md5-node");
const Options = require("./configs/Options");
const Tasks = require("./tasks/index");

const ChromePath =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const options = new Options({
  executablePath: ChromePath,
  ignoreDefaultArgs: ["--enable-automation"],
  headless: true, // 关闭无头模式
  devtools: false, // 打开 chromium 的 devtools
});

Tasks.forEach(async (Task) => {
  const task = new Task(options);
  await task.load();
  await task.destroy();
});
