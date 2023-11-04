const User = require('../models/userModel')
const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const asyncHandler = require('express-async-handler')
const { sendOtp, generateOTP } = require('../utility/nodeMailer')
const crypto = require('crypto')
const bcrypt = require('bcrypt')

// loadLandingPage---
const loadLandingPage = asyncHandler(async (req, res) => {
    try {
        const products = await Product.find({ isListed: true }).populate('images').limit(5)
        console.log("home page")
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
            
            req.session.otpUser = { ...UserData, otp: OTP,expirationTime };
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
// const verifyOTP = asyncHandler(async (req, res) => {
//     try {

//         // const otp = generateOTP();
//         // req.session.otpUser = otp;
        
//         const enteredOTP = req.body.otp;
//         const email = req.session.otpUser.email
//         const storedOTP = req.session.otpUser.otp; // Getting the stored OTP from the session
//         console.log(storedOTP);
//         const user = req.session.otpUser;

//         if (enteredOTP == storedOTP) {
//             const newUser = await User.create(user);

//             delete req.session.otpUser.otp;
//             res.redirect('/login');
//         } else {
            
//            const messages = 'Verification failed, please check the OTP or resend it.';
//             console.log('verification failed');

//         }
//         res.render('./users/pages/verifyOTP', { messages,email})


//     } catch (error) {
//         throw new Error(error);
//     }
// });

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
        res.render('./users/pages/profile',{user})
    } catch (error) {
        console.log(error.message);
    }
}

//search
const search =asyncHandler( async (req, res) => {
    console.log(req.body.search);
    try {
        const data = req.body.search;
        const user = req.user;
        const page = req.query.p || 1;
        const limit = 3;
        const listedCategories = await Category.find({ isListed: true });
        // Get the IDs of the listed categories
        const listedCategoryIds = listedCategories.map(category => category._id);
        
        const searching = await Product.find({ title: { $regex: data, $options: 'i' } }).populate('images')
        .skip((page - 1) * limit)
        .limit(limit);
        console.log(user);
        const count = await Product.find(
            { categoryName: { $in: listedCategoryIds }, isListed: true })
            .countDocuments();
            let cartProductIds;
            if (user) {
                if (user.cart) {
                    cartProductIds = user.cart.map(cartItem => cartItem.product.toString());
                }
    
            } else {
                cartProductIds = null;
    
            }
            
        if (searching.length>0) {
            res.render('./users/pages/shopping1', { user, cartProductIds, catList: searching ,products:searching, category: listedCategories,currentPage: page,
            totalPages: Math.ceil(count / limit)
           })

        } else {
            res.render('./users/pages/shopping1', { user, cartProductIds, catList: searching ,products:searching, category: listedCategories,currentPage: page,
                totalPages: Math.ceil(count / limit)
               })
        }

    } catch (error) {
        console.log(error.message);
    }
})





// Shopping Page--
// Shopping Page--
// Shopping Page--
const shopping = asyncHandler(async (req, res) => {
    console.log('request from unauth user ');
    try {
        const user = req.user;
        const page = req.query.p || 1;
        const limit = 3;

        const listedCategories = await Category.find({ isListed: true });
        // Get the IDs of the listed categories
        const listedCategoryIds = listedCategories.map(category => category._id);

        // Find products that belong to the listed categories
        const findProducts = await Product.find(
            { categoryName: { $in: listedCategoryIds }, isListed: true }).populate('images')
            .skip((page - 1) * limit)
            .limit(limit)

        let cartProductIds;
        let userWishlist;
        if (user ) {
            if (user.cart || user.userWishlist) {
                cartProductIds = user.cart.map(cartItem => cartItem.product.toString());
                userWishlist = user.wishlist;
            }

        } else {
            cartProductIds = null;
            userWishlist = false;

        }

        const count = await Product.find(
            { categoryName: { $in: listedCategoryIds }, isListed: true })
            .countDocuments();
           

        res.render('./users/pages/shopping1', {
            products: findProducts,
            category: listedCategories,
            cartProductIds,
            user,
            userWishlist,
            currentPage: page,
            totalPages: Math.ceil(count / limit) // Calculating total pages
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
        res.render('./users/pages/singleproduct', { product: findProduct, products: products,  userWishlist,})
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


// const categoryPage = async (req,res) =>{

//     try{
//         const  categoryId = req.query.id
//         const category = await Category.find({ })
//         // const page = parseInt(req.query.page) || 1; 
//         const limit = 6;
//         // const skip = (page - 1) * limit;
//         const totalProducts = await Product.countDocuments({ category:categoryId,  isListed: true }); // Get the total number of products
//         const totalPages = Math.ceil(totalProducts / limit);

//         const categories = await Category.find({ })
         
//         const products = await Product.find({ category:categoryId,  isListed: true })
//         // .skip(skip)
//         // .limit(limit)
//         .populate('category')
//         // console.log("products",products);
//         // console.log("categories",categories);
//         res.render('./users/pages/categoryShop',{products,category })
//     }
//     catch(err){
//         console.log('category page error',err);
//     }
// }




// const categoryPage = async (req, res) => {
//     try {
//         let user = req.session.user
//         const id = req.query.id
//         const prdtdetails = await Product.find({ _id: id }).populate('Product').exec()
//         const category = prdtdetails.Category
//         res.render('./users/pages/categoryShop', { products :prdtdetails,category: category, user })
//     } catch (error) {
//         res.status(500).json({ error: 'products details not found!!!' });
//     }
// }


// const categoryPage = async (req, res) => {
//     try {
//         let user = req.session.user;
//         console.log(user)
//         const id = req.query.id;
//         console.log(id)
//         // Find the product by _id and populate the categoryName field
//         // const prdtdetails = await Product.findOne({ _id: id });
//         const categoryId=req.query.id;
//         const prdtdetails = await Product.find({ categoryName: categoryId })
//         .exec((err, products) => {
//           if (err) {
//             // Handle the error
//             return res.status(500).json({ error: 'An error occurred while fetching products' });
//           }
      
//           // Handle the products
//           res.json(products);
//         });
//         console.log(prdtdetails)

//         // The 'categoryName' field should now be populated with the actual category document
//         // const category = prdtdetails.categoryName;

//         res.render('./users/pages/categoryShop', { products: prdtdetails, user });
//     } catch (error) {
//         res.status(500).json({ error: 'products details not found!!!' });
//     }
// };



// const categoryPage = async (req, res) => {
//     try { 
//         let user = req.session.user;
//         const category = await Category.find({ })
//         const categoryId = req.query.id;

//         // Find all products with the specified category
//         const prdtdetails = await Product.find({ categoryName: categoryId }).exec();

//         // The 'categoryName' field should now be populated with the actual category document

//         res.render('./users/pages/categoryShop', { products: prdtdetails,category, user });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'An error occurred while fetching products' });
//     }
// };


const categoryPage = async (req, res) => {
    try { 
        let user = req.user;
        const category = await Category.find({});
        const categoryId = req.query.id;//get the category from the body
        const page = req.query.p || 1; // Get the current page from the query parameters
        const limit = 3;
        let Wishlist;
        
        if (user ) {
            // console.log(user.Wishlist)
            if ( user.wishlist) {
                Wishlist = user.wishlist;
            }

        } else {
            Wishlist = false;

        }
        async function getCategoryNameById(categoryId) {
            try {
                const category = await Category.findById(categoryId);
                if (category) {
                    // console.log(category.categoryName)
                    return category.categoryName;
                }
                return null; // Return null if the category is not found
            } catch (error) {
                console.error('Error while fetching category:', error);
                return null;
            }
        }
      
      
        const categoryName = await getCategoryNameById(categoryId);
       
        const listedCategories = await Category.find({ isListed: true });
        // Get the IDs of the listed categories
        const listedCategoryIds = listedCategories.map(category => category._id);

        // Find all products with the specified category
        const prdtdetails = await Product.find({ categoryName: categoryId ,isListed: true}).populate('images')
            .skip((page - 1) * limit)
            .limit(limit)
            .exec();

        // The 'categoryName' field should now be populated with the actual category document
        const count = await Product.find({ categoryName: categoryId,isListed: true }).countDocuments();
// console.log(categoryName)
        // Calculate the total number of pages
        const totalPages = Math.ceil(count / limit);

        console.log(categoryName)

        res.render('./users/pages/categoryShop', {
            products: prdtdetails,
            category: listedCategories,
            user,
            categoryname:categoryName,
            currentPage: page,
            category_id: categoryId,
            totalPages: totalPages,
            Wishlist  // Pass currentPage and totalPages for pagination
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while fetching products' });
    }
};


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
    categoryPage,
    search,
    removeItemfromWishlist,
    addTowishlist,


}

