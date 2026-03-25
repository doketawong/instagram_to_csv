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
  try {
    const response = await axios.get(url + access_token);
    await processContent(response);
    if (dataArr.length > 0) {
      writeCsv();``
    } else {
      console.log('No new products found to generate in Excel file.');
    }
  } catch (error) {
    console.error('Failed to fetch data: ', error.message);

    // Send error alert email
    const errorMailOptions = {
      from: 'spijjw003@gmail.com',
      to: '1155086874@link.cuhk.edu.hk',
      subject: 'ERROR ALERT: Instagram Data Fetch Failed',
      text: `Failed to fetch Instagram data at ${new Date().toLocaleString(
        'en-US',
        {timeZone: 'Asia/Hong_Kong'},
      )}\n\nError details:\n${
        error.message
      }\n\nPlease check the application and API access token.`,
    };

    transporter.sendMail(errorMailOptions, function (err, info) {
      if (err) {
        console.error('Failed to send error alert email:', err);
      } else {
        console.log('Error alert email sent:', info.response);
      }
    });
  }
}

async function processContent(content) {
  // For each item in the content data
  console.log('processing content...' + new Date());
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

      const seoDescription = message.substring(0, 200);

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
          [id, message, title, 230, createTime],
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
  const Excel = require('exceljs');
  const workbook = new Excel.Workbook();
  const worksheet = workbook.addWorksheet('Bulk Import Products');

  // Define headers (English and Chinese)
  const headers = [
    [
      'Product Handle*',
      'Product Name(English)*',
      'Product Name(Chinese)*',
      'Product Summary(English)',
      'Product Summary(Chinese)',
      'Product Description(English)',
      'Product Description(Chinese)',
      'SEO Title(English)',
      'SEO Title(Chinese)',
      'SEO Description(English)',
      'SEO Description(Chinese)',
      'SEO Keywords',
      'Preorder Item',
      'Preorder Note(English)',
      'Preorder Note(Chinese)',
      'Online Store Status',
      'Images*',
      'Additional Images',
      'Online Store Categories(English)',
      'Online Store Categories(Chinese)',
      'Price',
      'Sales Price',
      'Cost',
      'SKU',
      'Quantity',
      'Weight(KG)',
      'Product Tag',
      'Exclude Payment Options',
      'Exclude Delivery Options',
      'Specification Name A(English)',
      'Specification Name A(Chinese)',
      'Specification Name B(English)',
      'Specification Name B(Chinese)',
      'Variation Image',
      'Variation name A(English)',
      'Variation name A(Chinese)',
      'Variation name B(English)',
      'Variation name B(Chinese)',
      'Variation quantity',
      'Variation price',
      'Variant Sale Price',
      'Variant Cost',
      'Variation SKU',
      'Variant Weight(KG)',
      'Barcode',
    ],
    [
      '商品編號*',
      '商品名稱(英文)*',
      '商品名稱(繁體中文)*',
      '商品摘要(英文)',
      '商品摘要(繁體中文)',
      '商品描述(英文)',
      '商品描述(繁體中文)',
      'SEO標題(英文)',
      'SEO標題(繁體中文)',
      'SEO簡介(英文)',
      'SEO簡介(繁體中文)',
      'SEO關鍵字',
      '預購商品',
      '預購提示(英文)',
      '預購提示(繁體中文)',
      '網店上架狀態',
      '相片 (每件產品最多12張主要圖片， Max. 12 images for each product)*',
      '更多相片 (每件產品最多20張主要圖片， Max.20 images for each product)',
      '網店分類(英文)',
      '網店分類(繁體中文)',
      '原價格',
      '特價',
      '成本價',
      '商品貨號',
      '數量',
      '重量(KG)',
      '商品管理標籤',
      '排除的付款方式',
      '排除的送貨方式',
      '規格名稱1(英文)',
      '規格名稱1(繁體中文)',
      '規格名稱2(英文)',
      '規格名稱2(繁體中文)',
      '款式圖片 (每個款式最多 1 張款式圖片， Max.1 image for each variant)',
      '選項名稱A(英文)',
      '選項名稱A(繁體中文)',
      '選項名稱B(英文)',
      '選項名稱B(繁體中文)',
      '選項數量',
      '選項價格',
      '款式特價',
      '款式成本',
      '選項商品貨號',
      '款式重量(KG)',
      '商品條碼編號',
    ],
  ];

  // Add headers to worksheet
  worksheet.addRow(headers[0]);
  worksheet.addRow(headers[1]);

  // Style the headers
  worksheet.getRow(1).font = {bold: true};
  worksheet.getRow(2).font = {bold: true};

  // Add data rows
  dataArr.forEach(item => {
    worksheet.addRow([
      item.id,
      item.engTitle,
      item.chiTitle,
      item.engSummary || '',
      item.chiSummary || '',
      item.engDescription,
      item.chiDescription,
      item.engTitle, // SEO Title same as product title
      item.chiTitle, // SEO Title same as product title
      item.engSeoDescription,
      item.chiSeoDescription,
      '', // SEO Keywords
      '', // Preorder Item
      '', // Preorder Note(English)
      '', // Preorder Note(Chinese)
      item.onlineStoreStatus,
      item.picture,
      item.additionalPicture || '',
      '', // Online Store Categories(English)
      '', // Online Store Categories(Chinese)
      item.price,
      '', // Sales Price
      '', // Cost
      '', // SKU
      '', // Quantity
      '', // Weight
      '', // Product Tag
      '', // Exclude Payment Options
      '', // Exclude Delivery Options
      item.specificationNameAEng,
      item.specificationNameAChi,
      '', // Specification Name B(English)
      '', // Specification Name B(Chinese)
      '', // Variation Image
      item.variationNameAEng,
      item.variationNameAChi,
      '', // Variation name B(English)
      '', // Variation name B(Chinese)
      '', // Variation quantity
      '', // Variation price
      '', // Variant Sale Price
      '', // Variant Cost
      '', // Variation SKU
      '', // Variant Weight
      '', // Barcode
    ]);
  });

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    column.width = 20;
  });

  // Save the workbook
  const filename = 'instagram.xlsx';
  workbook.xlsx.writeFile(filename).then(() => {
    console.log(dataArr.length + ' records written to file.');

    //update database
    let displayTime;
    if (latestTime) {
      client.query(
        `UPDATE "config" SET "date" = $1 WHERE "config_name" = 'PROCESS_DATE'`,
        [latestTime],
      );

      displayTime = latestTime.toLocaleString('en-US', {
        timeZone: 'Asia/Hong_Kong',
      });
    }

    const mailOptions = {
      from: 'spijjw003@gmail.com',
      to: '1155086874@link.cuhk.edu.hk',
      subject: 'Update Shopline Product List ' + displayTime,
      text: 'Upload product',
      attachments: [
        {
          filename: 'instagram.xlsx',
          path: './instagram.xlsx',
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
  });
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

// Function to exchange short-lived token for long-lived token
async function exchangeForLongLivedToken(shortLivedToken) {
  try {
    const response = await axios.get(
      'https://graph.instagram.com/access_token',
      {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: process.env.INSTAGRAM_APP_SECRET,
          access_token: shortLivedToken,
        },
      },
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to exchange for long-lived token:', error.message);
    // Send error alert email
    const errorMailOptions = {
      from: 'spijjw003@gmail.com',
      to: '1155086874@link.cuhk.edu.hk',
      subject: 'ERROR ALERT: Instagram Token Exchange Failed',
      text: `Failed to exchange for long-lived token at ${new Date().toLocaleString(
        'en-US',
        {timeZone: 'Asia/Hong_Kong'},
      )}\n\nError details:\n${
        error.message
      }\n\nPlease check the application and API credentials.`,
    };

    transporter.sendMail(errorMailOptions, function (err, info) {
      if (err) {
        console.error('Failed to send error alert email:', err);
      } else {
        console.log('Error alert email sent:', info.response);
      }
    }); 
    throw error;
  }
}

// Function to refresh long-lived token
async function refreshLongLivedToken(token) {
  try {
    const response = await axios.get(
      'https://graph.instagram.com/refresh_access_token',
      {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: token,
        },
      },
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to refresh token:', error.message);
    // Send error alert email
    const errorMailOptions = {
      from: 'spijjw003@gmail.com',
      to: '1155086874@link.cuhk.edu.hk',
      subject: 'ERROR ALERT: Instagram Token Refresh Failed',
      text: `Failed to refresh Instagram token at ${new Date().toLocaleString(
        'en-US',
        {timeZone: 'Asia/Hong_Kong'},
      )}\n\nError details:\n${
        error.message
      }\n\nPlease check the application and API credentials.`,
    };

    transporter.sendMail(errorMailOptions, function (err, info) {
      if (err) {
        console.error('Failed to send error alert email:', err);
      } else {
        console.log('Error alert email sent:', info.response);
      }
    });
    throw error;
  }
}

// Schedule token refresh every 50 days (before 60-day expiration)
schedule.scheduleJob('0 0 */50 * *', async function () {
  try {
    const newToken = await refreshLongLivedToken(process.env.ACCESS_TOKEN);
    // Here you would need to update your stored token
    console.log('Successfully refreshed Instagram token');
  } catch (error) {
    console.error('Token refresh job failed:', error);
  }
});

apiCall();

//recursive call every day at 17:30
schedule.scheduleJob('30 17 * * *', function () {
  apiCall();
});
