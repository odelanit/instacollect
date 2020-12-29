import {IgApiClient} from 'instagram-private-api';
const dotenv = require('dotenv');
const fs = require("fs");

export const homeGet = (req: any, res: any, next: any) => {
    let html = fs.readFileSync(__dirname + "/../views/index.html", 'utf8');
    res.send(html);
}

export const homePost = async (req: any, res: any, next: any) => {

    dotenv.config();

    const ig = new IgApiClient();
    ig.state.generateDevice(process.env.IG_USERNAME || '');

    await ig.simulate.preLoginFlow();
    const loggedInUser = await ig.account.login(process.env.IG_USERNAME || '', process.env.IG_PASSWORD || '');
    process.nextTick(async () => await ig.simulate.postLoginFlow());
    const user = await ig.user.searchExact(req.body.username);
    const response = await ig.discover.chaining(Number(user.pk).toString());
    
    return res.json(response.users)
    // return res.json({
    //     username: req.body.username
    // })
}