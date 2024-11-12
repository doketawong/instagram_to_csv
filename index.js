const axios = require('axios');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const {Client} = require('pg');
var schedule = require('node-schedule');
require('dotenv').config();
//send csv file to email
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'spijjw003@gmail.com',
    pass: 'gdsg knen qgaq ndku',
  },
});

const {DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE, ACCESS_TOKEN} =
  process.env;

const client = new Client({
  user: DB_USER,
  host: DB_HOST,
  database: DB_DATABASE,
  password: DB_PASSWORD,
  port: DB_PORT,
});

client.connect(function (err) {
  if (err) throw err;
  console.log('Connected!');
});

const url =
  'https://graph.facebook.com/v17.0/355915284524115/feed?access_token=';
const pictureUrl = 'https://graph.facebook.com/v17.0/';
const pictureAccess = '/attachments?access_token=';
let access_token = ACCESS_TOKEN;
let dataArr = [];
let lastProcessDate;
let latestTime;

const query = `SELECT * FROM config where config_name = 'PROCESS_DATE'`;
const findTitle = `SELECT * FROM product_list where title = $1`;

client.query(query, (err, res) => {
  if (err) {
    console.error(err);
    return;
  }
  for (let row of res.rows) {
    lastProcessDate = row.date;
  }
});

async function apiCall() {
  dataArr = [];
  const response = await axios.get(url + access_token);
  await processContent(response);
  if (dataArr.length > 0) {
    writeCsv();
  }
}

async function processContent(content) {
  // For each item in the content data
  let previousDate = true;
  for (const item of content.data.data) {
    // Get the item ID
    const id = item.id;

    // Get the item message
    let message = item.message;

    // Get the item created time
    const createTime = item.created_time;

    // Get the last process date
    const currentDate = new Date(lastProcessDate);
    //set current date to 23:59:59
    currentDate.setHours(23, 59, 59, 999);

    // Get the message created time
    const messageDate = new Date(createTime);

    // If the message created time is later than the last process date
    if (messageDate > currentDate && message) {
      previousDate = true;
      // Get the item title
      const title = getTitle(message);

      // Get the item size
      const size = getSize(message);

      // Get the item price
      const price = getPrice(message);

      // Get the item picture
      let picture;
      await axios
        .get(pictureUrl + id + pictureAccess + access_token)
        .then(function (tempResponse) {
          const pictureUrl = tempResponse.data.data[0];
          picture = pictureUrl.media.image.src;
        });

      // Get the item description
      message = message.substring(0, 300);

      const seoDescription = message.substring(0, 230);

      //find latest time
      if (latestTime == null || latestTime < messageDate) {
        latestTime = messageDate;
      }
      // Query the database to see if the title already exists
      const res = await client.query(findTitle, [title]);

      // If the title does not exist, add it to the data array
      if (res.rows.length == 0 && title != '') {
        console.log('Insert: ' + title);
        dataArr.push({
          id: id,
          engDescription: message,
          chiDescription: message,
          engSeoDescription: seoDescription,
          chiSeoDescription: seoDescription,
          price: price,
          specificationNameAEng: size,
          specificationNameAChi: size,
          variationNameAEng: size,
          variationNameAChi: size,
          engTitle: title,
          chiTitle: title,
          picture: picture,
          onlineStoreStatus: 'Y',
          createDate: createTime,
        });

        await client.query(
          `INSERT INTO "product_list" ("id", "content", "title", "price","createdate")  
      VALUES ($1, $2, $3, $4, $5)`,
          [id, message, title, price, createTime],
        );
      }
    } else {
      previousDate = false;
    }
  }

  // If the content data has the next page
  if (content.data.paging.next && previousDate) {
    //TODO: skip next page if current page date is earlier than last process date
    // Get the next page content
    console.log('getting next page...');
    axios.get(content.data.paging.next).then(function (tempResponse) {
      // Process the next page content
      processContent(tempResponse);
    });
  } else {
    return dataArr;
  }
}

