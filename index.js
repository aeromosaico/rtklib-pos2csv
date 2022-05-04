const fs = require("fs");
const path = require("path");
const { argv } = require("process");
const dayjs = require("dayjs");

const getEvents = async (file) => {
  try {
    let events = [];
    for (let line of file.trim().split("\n")) {
      if (line.includes("%", 0)) continue;
      let s = line.trim().split(/\s+/);
      if (
        +s[2] >= -90 &&
        +s[2] <= 90 &&
        +s[3] >= -180 &&
        +s[3] <= 180 &&
        +s[4] > -1000 &&
        +s[4] < 20000
      ) {
        events.push([dayjs(s[0] + s[1]), s[2], s[3], s[4], s[7], s[8], s[9]]);
      } else {
        throw new SyntaxError("Invalid data");
      }
    }
    return events;
  } catch (e) {
    return console.log(e);
  }
};

const getPics = async (picsPath) => {
  const files = await fs.promises.readdir(picsPath);
  const pics = [];
  for (const file of files) {
    const p = path.join(picsPath, file);
    const stat = await fs.promises.stat(p);
    pics.push([file, stat.mtime]);
  }
  return pics;
};

const arr2csv = (arrayHeader, events, pics) => {
  let str = "name,lat,lon,height,sdn,sde,sdu\n";
  let prevDiffTime;
  for (let i = 0; i < events.length; i++) {
    const eventTime = events[i][0];
    const picTime = pics[i][1];
    const diffTime = eventTime.diff(picTime);
    if (!prevDiffTime) prevDiffTime = diffTime;
    //seconds
    if (diffTime - prevDiffTime > 1001 * 1000)
      return console.log(
        `Image ${pics[i][0]} and respective event timestamp doesnt match`
      );
    str +=
      pics[i][0] +
      "," +
      events[i][1] +
      "," +
      events[i][2] +
      "," +
      events[i][3] +
      "," +
      events[i][4] +
      "," +
      events[i][5] +
      "," +
      events[i][6] +
      "\n";
    prevDiffTime = diffTime;
  }
  fs.writeFileSync(argv[3] + "ppk.txt", str);
};

(async (posFile, picsPath) => {
  try {
    const arrayHeader = ["name", "lat", "lon", "height", "sdn", "sde", "sdu"];
    const events = await getEvents(posFile);
    const pics = await getPics(picsPath);
    if (events.length > pics.length) throw "too many events | missing images";
    if (events.length < pics.length) throw "too many images | missing events";
    arr2csv(arrayHeader, events, pics);
  } catch (e) {
    return console.error(e);
  }
})(fs.readFileSync(argv[2], "utf8"), argv[3]);
