const Category = require("../model/Category");
const ErrorHandler = require("../utils/errorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const Apifeature = require("../utils/apifeature");
const { isAuthenticatedUser, authrizeRoles } = require("../middleware/auth");
const router = require("express").Router();

// Upload products to database
router.post(
  "/uploadProducts",

  catchAsyncErrors(async (req, res, next) => {
    const newProduct = new Category(req.body);
    if (!newProduct) {
      return next(new ErrorHandler("Product not founding", 404));
    }
    console.log(newProduct);
    const saveProduct = await newProduct.save();

    res.status(200).json({
      success: true,
      saveProduct,
    });
  })
);

// get single Product

router.get(
  "/singleProduct/:id",
  catchAsyncErrors(async (req, res, next) => {
    const product = await Category.findById(req.params.id);
    if (!product) {
      return next(new ErrorHandler("Product not founding", 404));
    }
    res.status(200).json({
      success: true,
      product,
    });
  })
);

// get all product

router.get(
  "/allProduct",
  catchAsyncErrors(async (req, res, next) => {
    // return next(new ErrorHandler("This is testing error", 404));
    const resultPerPage = 5;
    const productionCount = await Category.countDocuments();
    const apiFeature = new Apifeature(Category.find(), req.query)
      .search()
      .filter();

    let products = await apiFeature.query;

    let filteredProductsCount = products.length;

    apiFeature.pagination(resultPerPage);

    products = await apiFeature.query.clone();

    res.status(200).json({
      success: true,
      products,
      productionCount,
      resultPerPage,
      filteredProductsCount,
    });
  })
);

//Update product

router.put(
  "/updateProduct/:id",
  isAuthenticatedUser,
  catchAsyncErrors(async (req, res, next) => {
    let product = Category.findById(req.params.id);
    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }
    product = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });
    res.status(200).json({
      success: true,
      product,
    });
  })
);

// Delete Product

router.delete(
  "/deleteProduct/:id",
  isAuthenticatedUser,
  catchAsyncErrors(async (req, res, next) => {
    let product = await Category.findById(req.params.id);
    console.log(product);
    if (!product) {
      console.log("pawa");
      return next(new ErrorHandler("Product not found", 404));
    }
    const deleteProduct = await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      deleteProduct,
      message: "product delete successfully",
    });
  })
);

// Create new Review or update the review

router.post(
  "/reviews",
  isAuthenticatedUser,
  catchAsyncErrors(async (req, res, next) => {
    const { rating, comment, productId } = req.body;

    const review = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment,
    };

    const product = await Category.findById(productId);

    const isReviewed = product.reviews.find(
      (rev) => rev.user.toString() === req.user._id.toString()
    );

    if (isReviewed) {
      product.reviews.forEach((rev) => {
        if (rev.user.toString() === req.user._id.toString()) {
          (rev.rating = rating), (rev.comment = comment);
        }
      });
    } else {
      product.reviews.push(review);
      product.numOfReviews = product.reviews.length;
    }

    let avg = 0;

    product.reviews.forEach((rev) => {
      avg += rev.rating;
    });

    product.ratings = avg / product.reviews.length;

    await product.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
    });
  })
);

// Get all review of product

router.get(
  "/allReviews",
  catchAsyncErrors(async (req, res, next) => {
    const product = await Category.findById(req.query.id);

    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }

    res.status(200).json({
      success: true,
      reviews: product.reviews,
    });
  })
);

// Delete Review

router.delete(
  "/deleteReview",
  isAuthenticatedUser,
  authrizeRoles("admin"),
  catchAsyncErrors(async (req, res, next) => {
    const product = await Category.findById(req.query.productId);

    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }

    const reviews = product.reviews.filter((rev) => {
      console.log(rev._id.toString());
      return rev._id.toString() !== req.query.id.toString();
    });
    console.log(reviews);
    let avg = 0;
    reviews.forEach((rev) => {
      avg += rev.rating;
    });
    let ratings = 0;

    if (reviews.length === 0) {
      ratings = 0;
    } else {
      ratings = avg / reviews.length;
    }

    const numOfReviews = reviews.length;

    await Category.findByIdAndUpdate(
      req.query.productId,
      {
        reviews,
        ratings,
        numOfReviews,
      },
      {
        new: true,
        runValidators: true,
        useFindAndModify: false,
      }
    );

    res.status(200).json({
      success: true,
      message: "Review updated and deleted",
    });
  })
);

module.exports = router;