function writeCsv() {
  console.log('writing to file...');
  const csvWriter = createCsvWriter({
    path: 'instagram.csv',
    header: [
      {id: 'id', title: 'No'},
      {id: 'engTitle', title: 'Eng Title'},
      {id: 'chiTitle', title: 'Chi Title'},
      {id: 'engSummary', title: 'Eng Summary'},
      {id: 'chiSummary', title: 'Chi Summary'},
      {id: 'engDescription', title: 'Eng Description'},
      {id: 'chiDescription', title: 'Chi Description'},
      {id: 'engSeoTitle', title: 'Eng SEO Title'},
      {id: 'chiSeoTitle', title: 'Chi SEO Title'},
      {id: 'engSeoDescription', title: 'Eng SEO Description'},
      {id: 'chiSeoDescription', title: 'Chi SEO Description'},
      {id: 'seoKeywords', title: 'SEO keywords'},
      {id: 'preorderItem', title: 'Preorder Item'},
      {id: 'preorderEngNote', title: 'Preorder Eng Note'},
      {id: 'preorderChiNote', title: 'Preorder Chi Note'},
      {id: 'onlineStoreStatus', title: 'Online Store Status'},
      {id: 'picture', title: 'Picture'},
      {id: 'additionalPicture', title: 'Additional Picture'},
      {id: 'onlineStoreCategoriesEng', title: 'Online Store Categories Eng'},
      {id: 'onlineStoreCategoriesChi', title: 'Online Store Categories Chi'},
      {id: 'price', title: 'Price'},
      {id: 'salePrice', title: 'Sale Price'},
      {id: 'cost', title: 'cost'},
      {id: 'sku', title: 'sku'},
      {id: 'quantity', title: 'quantity'},
      {id: 'weight', title: 'weight'},
      {id: 'productTag', title: 'Product Tag'},
      {id: 'specificationNameAEng', title: 'Specification Name A Eng'},
      {id: 'specificationNameAChi', title: 'Specification Name A Chi'},
      {id: 'specificationNameBEng', title: 'Specification Name B Eng'},
      {id: 'specificationNameBChi', title: 'Specification Name B Chi'},
      {id: 'variationImage', title: 'Variation Image'},
      {id: 'variationNameAEng', title: 'Variation name A Eng'},
      {id: 'variationNameAChi', title: 'Variation name A Chi'},
      {id: 'a', title: 'Variation name B(English)'},
      {id: 'b', title: 'Variation name B(Chinese)'},
      {id: 'c', title: 'Variation quantity'},
      {id: 'd', title: 'Variation price'},
      {id: 'e', title: 'Variant Sale Price'},
      {id: 'f', title: 'Variant Cost'},
      {id: 'g', title: 'Variation SKU'},
      {id: 'h', title: 'Variant Weight'},
      {id: 'i', title: 'Barcode'},
      {id: 'createDate', title: 'CreateDate'},
    ],
  });
  // Write the data array to the CSV file
  csvWriter.writeRecords(dataArr).then(() => {
    const fs = require('fs');
    const csv = fs.readFileSync('instagram.csv');
    const BOM = '\ufeff';
    fs.writeFileSync('instagram.csv', BOM + csv);
  });

  //update database
  let displayTime;
  //update database
  if (latestTime) {
    client.query(
      `UPDATE "config" SET "date" = $1 WHERE "config_name" = 'PROCESS_DATE'`,
      [latestTime],
    );

    displayTime = latestTime.toLocaleString('en-US', {
      timeZone: 'Asia/Hong_Kong',
    });
  }

  console.log(dataArr.length + ' records written to file.');
  const mailOptions = {
    from: 'spijjw003@gmail.com',
    to: '1155086874@link.cuhk.edu.hk',
    subject: 'Update Shopline Product List ' + displayTime,
    text: 'Upload product',
    attachments: [
      {
        filename: 'instagram.csv',
        path: './instagram.csv',
      },
    ],
  };
  if (dataArr.length > 0) {
    transporter.sendMail(mailOptions, function (err, info) {
      if (err) {
        console.log(err);
      } else {
        console.log(info);
      }
    });

    // Output the end
    console.log('END ' + dataArr.length);
  }
}

function getTitle(content) {
  // Find the index of the first and last square brackets.
  const titleOpen = content.indexOf('【') || content.indexOf('【');
  const titleClose = content.indexOf('】') || content.indexOf('】');
  if (titleOpen < 0 || titleClose < 0) {
    // Return an empty string if the title is not found.
    return '';
  }
  // Extract the title from the square brackets.
  const title = content.substring(titleOpen + 1, titleClose);
  return title;
}

function getSize(content) {
  // find the start of the size description
  const sizeOpen = content.indexOf('/');
  // get the size description
  const sizeDesc = content.substring(sizeOpen + 1, content.length);
  // find the end of the size description
  const sizeClose = sizeDesc.indexOf('/');
  // if we didn't find both /s, return an empty string
  if (sizeOpen < 0 || sizeClose < 0) {
    return '';
  }
  // get the size value
  const size = sizeDesc.substring(0, sizeClose);
  // return the size value
  return size;
}

function getPrice(content) {
  //content trim space
  content = content.replace(/\s/g, '');
  // Get the index of the $ sign or ＄ sign
  let priceIndex = content.indexOf('$');

  // If the $ sign is found
  if (priceIndex > 0) {
    // Get the price from the content
    var price = content.substring(priceIndex + 1, priceIndex + 4);
    // If the last character is not a number, remove it
    if (!isNumber(price.substring(price.length - 1))) {
      price = price.substring(0, price.length - 1);
    }
  } else {
    // If the $ sign is not found, return an empty string
    priceIndex = content.indexOf('＄');
    var price = content.substring(priceIndex + 1, priceIndex + 4);
    // If the last character is not a number, remove it
    if (!isNumber(price.substring(price.length - 1))) {
      price = price.substring(0, price.length - 1);
    }
  }

  // Return the price
  return price;
}

function isNumber(char) {
  // 1. Check if the character is a digit
  return /^\d$/.test(char);
}

apiCall();

//recursive call every day at 09:00
schedule.scheduleJob('0 0 9 * * *', function () {
  apiCall();
});
