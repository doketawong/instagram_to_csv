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
    {id: 'createDate', title: 'CreateDate'}
  ]
})

const url = 'https://graph.facebook.com/v17.0/355915284524115/feed?access_token=';
const access_token = 'EAADg4X8ZAH5QBAMdeLJsOOTtSyOBg4mpaxZCJAK2JhVHdx3keIPo0R8am5XGwKnq9jYaXEWWDestJDpnckxw8tl2CsP8D9MJToJQISrMKO0vovUSj5opV2Itf95IYbA0swP4UgZCFVrA17RZClEzkyuNg1hZC1JVTXq3IYn6o3qkZBCLZBEqsKK87fMLZAGKZCogORsJxWMDk8CPGyfcqu5W1';
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

axios.get(url + access_token)
.then(function(content){
    processContent(content)
});



function processContent(content){
    for(temp of content.data.data){
        const id = temp.id;
        const contents = temp.message;
        const createTime = temp.created_time;
        const currentDate = new Date(lastProcessDate);
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
        console.log('END');
    }
}

