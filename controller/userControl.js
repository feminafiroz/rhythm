const User = require('../models/userModel')
const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const asyncHandler = require('express-async-handler')
const { sendOtp, generateOTP } = require('../utility/nodeMailer')
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const Review = require('../models/reviewModel')
const Wallet = require('../models/walletModel')
const WalletTransaction = require("../models/walletTransactionModel");


// loadLandingPage---
const loadLandingPage = asyncHandler(async (req, res) => {
    try {
        const products = await Product.find({ isListed: true }).populate('images').limit(5)
        res.render('./users/pages/index', { products: products })
    } catch (error) {
        throw new Error(error)
    }

})
// loading register page---
const loadRegister = async (req, res) => {
    try {
        res.render('./users/pages/register')
    } catch (error) {
        throw new Error(error)
    }
}

// inserting User-- 
const insertUser = async (req, res) => {
    try {
        const emailCheck = req.body.email;
        const checkData = await User.findOne({ email: emailCheck });
        if (checkData) {
            return res.render('./users/pages/register', { userCheck: "User already exists, please try with a new email" });
        } else {
            const UserData = {
                userName: req.body.userName,
                email: req.body.email,
                password: req.body.password,
            };

            const OTP = generateOTP() /** otp generating **/
            const expirationTime = new Date();
            expirationTime.setMinutes(expirationTime.getMinutes() + 1); // Set OTP expiration time to 1 minutes from now

            req.session.otpUser = { ...UserData, otp: OTP, expirationTime };
            console.log(req.session.otpUser.otp)
            // req.session.mail = req.body.email;  

            /***** otp sending ******/
            try {
                sendOtp(req.body.email, OTP, req.body.userName);
                return res.redirect('/sendOTP');
            } catch (error) {
                console.error('Error sending OTP:', error);
                return res.status(500).send('Error sending OTP');
            }
        }
    } catch (error) {
        throw new Error(error);
    }
}
/*************** OTP Section *******************/
// loadSentOTP page Loding--
const sendOTPpage = asyncHandler(async (req, res) => {
    try {
        const email = req.session.otpUser.email
        res.render('./users/pages/verifyOTP', { email })
    } catch (error) {
        throw new Error(error)
    }

})



// verifyOTP route handler

const verifyOTP = asyncHandler(async (req, res) => {
    try {
        const enteredOTP = req.body.otp;
        const email = req.session.otpUser.email;
        const storedOTP = req.session.otpUser.otp;
        const expirationTime = req.session.otpUser.expirationTime;
        const currentTime = new Date();

        if (currentTime > expirationTime) {
            // OTP has expired
            const messages = 'OTP has expired. Please resend it.';
            console.log('verification failed');

            res.render('./users/pages/verifyOTP', { messages, email });
        } else if (enteredOTP == storedOTP) {
            // OTP is correct and not expired
            const newUser = await User.create(req.session.otpUser);

            delete req.session.otpUser.otp;
            delete req.session.otpUser.expirationTime; // Clear the expiration time

            return res.redirect('/login');
        } else {
            // OTP is incorrect
            const messages = 'Verification failed, please check the OTP or resend it.';
            console.log('verification failed');

            res.render('./users/pages/verifyOTP', { messages, email });
        }
    } catch (error) {
        throw new Error(error);
    }
});


/**********************************************/

// Resending OTP---
const reSendOTP = async (req, res) => {
    try {
        const OTP = generateOTP() /** otp generating **/
        req.session.otpUser.otp = { otp: OTP };

        const email = req.session.otpUser.email
        const userName = req.session.otpUser.userName


        /***** otp resending ******/
        try {
            sendOtp(email, OTP, userName);
            console.log('otp is sent');
            return res.render('./users/pages/reSendOTP', { email });
        } catch (error) {
            console.error('Error sending OTP:', error);
            return res.status(500).send('Error sending OTP');
        }

    } catch (error) {
        throw new Error(error)
    }
}

