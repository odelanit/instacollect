const { worker } = require("cluster");
const { workerData, parentPort } = require("worker_threads");
const { IgApiClient } = require("instagram-private-api");
const dotenv = require("dotenv");
const { Sequelize, DataTypes } = require("sequelize");

dotenv.config();

const sequelize = new Sequelize("insta_collection", "insta_collection", null, {
    dialect: "mysql",
});

const Profile = sequelize.define(
    "Profile",
    {
        username: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        full_name: {
            type: DataTypes.STRING,
        },
        is_private: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        profile_pic_url: {
            type: DataTypes.STRING,
        },
        is_verified: {
            type: DataTypes.BOOLEAN,
        },
        parent_id: {
            type: DataTypes.BIGINT(11)
        }
    },
    {
        tableName: "profiles",
    }
);

const root_user = workerData;

console.log("Profile: " + JSON.stringify(root_user, null, 2));

const ig = new IgApiClient();
ig.state.generateDevice(process.env.IG_USERNAME);

const doScrapingChild = async () => {
    await ig.simulate.preLoginFlow();
    const loggedInUser = await ig.account.login(
        process.env.IG_USERNAME,
        process.env.IG_PASSWORD
    );
    process.nextTick(async () => await ig.simulate.postLoginFlow());
    const res = await ig.discover.chaining(root_user.pk);

    console.log(JSON.stringify(res.users, null, 2));

    let profiles = res.users;

    profiles.forEach(async (profile) => {
        let obj = await Profile.findOne({ id: profile.pk });
        if (obj) {
            obj.username = profile.username;
            obj.full_name = profile.full_name;
            obj.is_private = profile.is_private;
            obj.is_verified = profile.is_verified;
            obj.profile_pic_url = profile.profile_pic_url;
            obj.parent_id = root_user.pk;
            await obj.save();
        } else {
            await Profile.create({
                id: profile.pk,
                username: profile.username,
                full_name: profile.full_name,
                is_private: profile.is_private,
                profile_pic_url: profile.profile_pic_url,
                is_verified: profile.is_verified,
                parent_id: root_user.pk,
            });
        }
    });
}

setTimeout(doScrapingChild, 60000);

// parentPort.postMessage({filename: workerData, status: 'Done'});
