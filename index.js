const axios = require('axios'); 
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const { Client } = require('pg')
const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'some2some',
  password: 'postgres',
  port: 5432,
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
const access_token = 'EAADg4X8ZAH5QBOZC2leHizyXRHbqdotwYxpZAn7LuZAkLmcNKWlCdZAEF5hcER6RH9Vlhv9Ew3AJoZBZC2cAzZAKuvRWkMP3vAyCkxXZBXz4UcRPaEmHs6j24SzZAAyZCG7AMRPuXsAUnqY1wcifZAxWZApDgrCNS1TgWDRBqZBsvsigt5elz7e76ZA0x5dMYl5ZAYu5fxpXOjyVkZA0SBWZAHIDbMuryXDUrd';
var dataArr = [];
var lastProcessDate;

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

      client.query(findTitle, [title], (err, res)=> {
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

    // Output the end
    console.log('END');
  }
}

function getTitle(content) {
  const titleOpen = content.indexOf('【');
  const titleClose = content.indexOf('】');
  if(titleOpen < 0 || titleClose < 0){
    return '';
  }
  const title = content.substring(titleOpen+1, titleClose);
  return title;
}

function getSize(content) {
  const sizeOpen = content.indexOf('/');
  const sizeDesc = content.substring(sizeOpen+1, content.length);
  const sizeClose = sizeDesc.indexOf('/');
  if(sizeOpen < 0 || sizeClose < 0){
    return '';
  }
  const size = sizeDesc.substring(0, sizeClose);
  return size;
}

function getPrice(content) {
  const priceIndex = content.indexOf('$');
  
  if(priceIndex > 0){
    var price = content.substring(priceIndex + 1, priceIndex+4);
    if(!isNumber(price.substring(price.length-1))){ 
        price = price.substring(0, price.length-1);
    }
  } else {
    return '';
  }

  return price;
}

function isNumber(char) {
  return /^\d$/.test(char); 
}

apiCall();