// verify resendOTP--
const verifyResendOTP = asyncHandler(async (req, res) => {
    try {
        const enteredOTP = req.body.otp;
        console.log(enteredOTP);
        const storedOTP = req.session.otpUser.otp;
        console.log(storedOTP);

        const user = req.session.otpUser;

        if (enteredOTP == storedOTP.otp) {
            console.log('inside verification');
            const newUser = await User.create(user);
            if (newUser) {
                console.log('new user insert in resend page', newUser);
            } else { console.log('error in insert user') }
            delete req.session.otpUser.otp;
            res.redirect('/login');
        } else {
            console.log('verification failed');
        }
    } catch (error) {
        throw new Error(error);
    }
});


// loading Login Page---
const loadLogin = async (req, res) => {
    try {
        res.render('./users/pages/login')
    } catch (error) {
        throw new Error(error)
    }
}

// UserLogout----
const userLogout = async (req, res) => {
    try {
        req.logout(function (err) {

            if (err) {
                next(err);
            }
        })
        res.redirect('/')
    } catch (error) {
        console.log(error.message);
    }
}

// userProfile---
const userProfile = async (req, res) => {
    try {
        const user = req.user;
        console.log(user);
        const wallet = await Wallet.findOne({ user: user._id });
        res.render('./users/pages/profile', { user, wallet })
    } catch (error) {
        console.log(error.message);
    }
}

// Shopping Page--
const shopping = asyncHandler(async (req, res) => {
    console.log('request from unauth user ');
    try {
        const user = req.user;
        const page = req.query.p || 1;
        const limit = 3;

        const listedCategories = await Category.find({ isListed: true });
        const categoryMapping = {};

        listedCategories.forEach(category => {
            categoryMapping[category.categoryName] = category._id;
        });
        const filter = { isListed: true };
        let cat = '651e18c16bbeb6d5b109ce73'
        if (req.query.category) {
            // Check if the category name exists in the mapping
            if (categoryMapping.hasOwnProperty(req.query.category)) {
                filter.categoryName = categoryMapping[req.query.category];
            } else {
                filter.categoryName = cat
            }
        }

        // Check if a search query is provided
        if (req.query.search) {
            filter.$or = [
                { title: { $regex: req.query.search, $options: 'i' } },
                
            ];
            // if search and category both included in the query parameters 
            if (req.query.search && req.query.category) {
                if (categoryMapping.hasOwnProperty(req.query.category)) {
                    filter.categoryName = categoryMapping[req.query.category];
                } else {
                    filter.categoryName = cat
                }
            }
        }

        let sortCriteria = {};

        // Check for price sorting
        if (req.query.sort === 'lowtoHigh') {
            sortCriteria.salePrice = 1;
        } else if (req.query.sort === 'highToLow') {
            sortCriteria.salePrice = -1;
        }
        //filter by both category and price
        if (req.query.category && req.query.sort) {
            if (categoryMapping.hasOwnProperty(req.query.category)) {
                filter.categoryName = categoryMapping[req.query.category];
            } else {
                filter.categoryName = cat
            }

            if (req.query.sort) {
                sortCriteria.salePrice = 1;
            }
            if (req.query.sort === 'highToLow') {
                sortCriteria.salePrice = -1;
            }
        }


        const findProducts = await Product.find(filter).populate('images')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort(sortCriteria);

        let userWishlist;
        let cartProductIds;
        if (user) {
            if (user.cart || user.wishlist) {
                cartProductIds = user.cart.map(cartItem => cartItem.product.toString());
                userWishlist = user.wishlist;
            }

        } else {
            cartProductIds = null;
            userWishlist = false;
        }

        const count = await Product.find(filter)
            // { categoryName: { $in: listedCategoryIds }, isListed: true })
            .countDocuments();
        let selectedCategory = [];
        if (filter.categoryName) {
            selectedCategory.push(filter.categoryName)
        }
        console.log('selected cat', selectedCategory);


        res.render('./users/pages/shopping1', {
            products: findProducts,
            category: listedCategories,
            cartProductIds,
            user,
            userWishlist,
            currentPage: page,
            totalPages: Math.ceil(count / limit), // Calculating total pages
            selectedCategory
        });
    } catch (error) {
        throw new Error(error);
    }
});




