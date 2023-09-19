const axios = require('axios'); 
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { Client } = require('pg');
require('dotenv').config();

//get data from .env file
const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_DATABASE } = process.env;



const client = new Client({
  user: DB_USER,
  host: DB_HOST,
  database: DB_DATABASE,
  password: DB_PASSWORD,
  port: DB_PORT,
})
client.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

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
    {id: 'a', title: 'A'},
    {id: 'b', title: 'A'},
    {id: 'c', title: 'A'},
    {id: 'd', title: 'A'},
    {id: 'e', title: 'A'},
    {id: 'f', title: 'A'},
    {id: 'g', title: 'A'},
    {id: 'h', title: 'A'},
    {id: 'i', title: 'A'},
    {id: 'createDate', title: 'CreateDate'},
  ]
})

const url = 'https://graph.facebook.com/v17.0/355915284524115/feed?access_token=';
const pictureUrl = 'https://graph.facebook.com/v17.0/';
const pictureAccess = '/attachments?access_token=';
const access_token = 'EAADg4X8ZAH5QBO9oZBrrP9Y5K8U94SDYC6k4SPIueLDKe84owwKYIqe8Q1w9ZBMlna79zqEb2NV2KSHeUCInpgrHL8vurwFt4vUpA67ZCw4Ss1Pg8UDlns5DB4UZA6MEsCrrVRK1MgkY3wCphJYvidMhWzfEZCZCdcUxI97ZBq8ZCWaFqlDe7c3l0pxKNlmzqdgWC6XbJVruxiTqIfvgcvVZAjwwZC8';
var dataArr = [];
var lastProcessDate;
let latestTime;

const query = `SELECT * FROM config where config_name = 'PROCESS_DATE'`;
const findTitle = `SELECT * FROM product_list where content = $1`;

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
    const response = await axios.get(url + access_token)
        .then(function(content){
            processContent(content);
        })
}

async function processContent(content) {
  // For each item in the content data
  for (const item of content.data.data) {
    // Get the item ID
    const id = item.id;

    // Get the item message
    let message = item.message;

    // Get the item created time
    const createTime = item.created_time;

    // Get the last process date
    const currentDate = new Date(lastProcessDate);

    // Get the message created time
    const messageDate = new Date(createTime);

    // If the message created time is later than the last process date
    if (messageDate > currentDate) {
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

      //find latest time
      if(latestTime == null || latestTime < messageDate){
        latestTime = messageDate;
      }
    // Query the database to see if the title already exists
    client.query(findTitle, [title], (err, res)=> {
        // If the title does not exist, add it to the data array
        if(res.rows.length ==0){
          dataArr.push({
            id: id,
            engDescription: message,
            chiDescription: message,
            createDate: createTime,
            price: price,
            specificationNameAEng: size,
            specificationNameAChi: size,
            variationNameAEng: size,
            variationNameAChi: size,
            engTitle: title,
            chiTitle: title,
            picture: picture,
            onlineStoreStatus: 'Y',
          });
          // If the title is not empty, insert it into the database
          if(title!=''){
            console.log('Inserting: ' + title);
            client.query(
              `INSERT INTO "product_list" ("id", "content", "title", "price","createdate")  
              VALUES ($1, $2, $3, $4, $5)`, [id, message, title,price,createTime]);
          }
        }
        
    });
  }
}

  // If the content data has the next page
  if (content.data.paging.next) {
    // Get the next page content
    axios.get(content.data.paging.next).then(function (tempResponse) {
      // Process the next page content
      processContent(tempResponse);
    });
  } else {
    // Write the data array to the CSV file
    csvWriter.writeRecords(dataArr);

    //update database
    client.query(
      `UPDATE "config" SET "date" = $1 WHERE "config_name" = 'PROCESS_DATE'`, [latestTime]);

    // Output the end
    console.log('END' + dataArr.length);
  }
}

function getTitle(content) {
  // Find the index of the first and last square brackets.
  const titleOpen = content.indexOf('【');
  const titleClose = content.indexOf('】');
  if(titleOpen < 0 || titleClose < 0){
    // Return an empty string if the title is not found.
    return '';
  }
  // Extract the title from the square brackets.
  const title = content.substring(titleOpen+1, titleClose);
  return title;
}

function getSize(content) {
  // find the start of the size description
  const sizeOpen = content.indexOf('/');
  // get the size description
  const sizeDesc = content.substring(sizeOpen+1, content.length);
  // find the end of the size description
  const sizeClose = sizeDesc.indexOf('/');
  // if we didn't find both /s, return an empty string
  if(sizeOpen < 0 || sizeClose < 0){
    return '';
  }
  // get the size value
  const size = sizeDesc.substring(0, sizeClose);
  // return the size value
  return size;
}

function getPrice(content) {
  // Get the index of the $ sign
  const priceIndex = content.indexOf('$');
  
  // If the $ sign is found
  if(priceIndex > 0){
    // Get the price from the content
    var price = content.substring(priceIndex + 1, priceIndex+4);
    // If the last character is not a number, remove it
    if(!isNumber(price.substring(price.length-1))){ 
        price = price.substring(0, price.length-1);
    }
  } else {
    // If the $ sign is not found, return an empty string
    return '';
  }

  // Return the price
  return price;
}

function isNumber(char) {
  // 1. Check if the character is a digit
  return /^\d$/.test(char); 
}

apiCall();