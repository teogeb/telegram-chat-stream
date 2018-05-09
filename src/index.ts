const StreamrClient = require('streamr-client');
const request = require('request');

const BOT_TOKEN = process.env.BOT_TOKEN;
if (BOT_TOKEN === undefined) {
    throw new Error('Must export environment variable BOT_TOKEN');
}
const POLL_INTERVAL = process.env.POLL_INTERVAL;
if (POLL_INTERVAL === undefined) {
    throw new Error('Must export environment variable POLL_INTERVAL');
}

const API_KEY = process.env.API_KEY;
if (API_KEY === undefined) {
  throw new Error('Must export environment variable API_KEY');
}

const CHAT_ID_LIST = process.env.CHAT_IDS;
let CHAT_IDS: string[];
if (CHAT_ID_LIST === undefined) {
    throw new Error('Must export environment variable CHAT_IDS');
} else {
    CHAT_IDS = CHAT_ID_LIST.split(',');
}

const getMemberCount = (chatId: string) => {
    return new Promise<number>((resolve, reject) => {
        request('https://api.telegram.org/bot' + BOT_TOKEN + '/getChatMembersCount?chat_id=' + chatId, (error: any, response: any, body: any) => {
            if (!error) {
                resolve(JSON.parse(body).result);
            } else {
                reject();
            }
        });
    });
};

const pollChats = (stream: any) => {
    let previousMemberCounts = new Map<string,number>();
    let chatInd = 0;
    setInterval(() => {
        const chatId = CHAT_IDS[chatInd];
        getMemberCount(chatId).then((memberCount: number) => {
            const previousMemberCount = previousMemberCounts.get(chatId);
            if ((previousMemberCount === undefined) || (previousMemberCount !== memberCount)) {
                console.log('New value for ' + chatId + ': ' + memberCount);
                const msg = {
                    'chat': chatId,
                    'memberCount': memberCount
                };
                stream.produce(msg);
                previousMemberCounts.set(chatId, memberCount);
            }
        });
        chatInd++;
        if (chatInd === CHAT_IDS.length) {
            chatInd = 0;
        }
    }, POLL_INTERVAL);
};

const client = new StreamrClient({
    apiKey: API_KEY
});
// TODO each chat as a separate stream?
const STREAM_NAME = 'Telegram chat member counts';
const stream = client.getOrCreateStream({
    name: STREAM_NAME
}).then((stream: any) => {
    console.info("Initialized stream: ", stream.id);
    console.log('Observing: ' + CHAT_IDS.join(', '));
    pollChats(stream);
}).catch(console.error);
