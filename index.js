const axios = require('axios'); 
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvWriter = createCsvWriter({
  path: 'instagram.csv',
  header: [
    {id: 'id', title: 'No'},
    {id: 'content', title: 'Content'},
    {id: 'createDate', title: 'Create Date'}
  ]
})

const url = 'https://graph.facebook.com/v17.0/355915284524115/feed?access_token=';
const access_token = 'EAADg4X8ZAH5QBABjV9yR12e08mUBZAe54CoUUsGBELuHDWotNsYGEnbL2s1XHOFzvxqWwYuhSonubbgwMyAvBszTUxsNBMY7oiye2LI1T0Ss96i6qpDVgNLUPXGfJRRHUNSCxhvPfT5P9fIZBMFWxJXWSLEMWssBHjK7YE0eY4n20Td6G8SJs6ZA7NbBk0wHuMx85tHEZAjQ1yskrcyBU';
var dataArr = [];


axios.get(url + access_token)
.then(function(content){
    processContent(content)
});



function processContent(content){
    for(temp of content.data.data){
        const id = temp.id;
        const contents = temp.message;
        const createTime = temp.created_time;
        const currentDate = new Date('2023-01-01');
        const contentDate = new Date(createTime);
        if(contentDate > currentDate){
            dataArr.push({id: id, content: contents, createDate: createTime});
        }
    }
    if(content.data.paging.next){
        axios.get(content.data.paging.next)
        .then (function (tempResponse) {
            processContent(tempResponse);
        })
    } else {
        csvWriter.writeRecords(dataArr);
    }
}

