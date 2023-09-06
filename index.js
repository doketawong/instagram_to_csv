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
    {id: 'content', title: 'Content'},
    {id: 'createDate', title: 'CreateDate'},
    {id: 'price', title: 'Price'},
    {id: 'picture', title: 'Picture'},
    {id: 'size', title: 'Size'},
    {id: 'title', title: 'Title'},
  ]
})

const url = 'https://graph.facebook.com/v17.0/355915284524115/feed?access_token=';
const pictureUrl = 'https://graph.facebook.com/v17.0/';
const pictureAccess = '/attachments?access_token=';
const access_token = 'EAADg4X8ZAH5QBOzSrZAHJffTwLEW9msd37do3qvOEyEbGlXn1BLAoiLNrEMeapr4NaDusCJFZAjiBx00qaGYREU9oWq3yqayZB2eX1NNcqDBbWKZBfCIdRRX3XZCU8aJwglou6ZCZBuhPFBdqX241dPCT5sOkLhDQelXGhm7vTz7zHecrMH7AovMo9gAiNUyGBo47ZA6AOZAd8dqcLs9dvXx6hayvZB';
var dataArr = [];
var lastProcessDate;

const query = `SELECT * FROM config where config_name = 'PROCESS_DATE'`;

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
    const res = await axios.get(url + access_token)
        .then(function(content){
            processContent(content);
        })
}

async function processContent(content){
    for(temp of content.data.data){
        const id = temp.id;
        let contents = temp.message;
        const createTime = temp.created_time;
        const currentDate = new Date(lastProcessDate);
        const contentDate = new Date(createTime);
        if(contentDate > currentDate){
            const title = getTitle(contents);
            const size = getSize(contents);
            const price = getPrice(contents);
            let picture;
            await axios.get(pictureUrl + id + pictureAccess +access_token)
                .then (function (tempResponse) {
                    var pictureUrl = tempResponse.data.data[0]; 
                    picture = pictureUrl.media.image.src;
                });
            contents = contents.substring(0,300);
            console.log(picture);
            dataArr.push({id: id, content: contents, createDate: createTime, price: price, size:size, title: title, picture: picture});
        }
    }
    if(content.data.paging.next){
        axios.get(content.data.paging.next)
        .then (function (tempResponse) {
            processContent(tempResponse);
        })
    } else {
        csvWriter.writeRecords(dataArr);
        console.log('END');
    }
}

function getTitle(content) {
    const titleOpen = content.indexOf('【');
    const titleClose = content.indexOf('】');
    if(titleOpen < 0 || titleClose < 0){
      return '';
    }
    const sortedString = content.substring(titleOpen+1, titleClose);
    return sortedString;
  }
  
  function getSize(content) {
    const sizeOpen = content.indexOf('/');
    const sizeDesc = content.substring(sizeOpen+1, content.length);
    const sizeClose = sizeDesc.indexOf('/');
    if(sizeOpen < 0 || sizeClose < 0){
      return '';
    }
    const sortedString = sizeDesc.substring(0, sizeClose);
    return sortedString;
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
