const fs = require("fs");
const { Parser } = require('json2csv');




fs.readdir('./exports', async function(err, files) {
  if (err) {
    console.log('Error', err);
    return
  }

  let _files = [...files].sort((a, b) => a.length - b.length)

  
  let dataList = []

  for (let file of _files) {
      const fileData = await fs.readFileSync(`./exports/${file}`, 'utf8')
      dataList.push(...JSON.parse(fileData))
  }


  dataList.reduce((prev, item, index) => {
    const i = Math.floor(index / 10000)
    if (prev[i]) {
      prev[i].push(item)
    } else {
      prev[i] = [item]
    }

    return prev
  }, []).forEach((group, i) => {
    try {
      const parser = new Parser();
      const csv = parser.parse(group);
      fs.writeFileSync(`./dist/risfond.com_${i+1}.csv`, csv)
    } catch (err) {
      console.error(err);
    }

  })
});
