const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
require("../DB/DBConnection");
const User = require("../model/user");
const FriendRequest = require("../model/friendRequests");

// login function
// METHOD : POST
// ENDPOINT : http://localhost:5000/api/login
//NO AUTHENTICATION REQUIRED

exports.loginUser = async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, err: errors.array() });
    }
    const { usernameEmail, password } = req.body;

    try {
        let user = await User.findOne({ email: usernameEmail });
        if (!user) {
            user = await User.findOne({
                username: usernameEmail,
            });
        }
        if (!user) {
            return res.status(400).json({ success, err: "Account not found" });
        } else {
            const matchPass = await bcrypt.compare(password, user.password);
            if (!matchPass) {
                return res
                    .status(400)
                    .json({ success, err: "Invalid credentials" });
            }
            success = true;
            const payload = {
                user: {
                    id: user.id,
                },
            };
            const authToken = jwt.sign(payload, process.env.AUTH_TOKEN);
            return res.status(200).json({
                success,
                isProfileCompleted: user.profileCompleted,
                authToken,
                msg: "Login successfull",
            });
        }
    } catch (err) {
        console.log(err);
        return res.status(500).json({ err: "server error" });
    }
};

// FOR USER TO SIGNUP ACCOUNT
// METHOD : POST
// ENDPOINT : http://localhost:5000/api/signup
// NO AUTHENTICATION REQUIRED

exports.signupUser = async (req, res) => {
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, err: errors.array() });
    } else {
        const { username, email, password, cpassword } = req.body;

        try {
            if (!username.match("^[A-Za-z][A-Za-z0-9_]{3,29}$")) {
                return res
                    .status(400)
                    .json({ success, err: "username is invalid" });
            }
            const existingUsername = await User.findOne({
                username: username,
            });
            const existingEmail = await User.findOne({
                email: email,
            });
            if (existingUsername) {
                return res
                    .status(400)
                    .json({ success, err: "username already exists" });
            }
            if (existingEmail) {
                return res
                    .status(400)
                    .json({ success, err: "Email already exists" });
            }
            if (password != cpassword) {
                return res.status(400).json({
                    err: "password and confirm password do not match",
                });
            }
            const newUser = new User({ username, email, password });
            const user = await newUser.save();
            success = true;
            const payload = {
                user: {
                    id: user.id,
                },
            };
            const authToken = await jwt.sign(payload, process.env.AUTH_TOKEN);
            res.status(200).json({
                success,
                authToken,
                msg: "signup successfull",
            });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ err: "Server error" });
        }
    }
};
// FOR USER TO ENTER THERE PROFILE DETAILS
// METHOD : POST
// ENDPOINT : http://localhost:5000/api/setprofile
// AUTHENTICATION REQUIRED

exports.setProfile = async (req, res) => {
    console.log("hit profile");
    let success = false;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, err: errors.array() });
    }
    try {
        const { name, age, gender, longitude, latitude } = req.body;
        const url = req.protocol + "://" + req.get("host");
        let profileImage = "";
        const file = req.file;
        if (file) {
            profileImage = url + "/images/" + file.filename;
        }
        const user = await User.findById(req.user.id);
        const updateUser = await user.updateOne({
            name,
            age,
            gender,
            longitude,
            latitude,
            profileImage,
            profileCompleted: true,
        });
        success = true;
        res.status(200).json({
            success,
            msg: "Profile submitted successfully",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: "Server error" });
    }
};

//  TO GET CURRENT USER DETAILS
// METHOD : GET
// ENDPOINT : http://localhost:5000/api/currentuser
// AUTHENTICATION REQUIRED

