import {Web3Storage, Blob, File} from 'web3.storage';

const vc = {
    id: 'whatever',
    data: {
        age:5,
        hobby: 'dance'
    },
    education: 'nursery',
    verified:{
        status: true,
        comments: 'yes, sure'
    }
};

async function main() {
    console.log('Hola')
    const storage = new Web3Storage({token: process.env.WEB3_STORAGE_TOKEN});
    const blob = new Blob([JSON.stringify(vc)], {type : 'application/json'})
    const files = [
        new File([blob], 'hello.json'),
        new File([blob], 'hello1.json'),
        new File([blob], 'hello2.json'),
        new File([blob], 'hello3.json')
      ]
      const cid = await storage.put(files);
      console.log(cid);
};


main();