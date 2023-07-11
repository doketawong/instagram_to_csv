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
const access_token = 'EAADg4X8ZAH5QBAG4pffU1N52mwzyglsvJgStGEbcJ2AUuevZC0enJjmhiQCkbOU71NR1KRzUikHLdB3OcgkEb4RJlT01bWd7DenEZAml4GAztRwaU43HwbU3mnx7Uddo5jkwnFsCZB9lMYoW06tZAZAo6byOLlXlrn50YlN9E1uFNtregNv0KtzTkpZB7Vo3VJSCuhrjLMQtZAgJbFXy2LAG';
var dataArr = [];


axios.get(url + access_token)
.then(function(content){
    processContent(content)
});



function processContent(content){
    for(temp of content.data.data){
        const id = temp.id;
        const contents = temp.message;
        const creatTime = temp.created_time;
        dataArr.push({id: id, content: contents, createDate: creatTime});
    }
    console.log(content.data.paging.next);
    if(content.data.paging.next){
        axios.get(content.data.paging.next)
        .then (function (tempResponse) {
            processContent(tempResponse);
        })
    } else {
        csvWriter.writeRecords(dataArr);
    }
}


function isNumber(char) {
    return /^\d$/.test(char); 
}

function getTitle(content) {
  const titleOpen = content.indexOf('【');
  const titleClose = content.indexOf('】');
  const sortedString = content.substring(titleOpen, titleClose);
  return sortedString;
}

function getSize(content) {
  const sizeOpen = content.indexOf('/');
  const sizeDesc = content.substring(sizeOpen+2, content.length);
  const sizeClose = sizeDesc.indexOf('/');
  const sortedString = content.substring(sizeOpen+2, sizeClose-1);
  return sortedString;
}

function getPrice(content) {
  const priceIndex = content.indexOf('$'); 
  
  if(priceIndex > 0){
    var price = content.substring(priceIndex + 1, priceIndex+4);
    if(!isNumber(price.substring(price.length-1))){ 
        price = price.substring(0, price.length-1);
    }
    tempPrice = price;
  }

  return sortedString;
}

