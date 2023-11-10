const asyncHandler = require("express-async-handler");
const {
    getOrders,
    getSingleOrder,
    getReview,
    cancelOrderById,
    cancelSingleOrder,
    returnOrder,
  
} = require("../helpers/orderHelper");
const OrderItem = require("../models/orderItemModel");



/**
 * Orders Page Route
 * Method GET
 */
exports.orderspage = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        console.log(userId);

        const orders = await getOrders(userId);

        res.render("users/pages/orders", {
            title: "Orders",
            page: "orders",
            orders,
        });
    } catch (error) {
        throw new Error(error);
    }
});

/**
 * Checkout Page Route
 * Method GET
 */
exports.singleOrder = asyncHandler(async (req, res) => {
    try {
        const orderId = req.params.id;

        const { order, orders } = await getSingleOrder(orderId);
        const review = await getReview(req.user._id, order.product._id);
        res.render("users/pages/single-order", {
            title: order.product.title,
            page: order.product.title,
            order,
            review,
            orders,
        });
    } catch (error) {
        throw new Error(error);
    }
});

/**
 * Cancel Order Route
 * Method PUT
 */
exports.cancelOrder = asyncHandler(async (req, res) => {
    try {
        const orderId = req.params.id;

        const result = await cancelOrderById(orderId);

        if (result === "redirectBack") {
            res.redirect("back");
        } else {
            res.json(result);
        }
    } catch (error) {
        throw new Error(error);
    }
});

/**
 * Cancel Single Order Route
 * Method PUT
 */
exports.cancelSingleOrder = asyncHandler(async (req, res) => {
    try {
        const orderItemId = req.params.id;

        const result = await cancelSingleOrder(orderItemId, req.user._id);
        console.log( result)
        if (result === "redirectBack") {
            res.redirect("back");
        } else {
            res.json(result);
        }
    } catch (error) {
        throw new Error(error);
    }
});

/**
 * Return Order Requst
 * Method POST
 */
exports.returnOrder = asyncHandler(async (req, res) => {
    try {
        const returnOrderItemId = req.params.id;
        const result = await returnOrder(returnOrderItemId);

        if (result === "redirectBack") {
            res.redirect("back");
        } else {
            res.json(result);
        }
    } catch (error) {
        throw new Error(error);
    }
});

