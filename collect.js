import { profile } from "console";
import { IgApiClient } from "instagram-private-api";
import { Worker } from "worker_threads";
const dotenv = require("dotenv");
const { Sequelize, DataTypes } = require("sequelize");

dotenv.config();

const ig = new IgApiClient();
ig.state.generateDevice(process.env.IG_USERNAME);

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

const runService = (workerData) => {
    return new Promise((resolve, reject) => {
        const worker = new Worker("./worker.js", { workerData });
        worker.on("message", resolve);
        worker.on("error", reject);
        worker.on("exit", (code) => {
            if (code !== 0)
                reject(
                    new Error(
                        `Stopped the Worker Thread with the exit code: ${code}`
                    )
                );
        });
    });
};

const doScrapingChild = async (root_user) => {
    console.log("Root User: " + JSON.stringify(root_user, null, 2));
    const res = await ig.discover.chaining(root_user.pk);
    let profiles = res.users;

    console.log("Profiles: " +  JSON.stringify(profiles, null, 2));

    profiles.forEach(async (profile) => {
        let obj = await Profile.findOne({ where: {id: profile.pk} });
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

const run = async (profile) => {
    const result = await runService(profile);
    console.log(result);
};

(async () => {
    await Profile.sync();
    await ig.simulate.preLoginFlow();
    const loggedInUser = await ig.account.login(
        process.env.IG_USERNAME,
        process.env.IG_PASSWORD
    );
    process.nextTick(async () => await ig.simulate.postLoginFlow());
    const root_user = await ig.user.searchExact("charli_xcx");
    const res = await ig.discover.chaining(root_user.pk);

    let profiles = res.users;

    profiles.forEach(async (profile) => {
        let obj = await Profile.findOne({ where: {id: profile.pk} });
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
                parent_id: root_user.pk
            });
        }
        
        setTimeout(doScrapingChild, 60000, profile);

        // run(profile).catch(err => console.error(err));
    });
})();
