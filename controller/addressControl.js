const Address = require('../models/addressModel')
const User = require('../models/userModel')
const asyncHandler = require('express-async-handler')


// saved Addresses--
const savedAddress = asyncHandler(async (req, res) => {
    try {
        const user = req.user
        const userWithAddresses = await User.findById(user).populate('addresses');
        const address = userWithAddresses.addresses
        res.render('./users/pages/savedAddress', { address })
    } catch (error) {
        throw new Error(error)
    }
})

// loading address page---
const addAddressPage = asyncHandler(async (req, res) => {
    try {
        res.render('./users/pages/addAddress')
    } catch (error) {
        throw new Error(error)
    }
})

// insert-Address
const insertAddress = asyncHandler(async (req, res) => {
    try {
        console.log('body', req.body);
        const user = req.user;
        const address = await Address.create(req.body); // Inserting Address
        user.addresses.push(address._id); //pushing the added address
        await user.save(); //save the user 
        console.log(address);
        res.redirect('/savedAddress')
    } catch (error) {
        throw new Error(error)
    }
})

// editAddressPage laoding
const editAddressPage = asyncHandler(async (req, res) => {
    try {
        const id = req.params.id
        const addData = await Address.findOne({ _id: id });
        console.log('data is ', addData);
        if (!addData) {
            return res.status(404).render('./users/pages/404')
        }
        res.render('./users/pages/editAddress', { addData })
    } catch (error) {
        throw new Error(error)
    }
})

// updateAddress Post
const updateAddress = asyncHandler(async (req, res) => {
    try {
        const id = req.params.id
        console.log('login body', req.body);
        const addData = await Address.findOneAndUpdate({ _id: id }, req.body);
        console.log('data is', addData);

        res.redirect('/savedAddress')


    } catch (error) {
        throw new Error(error)
    }
})
// DeleteAddress
const deleteAddress = asyncHandler(async (req, res) => {
    try {
        const id = req.params.id
        const deleteAddress = await Address.findOneAndDelete({ _id: id });
        res.redirect('/savedAddress')


    } catch (error) {
        throw new Error(error)
    }
})


module.exports = {
    addAddressPage,
    insertAddress,
    savedAddress,
    editAddressPage,
    updateAddress,
    deleteAddress
}