const fs = require("fs");
const path = require("path");
const { argv } = require("process");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);
const exifr = require("exifr");

const getEvents = async (file) => {
  try {
    let events = [];
    for (let line of file.trim().split("\n")) {
      if (line.includes("%", 0)) continue;
      let s = line.trim().split(/\s+/);
      // check if array placement is right
      if (
        +s[2] >= -90 &&
        +s[2] <= 90 &&
        +s[3] >= -180 &&
        +s[3] <= 180 &&
        +s[4] > 0 &&
        +s[4] < 5000
      ) {
        events.push([
          dayjs(s[0].replaceAll("/", "-") + "T" + s[1] + "Z"),
          s[2],
          s[3],
          s[4],
          s[7],
          s[8],
          s[9],
        ]);
      } else {
        throw new SyntaxError("Invalid pos data");
      }
    }
    return events;
  } catch (e) {
    return console.log(e);
  }
};

const getPics = async (picsPath) => {
  try {
    const files = await fs.promises.readdir(picsPath);
    const pics = [];
    for (const file of files) {
      const p = path.join(picsPath, file);
      const exifTime = await exifr.parse(p);
      const time = exifTime["DateTimeOriginal"];
      pics.push([file, time]);
    }
    return pics;
  } catch (e) {
    return console.error(e);
  }
};

const arr2csv = (events, pics) => {
  let str = "name,lat,lon,height,sdn,sde,sdu\n";
  // store temp previous difference time from event and pic and if is less or equal 1 seconds return error
  let arrDiffTime = [];
  console.log("event_timestamp, picture_timestamp, difference_between");
  for (let i = 0; i < events.length; i++) {
    const eventTime = events[i][0];
    const picTime = pics[i][1];
    const diffTime = Math.abs(eventTime.diff(picTime));
    arrDiffTime.push(diffTime);
    const average = arrDiffTime.reduce((a, b) => a + b, 0) / arrDiffTime.length;
    // checks if pics and events difference is +- 1000 ms
    if (diffTime >= average - 1000 && diffTime <= average + 1000) {
      console.log(eventTime["$d"], ",", picTime, ",", diffTime, "✅");
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
    } else {
      console.error(eventTime["$d"], picTime, diffTime, "❌");
      return console.error(
        `${pics[i][0]} and event on row ${i} doesnt match, consider to shift`
      );
    }
  }
  fs.writeFileSync(`${argv[2]}.ppk.csv`, str);
};

(async (posFile, picsPath) => {
  try {
    const events = await getEvents(posFile);
    const pics = await getPics(picsPath);
    arr2csv(events, pics);
    if (events.length > pics.length)
      console.error(
        `There is ${
          events.length - pics.length
        } more events than pictures, consider to delete events`
      );
    if (events.length < pics.length)
      console.error(
        `There is ${
          pics.length - events.length
        } more pictures than events, consider to delete pictures`
      );
  } catch (e) {
    return console.error(e);
  }
})(fs.readFileSync(argv[2], "utf8"), argv[3]);
