const stripe        = require("../config/stripe");
const prisma        = require("../config/prisma");
const stripeService = require("../services/stripeService");
const R             = require("../utils/apiResponse");
const logger        = require("../utils/logger");

exports.createCheckout = async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!["pro", "team"].includes(plan)) return R.badRequest(res, "Invalid plan");
    const session = await stripeService.createCheckoutSession(req.user, plan,
      `${process.env.FRONTEND_URL}/billing?success=true`,
      `${process.env.FRONTEND_URL}/billing?canceled=true`
    );
    return R.success(res, { url: session.url });
  } catch (err) { next(err); }
};

exports.createPortal = async (req, res, next) => {
  try {
    const session = await stripeService.createPortalSession(req.user, `${process.env.FRONTEND_URL}/settings`);
    return R.success(res, { url: session.url });
  } catch (err) { next(err); }
};

exports.getStatus = async (req, res) => R.success(res, {
  plan: req.user.plan, status: req.user.subscriptionStatus, endsAt: req.user.subscriptionEndsAt,
});

exports.webhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    logger.error("Stripe webhook error:", e.message);
    return res.status(400).json({ error: e.message });
  }
  try {
    await stripeService.handleWebhook(event);
    res.json({ received: true });
  } catch (e) {
    logger.error("Webhook handler error:", e.message);
    res.status(500).json({ error: "Handler failed" });
  }
};
