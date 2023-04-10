import { Address, TonClient } from "ton"
import { BN } from 'bn.js'
import { unixNow } from "./src/lib/utils";
import { MineMessageParams, Queries } from "./src/giver/NftGiver.data";
import { toNano } from "ton"
const qrcode = require('qrcode-terminal');


async function main() {

    const wallet = Address.parse('kQAwUylu5i-CdoTiTfSoRt0qKCGz3gaddgYstwOgXTh8JCXr');
    const collection = Address.parse('EQDk8N7xM5D669LC2YACrseBJtDyFqwtSPCNhRWXU7kjEptX');
    const client = new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
    });


    const miningData = await client.callGetMethod(collection, 'get_mining_data')

    const parseStackNum = (sn: any) => new BN(sn[1].substring(2), 'hex');
    const complexity = parseStackNum(miningData.stack[0]);
    const last_success = parseStackNum(miningData.stack[1]);
    const seed = parseStackNum(miningData.stack[2]);
    const target_delta = parseStackNum(miningData.stack[3]);
    const min_cpl = parseStackNum(miningData.stack[4]);
    const max_cpl = parseStackNum(miningData.stack[5]);

    console.log('complexity', complexity);
    console.log('last_success', last_success.toString());
    console.log('seed', seed);
    console.log('target_delta', target_delta.toString());
    console.log('min_cpl', min_cpl.toString());
    console.log('max_cpl', max_cpl.toString());

    const mineParams: MineMessageParams = {
        expire: unixNow() + 300, // 5 min is enough to make a transaction
        mintTo: wallet, // your wallet
        data1: new BN(0), // temp variable to increment in the miner
        seed // unique seed from get_mining_data
    };

    let msg = Queries.mine(mineParams); // transaction builder

    let progress = 0;

    while (new BN(msg.hash(), 'be').gt(complexity)) {
        progress += 1
        console.clear()
        console.log(`Mining started: please, wait for 30-60 seconds to mine your NFT!`)
        console.log(' ')
        console.log(`⛏ Mined ${progress} hashes! Last: `, new BN(msg.hash(), 'be').toString())

        mineParams.expire = unixNow() + 300
        mineParams.data1.iaddn(1)
        msg = Queries.mine(mineParams)
    }

    console.log(' ')
    console.log('💎 Mission completed: msg_hash less than pow_complexity found!');
    console.log(' ')
    console.log('msg_hash: ', new BN(msg.hash(), 'be').toString())
    console.log('pow_complexity: ', complexity.toString())
    console.log('msg_hash < pow_complexity: ', new BN(msg.hash(), 'be').lt(complexity));

    console.log(' ');
    console.log("💣 WARNING! As soon as you find the hash, you should quickly make a transaction.");
    console.log("If someone else makes a transaction, the seed changes, and you have to find a hash again!");
    console.log(' ');

    // flags work only in user-friendly address form
    const collectionAddr = collection.toFriendly({
        urlSafe: true,
        bounceable: true,
    })
    // we must convert TON to nanoTON
    const amountToSend = toNano('0.05').toString()
    // BOC means Bag Of Cells here
    const preparedBodyCell = msg.toBoc().toString('base64url')

    // final method to build a payment url
    const tonDeepLink = (address: string, amount: string, body: string) => {
        return `ton://transfer/${address}?amount=${amount}&bin=${body}`;
    };

    const link = tonDeepLink(collectionAddr, amountToSend, preparedBodyCell);

    console.log('🚀 Link to receive an NFT:');
    //console.log(link);

    qrcode.generate(link, { small: true }, function (qrcode: any) {
        console.log('🚀 Link to mine your NFT (use Tonkeeper in testnet mode):')
        console.log(qrcode);
        console.log('* If QR is still too big, please run script from the terminal. (or make the font smaller)')
    });
}

main();

//TODO
// 1. How does the Queries.mine is composing the message?
// 2. What in the word is BOC?