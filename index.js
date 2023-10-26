import { Client, GatewayIntentBits } from 'discord.js';
import request from 'request';

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const TOKEN = process.env.TOKEN;

const userMap = new Map();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async message => {
  if (message.content == '!subscribe') {
    await message.author.send('Please provide your email and password separated by a space:');
    const filter = m => m.content.includes('@');
    const response = (await message.author.dmChannel.awaitMessages({ filter, max: 1, time: 60_000, errors: ['time'] })).first().content.split(' ');
    
    const email = response[0];
    const password = response[1];

    const token = await getCardboardToken({email, password});
    upsertUserMap(message.author.username, message.author, token, await getMyCardboardSchecule(token));
  } else if (message.content == '!unsubscribe') {
    userMap.delete(message.author.username);
  }
});

function upsertUserMap(username, user, token, data) {
  if (!userMap.get(username)) {
    userMap.set(username, {token, user, data});
    return false;
  } else {
    const indexes = userMap.get(username)['data']['index'];
    const newIndexes = data['index'];
    if (indexes.every((val, index) => val === newIndexes[index])) {
      userMap.set(username, {token, user, data});
      false;
    } else {
      userMap.set(username, {token, user, data});
      return true;
    }
  }
}

async function getCardboardToken({email, password}) {
  const options = {
    'method': 'POST',
    'url': 'https://api.cardboardevents.com/app/login.json',
    'headers': {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: {
        email,
        password,
      }
    })
  };

  return new Promise(function(resolve, reject) {
      request(options, function (error, response) {
        if (error) reject(error);
        resolve(JSON.parse(response.body)['data']['token']);
      });
    }
  );
}

async function getMyCardboardSchecule(token) {
  const options = {
    'method': 'GET',
    'url': 'https://api.cardboardevents.com/app/convention/schedule/events.json?seated=true',
    'headers': {
      'authorization': token,
      'bigbox-authority': false,
      'bigbox-convention': 'nu0bne2c',
      'bigbox-organisation': 'o7e4uynq',
    },
  };

  return new Promise(function(resolve, reject) {
      request(options, function (error, response) {
        if (error) reject(error);
        resolve(JSON.parse(response.body)['data']);
      });
    }
  );
}

function notifyAll() {
  const now = Date.now() + 24 * 3600;

  setTimeout(() => {}, 1800000 - (now % 1800000));
  
  userMap.forEach(function(value, key, map)  {
    const upcoming = value['data']['collection'].filter(e => e['date'] - 1800000 < now &&  e['date'] > now); 

    upcoming.forEach(e => value['user'].send(e['name'] + ' starts at ' + Date(e['time']) 
      + ': https://my.cardboardevents.com/magicians-gamblers-and-drunks-la/2023/schedule/events/' + e['id']));
  });
}

setInterval(notifyAll, 1800000);

client.login(TOKEN);