// view Product Page--
const viewProduct = asyncHandler(async (req, res) => {
    try {
        const id = req.params.id
        const user = req.user
        console.log(user)
        const findProduct = await Product.findOne({ _id: id }).populate('categoryName').populate('images')

        const reviews = await Review.find({ product: id }).populate("user");


        let totalRating = 0;
        let avgRating = 0;

        if (reviews.length > 0) {
            for (const review of reviews) {
                totalRating += Math.ceil(parseFloat(review.rating));
            }
            const averageRating = totalRating / reviews.length;
            avgRating = averageRating.toFixed(2);

        } else {
            avgRating = 0;
        }
        if (!findProduct) {
            return res.status(404).render('./users/pages/404')
        }
        const products = await Product.find({ isListed: true }).populate('images').limit(3)
        let cartProductIds;
        let userWishlist;
        if (user) {
            if (user.cart || user.userWishlist) {
                cartProductIds = user.cart.map(cartItem => cartItem.product.toString());
                userWishlist = user.wishlist;
            }

        } else {
            cartProductIds = null;
            userWishlist = false;

        }
        res.render('./users/pages/singleproduct', { product: findProduct, products: products, cartProductIds, userWishlist, reviews, avgRating })
    } catch (error) {
        throw new Error(error)
    }
})




// contact page--
const contact = asyncHandler(async (req, res) => {
    try {
        res.render('./users/pages/contact')
    } catch (error) {
        throw new Error(error)
    }
})

// About Us----
const aboutUs = asyncHandler(async (req, res) => {
    try {
        res.render('./users/pages/about')
    } catch (error) {
        throw new Error(error)
    }
})





// wishlist--
const wishlist = asyncHandler(async (req, res) => {
    try {
        const user = req.user
        const userWishlist = await User.findById({ _id: user.id }).populate({
            path: 'wishlist',
            populate: {
                path: 'images',
            },
        });
        console.log('dsfs', userWishlist.wishlist);
        res.render('./users/pages/wishlist', { wishlist: userWishlist.wishlist })
    } catch (error) {
        throw new Error(error)
    }
})


// add to wishlist --
const addTowishlist = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.id
        // checking if the product already existing in the wishlist
        const user = await User.findById(userId);
        if (user.wishlist.includes(productId)) {
            console.log('product found');
            await User.findByIdAndUpdate(userId, { $pull: { wishlist: productId } })
            return res.json({ success: false, message: 'Product removed from wishlist' });
        }

        await User.findByIdAndUpdate(userId, { $push: { wishlist: productId } })
        res.json({ success: true, message: 'Product Added to wishlist' })
    } catch (error) {
        throw new Error(error)
    }
})

// Remove item from wishlist
const removeItemfromWishlist = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.id
        await User.findByIdAndUpdate(userId, { $pull: { wishlist: productId } })
        res.redirect('/wishlist')
    } catch (error) {
        throw new Error(error)
    }
})


const addReview = asyncHandler(async (req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.user._id;

        const existingReview = await Review.findOne({ user: userId, product: productId });

        if (existingReview) {
            existingReview.review = req.body.review;
            existingReview.rating = req.body.rating;
            await existingReview.save();
        } else {
            const newReview = await Review.create({
                user: userId,
                product: productId,
                review: req.body.review,
                rating: req.body.rating,
            });
        }
        res.redirect("back");
    } catch (error) {
        throw new Error(error);
    }
});
const walletTransactionspage = asyncHandler(async (req, res) => {
    try {
        const walletId = req.params.id;
        const walletTransactions = await WalletTransaction.find({ wallet: walletId }).sort({ timestamp: -1 });
        console.log({ walletTransactions });
        // const walletTransactions = await WalletTransaction.find({ wallet: walletId }).sort({ timestamp: -1 });
        res.render("users/pages/walletTransaction", {
            title: "Wallet Transactions",
            page: "Wallet-Transactions",
            walletTransactions,
        });
    } catch (error) {
        throw new Error(error);
    }
});


module.exports = {
    loadLandingPage,
    loadRegister,
    insertUser,
    sendOTPpage,
    verifyOTP,
    reSendOTP,
    verifyResendOTP,
    loadLogin,
    userLogout,
    userProfile,
    shopping,
    viewProduct,
    wishlist,
    contact,
    aboutUs,
    // categoryPage,
    //  search,
    removeItemfromWishlist,
    addTowishlist,
    addReview,
    walletTransactionspage


}

