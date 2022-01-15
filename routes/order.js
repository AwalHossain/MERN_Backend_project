const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = require("express").Router();
const { isAuthenticatedUser, authrizeRoles } = require("../middleware/auth");
const Order = require("../model/orderModel");
const Category = require("../model/Category");
// Create new Order

router.post(
  "/newOrder",
  isAuthenticatedUser,
  catchAsyncErrors(async (req, res, next) => {
    const {
      shippingInfo,
      orderItems,
      paymentInfo,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    } = req.body;

    const order = await Order.create({
      shippingInfo,
      orderItems,
      paymentInfo,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      paidAt: Date.now(),
      user: req.user._id,
    });

    res.status(201).json({
      success: true,
      order,
    });
  })
);

// get Single Order
router.get(
  "/order/:id",
  isAuthenticatedUser,
  authrizeRoles("admin"),
  catchAsyncErrors(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
      "user",
      "name email"
    );
    if (!order) {
      return next(new ErrorHandler("Order not found", 404));
    }

    res.status(200).json({
      success: true,
      order,
    });
  })
);

// get logges in user Orders

router.get(
  "/orders/me",
  isAuthenticatedUser,
  catchAsyncErrors(async (req, res, next) => {
    const order = await Order.find({ user: req.user._id });
    res.status(200).json({
      success: true,
      order,
    });
  })
);

//  get alll orders ---Admin

router.get(
  "/allOrders",
  isAuthenticatedUser,
  authrizeRoles("admin"),
  catchAsyncErrors(async (req, res, next) => {
    const orders = await Order.find();

    let totalAmount = 0;

    orders.forEach((order) => {
      totalAmount += order.totalPrice;
    });

    res.status(200).json({
      success: true,
      totalAmount,
      orders,
    });
  })
);

/// update order

router.put(
  "/updateOrder/:id",
  isAuthenticatedUser,
  authrizeRoles("admin"),
  catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorHandler("Order not found with this Id", 404));
    }

    if (order.orderStatus === "Delivered") {
      return next(
        new ErrorHandler("You have already delivered this order", 400)
      );
    }

    if (req.body.status === "Shipped") {
      order.orderItems.forEach(async (o) => {
        await updateStock(o.product, o.quantity);
      });
    }
    order.orderStatus = req.body.status;

    if (req.body.status === "Delivered") {
      order.deliveredAt = Date.now();
    }

    await order.save({ validateBeforeSave: false });
    res.status(200).json({
      success: true,
    });
  })
);

async function updateStock(id, quantity) {
  const product = await Category.findById(id);
  console.log("asdf");
  product.Stock -= quantity;

  await product.save({ validateBeforeSave: false });
}

// delete Order --Admin

router.delete(
  "/deletOrder/:id",
  isAuthenticatedUser,
  authrizeRoles("admin"),
  catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorHandler("Order not found with this Id", 404));
    }
    await order.remove();

    res.status(200).json({
      success: true,
    });
  })
);

module.exports = router;