exports.currentUser = async (req, res) => {
    let success = false;
    try {
        const userID = req.user.id;
        const user = await User.findById(userID).select("-password");
        if (user) {
            success = true;
            res.status(200).json({ success, user, msg: "user fetched" });
        } else {
            res.status(404).json({ success, msg: "user not fetched" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: "Server error" });
    }
};

// ROUTE 4 : FOR USER TO SEARCH GLOBAL USER LIST
// METHOD : POST
// ENDPOINT : http://localhost:5000/api/searchuser
// AUTHENTICATION REQUIRED

exports.searchUser = async (req, res) => {
    let success = false;
    try {
        const search = req.body.search;
        const user = await User.find({
            name: { $regex: search, $options: "i" },
        })
            .where("_id")
            .ne(req.user.id)
            .select(["-password"]);
        if (user) {
            success = true;
            res.status(200).json({ user, success, msg: "user found" });
        } else {
            res.status(404).json({ success, msg: "user not found" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: "Server error" });
    }
};

// ROUTE 5 : FOR USER TO SEND FRIEND REQUESTS
// METHOD : POST
// ENDPOINT : http://localhost:5000/api/friendrequest
// AUTHENTICATION REQUIRED

exports.friendRequest = async (req, res) => {
    let success = false;
    try {
        const toUser = req.body.toUser;
        const fromUser = req.user.id;
        const existfriendRqust = await FriendRequest.find({
            $or: [
                { to: toUser, from: fromUser },
                { to: fromUser, from: toUser },
            ],
        });
        // console.log(existfriendRqust);
        const alreadyFriend = await User.findById(fromUser).select(["friend"]);
        let alreadyFriendStatus = false;
        for (let i = 0; i < alreadyFriend.length; i++) {
            if (alreadyFriend[i] === toUser) {
                alreadyFriendStatus = true;
            } else {
                alreadyFriendStatus = false;
            }
        }
        if (!alreadyFriendStatus) {
            if (toUser != fromUser) {
                if (existfriendRqust.length > 0) {
                    success = true;
                    res.status(200).json({
                        msg: "Already sent friend request",
                    });
                } else {
                    const newFriendRequest = new FriendRequest({
                        from: fromUser,
                        to: toUser,
                    });
                    const friendRequest = await newFriendRequest.save();
                    success = true;
                    res.status(200).json({
                        success,
                        msg: "Successfuly sent friend request",
                    });
                }
            } else {
                success = true;
                res.status(200).json({
                    msg: "Can't send friend request to yourself",
                });
            }
        } else {
            success = true;
            res.status(200).json({
                msg: "Already friends",
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: "Server error" });
    }
};

// ROUTE 6 : FOR USER TO SEE ALL FRIEND REQUESTS
// METHOD : GET
// ENDPOINT : http://localhost:5000/api/friendrequest
// AUTHENTICATION REQUIRED

exports.getAllFriendRequests = async (req, res) => {
    let success = false;
    try {
        const user = req.user.id;
        const foundRequests = await FriendRequest.find({ to: user });

        if (foundRequests.length > 0) {
            const friendRequests = [];
            for (let i = 0; i < foundRequests.length; i++) {
                try {
                    const friendRequestUser = await User.findById(
                        foundRequests[i]?.from
                    );
                    success = true;
                    friendRequests.push(friendRequestUser);
                } catch (error) {
                    console.log(error);
                }
            }
            res.status(200).json({
                success,
                friendRequests,
                msg: "Friend Request Found",
            });
        } else {
            return res
                .status(200)
                .json({ success, msg: "No Friend Request Found" });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: "Server error" });
    }
};

// ROUTE 7 : FOR USER TO ACCEPT FRIEND REQUESTS
// METHOD : POST
// ENDPOINT : http://localhost:5000/api/acceptrequest
// AUTHENTICATION REQUIRED

exports.acceptRequest = async (req, res) => {
    let success = false;
    try {
        const userID = req.user.id;
        const wannaBeFriend = req.body.friend;
        const user = await User.findOne({ _id: userID });
        const friend = await User.findById(wannaBeFriend);
        const putMeOnFriend = await friend.updateOne({
            $push: { friend: userID },
        });
        const userWithFriend = await user.updateOne({
            $push: { friend: wannaBeFriend },
        });

        const friendRequests = await FriendRequest.deleteOne({
            from: wannaBeFriend,
            to: userID,
        });
        if (userWithFriend && friendRequests) {
            success = true;
        }
        res.status(200).json({
            success,
            msg: "Friend request accepted succefully",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: "Server error" });
    }
};

// ROUTE 8 : FOR USER TO CANCEL FRIEND REQUESTS
// METHOD : POST
// ENDPOINT : http://localhost:5000/api/cancelrequest
// AUTHENTICATION REQUIRED

exports.cancelRequest = async (req, res) => {
    let success = false;
    try {
        const userID = req.user.id;
        const rejectionOnFace = req.body.rejected;
        const deleteRequest = await FriendRequest.deleteOne({
            to: userID,
            from: rejectionOnFace,
        });
        if (deleteRequest) {
            success = true;
            res.status(200).json({
                success,
                msg: "Successfully canceled the friend request",
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: "Server error" });
    }
};

// ROUTE 9 : FOR USER TO SEE ALL GLOBAL NON FRIEND USER WHO HAS NOT EVEN RECIEVED OR SEND REQUESTS
// METHOD : GET
// ENDPOINT : http://localhost:5000/api/filtereduser
// AUTHENTICATION REQUIRED

exports.filtereduser = async (req, res) => {
    try {
        let success = false;
        const user = req.user.id;
        // console.log(user);
        const filteredFriendRequests = await FriendRequest.find({
            $or: [{ to: user }, { from: user }],
        });
        // console.log(filteredFriendRequests);

        const allUser = await User.find()
            .where("_id")
            .ne(user)
            .select(["-password"]);
        const myFriends = await User.findById(user).select(["friend"]);
        const filteredUser = allUser.filter(
            (el) => myFriends.friend.indexOf(el._id) === -1
        );

        filteredUser.map((element, index) => {
            if (filteredFriendRequests.length > 0) {
                filteredFriendRequests.map((friendReq) => {
                    if (friendReq.to != user) {
                        const foundIndex = friendReq.to.indexOf(element._id);
                        if (foundIndex > -1) filteredUser.splice(index, 1);
                    } else {
                        const foundIndex = friendReq.from.indexOf(element._id);
                        if (foundIndex > -1) filteredUser.splice(index, 1);
                    }
                    return filteredUser;
                });
            }
        });
        // console.log(filteredUser);

        success = true;
        res.status(200).json({
            success,
            msg: "user filtered successfully",
            filteredUser,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: "Server error" });
    }
};

// ROUTE 10 : FOR USER TO SEE ALL FRIENDS
// METHOD : GET
// ENDPOINT : http://localhost:5000/api/friends
// AUTHENTICATION REQUIRED

exports.allFriends = async (req, res) => {
    let success = false;
    try {
        const userID = req.user.id;
        const friends = await User.findById(userID).select(["friend"]);
        const friend = friends.friend;
        if (friend.length > 0) {
            const friendList = [];
            try {
                for (let i = 0; i < friend.length; i++) {
                    const individualFriend = await User.findById(
                        friend[i]
                    ).select(["name", "_id", "profileImage"]);
                    friendList.push(individualFriend);
                }
                success = true;
                // console.log(friend, friendList);
                res.status(200).json({ success, friendList });
            } catch (error) {
                console.log(error);
                return res.status(500).json({ err: "unable to fetch data" });
            }
        } else {
            success = true;
            res.status(200).json({
                success,
                msg: "No friends yet",
                friendList: [],
            });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: "Server error" });
    }
};

// ROUTE 12 : **  Helper function to give info of the userid  **
// METHOD : POST
// ENDPOINT : http://localhost:5000/api/id
// AUTHENTICATION REQUIRED

exports.id = async (req, res) => {
    try {
        let success = false;
        const id = req.body.id;
        const user = await User.findById(id).select(["name", "profileImage"]);
        if (user) {
            success = true;
            return res.status(200).json({ success, user });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ err: "Server error" });
    }
};
